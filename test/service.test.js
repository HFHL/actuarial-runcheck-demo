import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatch } from '../mock/service.js';

function scenario() {
  let {state} = dispatch('init');
  return (action,params={}) => {
    const result = dispatch(action,{state,id:'oct',...params});
    if (result.state) state=result.state;
    return result;
  };
}

test('reserve discrepancy reconciles across checks, source cells and AI, including the original attempt after correction', () => {
  const api = scenario();
  const evidence = (attempt) => api('evidence',{key:'reserve',attempt}).evidence;
  const failed = evidence('O-001');
  assert.deepEqual([failed.reserve.totals.opening,failed.reserve.totals.net,failed.result.expected,failed.result.observed,failed.result.tolerance,failed.result.difference],[1000,50,1050,1062,1,12]);
  assert.deepEqual(failed.breakdown.map(row => row.difference),[9,3]);
  const [calc,closing] = failed.breakdown[0].links;
  assert.equal(calc.range,'D3');
  assert.equal(api('workbook',calc).workbook.rows[0][3],68);
  assert.equal(api('workbook',closing).workbook.rows[0][1],68.9);
  api('investigate',{key:'reserve',attempt:'O-001',prompt:'Break down by product'});
  assert.deepEqual(evidence('O-001').investigation[0].rows,failed.breakdown);
  assert.equal(evidence('O-001').investigation[0].cause,'Cause unconfirmed');
  api('select',{slot:'reserve',file:'reserve-corrected'});
  assert.equal(api('detail').detail.outputStatus,'Not run');
  api('check',{kind:'output'});
  assert.equal(evidence().result.status,'Passed');
  assert.equal(evidence().result.observed,1050);
  assert.equal(evidence('O-001').result.observed,1062);
  assert.equal(evidence('O-001').investigation[0].rows[1].difference,3);
  assert.ok(evidence('O-001').activity.some(entry => entry.text === 'Output checks · Passed · O-002'));
});

test('a missing renewal output prevents submission even when reserves and inputs pass', () => {
  const api = scenario();
  api('select',{slot:'assumptions',file:'assumptions-v8'});
  api('check',{kind:'input'});
  api('select',{slot:'reserve',file:'reserve-corrected'});
  api('select',{slot:'renewal',file:null});
  api('check',{kind:'output'});
  const { detail } = api('detail');
  assert.equal(detail.inputStatus,'Passed');
  assert.deepEqual(detail.exceptions.map(r => [r.key,r.status,r.issue]),[['renewal','Not run','Renewal output missing']]);
  assert.throws(() => api('submit'),/must pass/);
});

test('review decisions apply only to the assigned current snapshot and preserve prior versions', () => {
  const api = scenario();
  api('select',{slot:'assumptions',file:'assumptions-v8'});
  api('check',{kind:'input'});
  api('select',{slot:'reserve',file:'reserve-corrected'});
  api('check',{kind:'output'});
  const { version } = api('submit');
  assert.equal(version,'v1');
  assert.throws(() => api('select',{slot:'reserve',file:'reserve-original'}),/read-only/);
  assert.throws(() => api('decision',{version,decision:'Signed off'}),/not awaiting/);
  assert.throws(() => api('decision',{role:'Reviewer',version,decision:'Changes requested',note:' '}),/Enter a note/);
  api('decision',{role:'Reviewer',version,decision:'Changes requested',note:'Recheck the reserves.'});
  api('select',{slot:'reserve',file:'reserve-original'});
  api('check',{kind:'output'});
  assert.equal(api('detail').detail.outputStatus,'Failed');
  assert.equal(api('detail',{version}).detail.outputStatus,'Passed');
  assert.equal(api('list').runs.find(run => run.id === 'oct').outputStatus,'Failed');
  const reviewRow = api('list',{reviewList:true}).runs.find(run => run.id === 'oct');
  assert.equal(reviewRow.outputStatus,'Passed');
  assert.equal(reviewRow.exceptions,0);
  api('select',{slot:'reserve',file:'reserve-corrected'});
  api('check',{kind:'output'});
  assert.equal(api('submit').version,'v2');
  assert.throws(() => api('decision',{role:'Reviewer',version,decision:'Signed off'}),/not awaiting/);
  api('decision',{role:'Reviewer',version:'v2',decision:'Signed off'});
  assert.equal(api('detail',{version}).detail.status,'Changes requested');
  assert.equal(api('detail',{version:'v2'}).detail.status,'Signed off');
});

test('a new batch inherits period fixtures and starts a separate, reviewable draft', () => {
  const api = scenario();
  const data = { template:'sep', name:'September recheck', batch:'15' };
  assert.throws(() => api('create',{...data,role:'Reviewer'}),/Only the preparer/);
  assert.throws(() => api('create',{...data,batch:'0014'}),/Batch 014 already exists/);
  const {id} = api('create',data);
  const get = (action,params) => api(action,{id,...params});
  assert.throws(() => api('create',{...data,batch:'015'}),/Batch 015 already exists/);
  const {detail} = get('detail');
  assert.equal(detail.run.name,'September recheck');
  assert.equal(detail.run.periodKey,'sep');
  assert.equal(detail.run.batch,'015');
  assert.equal(detail.status,'Draft');
  assert.equal(detail.inputStatus,'Not run');
  assert.equal(detail.outputStatus,'Not run');
  assert.deepEqual(detail.attempts,[]);
  assert.equal(api('detail',{id:'sep'}).detail.status,'Signed off');
  get('check',{kind:'input'});
  get('check',{kind:'output'});
  const {version} = get('submit');
  get('decision',{role:'Reviewer',version,decision:'Signed off'});
  assert.equal(get('detail',{version}).detail.status,'Signed off');
});
