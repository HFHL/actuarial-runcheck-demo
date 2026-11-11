import { catalog, runs, checks, slots, people } from './fixtures.js';

const copy = structuredClone;
const now = () => new Date().toISOString();
const total = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0);

export function variance(run, files) {
  const control = catalog[files.rollforward].rows;
  const output = catalog[files.reserve].rows;
  const baseline = catalog[run.baselineFile]?.rows;
  const rows = control.map((p, i) => {
    const prior = baseline ? baseline[i].prior + baseline[i].movement + baseline[i].difference : p.prior;
    const current = output[i].prior + output[i].movement + output[i].difference;
    const expected = p.prior + p.movement;
    return { name:p.name, row:i+3, prior, current, movement:current-prior, expected, difference:current-expected, opening:p.prior, net:p.movement };
  });
  const totals = Object.fromEntries(['prior','current','movement','expected','difference','opening','net'].map(key => [key, total(rows, key)]));
  return { rows:rows.map(row => ({...row,sources:varianceSources(run,files,row.row)})), totals:{ name:'Total life reserves', row:5, ...totals, sources:varianceSources(run,files,5) } };
}

function execute(run, files, kind, id, at = now()) {
  const result = (key, status, expected, observed, extra = {}) => ({ key, status, expected, observed, expectedDate:run.date, ...extra });
  let results;
  if (kind === 'input') {
    const a = catalog[files.assumptions], p = catalog[files.policies];
    results = [
      result('assumptions', a.version === run.expectedVersion && a.date === run.date ? 'Passed' : 'Failed', run.expectedVersion, a.version, { date:a.date }),
      result('policies', p.count === run.count && p.date === run.date ? 'Passed' : 'Failed', run.count, p.count, { date:p.date })
    ];
  } else {
    const { totals } = variance(run, files);
    const renewal = catalog[files.renewal];
    results = [
      result('reserve', Math.abs(totals.difference) <= 1 ? 'Passed' : 'Failed', totals.expected, totals.current, { tolerance:1, difference:totals.difference, date:run.date }),
      result('renewal', !renewal ? 'Not run' : renewal.count === run.count && renewal.date === run.date ? 'Passed' : 'Failed', run.count, renewal?.count ?? null, { date:renewal?.date, issue:!renewal ? 'Renewal output missing' : undefined })
    ];
  }
  return { id, kind, at, files:copy(files), results, investigations:{} };
}

function initialRun(run, at) {
  return { files:copy(run.files), attempts:[execute(run,run.files,'input','I-001',at),execute(run,run.files,'output','O-001',at)], reviews:[], activity:[
    { at, text:'Input checks completed', by:people.Preparer, attempt:'I-001' },
    { at, text:'Output checks completed', by:people.Preparer, attempt:'O-001' }
  ], owners:{} };
}

const snapshot = (item) => copy({ files:item.files, attempts:item.attempts, activity:item.activity, owners:item.owners });
const initial = { oct:initialRun(runs.oct,'2026-11-02T13:06:00Z'), sep:initialRun(runs.sep,'2026-10-01T13:06:00Z') };
initial.sep.reviews.push({ id:'v1', at:'2026-10-01T13:40:00Z', preparer:people.Preparer, reviewer:people.Reviewer, snapshot:snapshot(initial.sep), decision:{ status:'Signed off', by:people.Reviewer, at:'2026-10-01T15:18:00Z', note:'Checked the September reconciliation.' } });

const latest = (item, kind) => item.attempts.findLast(a => a.kind === kind);
const reviewStatus = item => item.reviews.at(-1)?.decision?.status ?? (item.reviews.length ? 'In review' : 'Draft');
const kinds = { assumptions:'input', policies:'input', reserve:'output', renewal:'output' };
const relevant = { input:['assumptions','policies','rollforward'], output:['reserve','renewal','rollforward','policies'] };

function checkStatus(item, kind) {
  const attempt = latest(item, kind);
  if (!attempt || relevant[kind].some(key => attempt.files[key] !== item.files[key])) return 'Not run';
  if (attempt.results.some(r => r.status === 'Failed')) return 'Failed';
  if (attempt.results.some(r => r.status === 'Not run')) return 'Not run';
  return 'Passed';
}

function exceptions(item) {
  return ['output','input'].flatMap(kind => {
    const attempt = latest(item,kind);
    return (attempt?.results ?? []).filter(r => r.status !== 'Passed').map(r => ({ ...r, attempt:attempt.id, owner:item.owners[r.key] ?? people.Preparer }));
  });
}

function view(run, item, version) {
  const selected = version ? item.reviews.find(r => r.id === version) : null;
  if (version && !selected) fail('Review version not found',404);
  const content = selected?.snapshot ?? item;
  return {
    run, files:content.files, attempts:content.attempts, activity:content.activity,
    owners:content.owners, variance:variance(run,content.files), exceptions:exceptions(content),
    inputStatus:checkStatus(content,'input'), outputStatus:checkStatus(content,'output'),
    status: selected ? selected.decision?.status ?? 'In review' : reviewStatus(item),
    reviews:item.reviews.map(({snapshot:_, ...r}) => r), version:selected?.id ?? null
  };
}

function source(file, range, label) { return { file, range, label }; }
function a1(file, row, col, label) { return source(file, `${col}${row}`,label); }
export function varianceSources(run, files, row) {
  return {
    prior:[a1(run.baselineFile ?? files.rollforward,row,'B','Prior reserve')],
    current:[a1(files.reserve,row,'B','AXIS closing reserve')],
    movement:[a1(run.baselineFile ?? files.rollforward,row,'B','Prior reserve'),a1(files.reserve,row,'B','AXIS closing reserve')],
    difference:[a1(files.rollforward,row,'D','Expected closing reserve'),a1(files.reserve,row,'B','AXIS closing reserve')]
  };
}

function evidence(run, item, key, attemptId) {
  const attempt = attemptId ? item.attempts.find(a => a.id === attemptId) : latest(item,kinds[key]);
  const result = attempt?.results.find(r => r.key === key);
  if (!result) fail('Check attempt not found',404);
  const f = attempt.files;
  const reserve = key === 'reserve' ? variance(run,f) : null;
  const links = key === 'reserve'
    ? [source(f.rollforward,'B5:D5','Reserve roll-forward'),a1(f.reserve,5,'B','AXIS closing reserve')]
    : f[key] ? [source(f[key],key === 'assumptions' ? 'B3:B4' : 'B4:B5',slots[key])] : [];
  const relatedAttempts = new Set(item.attempts.filter(a => a.kind === attempt.kind).map(a => a.id));
  return { result, title:checks[key], attempt:attempt.id, at:attempt.at, links, reserve,
    breakdown:reserve?.rows.map(row => ({ ...row, links:varianceSources(run,f,row.row).difference })),
    owner:item.owners[key] ?? people.Preparer, investigation:attempt.investigations[key] ?? null,
    activity:item.activity.filter(a => a.review || (!a.key && relatedAttempts.has(a.attempt)) || (a.key === key && (a.assignment || a.attempt === attempt.id)))
  };
}

function workbook(file, range) {
  const entry = catalog[file];
  if (!entry) fail('Source file not found',404);
  let columns, rows;
  if (entry.sheet === 'Roll-forward') {
    columns = ['Business segment','Opening reserve (CAD M)','Net movements (CAD M)','Expected closing (CAD M)'];
    rows = [...entry.rows, { name:'Total life reserves', prior:total(entry.rows,'prior'), movement:total(entry.rows,'movement') }].map(p => [p.name,p.prior/10,p.movement/10,(p.prior+p.movement)/10]);
  } else if (entry.sheet === 'Closing reserves') {
    columns = ['Business segment','Closing reserve (CAD M)'];
    const values = entry.rows.map(p => [p.name,(p.prior+p.movement+p.difference)/10]);
    rows = [...values,['Total life reserves',Number(values.reduce((s,r) => s+r[1],0).toFixed(1))]];
  } else {
    columns = ['Field','Value'];
    rows = [['Version',entry.version ?? '—'],['Valuation date',entry.date],['Policy count',entry.count ?? '—']];
  }
  return { name:entry.name, sheet:entry.sheet, range, columns, rows };
}

function fail(message, status = 400) { throw Object.assign(new Error(message),{status}); }

function runMetadata(id, item) {
  const periodKey = item.template ?? id;
  return { ...runs[periodKey], periodKey, name:'Life reserve valuation', ...item.metadata, id };
}

export function dispatch(action, { state, id, role = 'Preparer', version, ...data } = {}) {
  if (action === 'init') return { state:copy(initial) };
  if (action === 'workbook') return { workbook:workbook(data.file,data.range) };
  const current = state ?? initial;
  if (action === 'create') {
    if (role !== 'Preparer') fail('Only the preparer can create a valuation run',403);
    const { template } = data;
    if (!['oct','sep'].includes(template)) fail('Select a valuation period');
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name || name.length > 80) fail('Enter a valuation name up to 80 characters');
    const rawBatch = typeof data.batch === 'string' ? data.batch.trim() : '';
    if (!/^\d{1,8}$/.test(rawBatch) || Number(rawBatch) === 0) fail('Enter a positive batch number of up to 8 digits');
    const batch = String(Number(rawBatch)).padStart(3,'0');
    if (Object.entries(current).some(([id,item]) => runMetadata(id,item).batch === batch)) fail(`Batch ${batch} already exists`,409);
    const id = `batch-${batch}`;
    const item = { template, metadata:{ name,batch }, files:copy(runs[template].files), attempts:[], reviews:[], activity:[], owners:{} };
    return { state:{...current,[id]:item}, id };
  }
  if (action === 'list') return { runs:Object.entries(current).map(([id,item]) => {
    const r = runMetadata(id,item);
    const review = item.reviews.at(-1);
    const content = data.reviewList && review ? review.snapshot : item;
    return { ...r, inputStatus:checkStatus(content,'input'), outputStatus:checkStatus(content,'output'), status:reviewStatus(item), exceptions:exceptions(content).length, latestVersion:review?.id, reviewer:review?.reviewer, owner:people.Preparer };
  }) };
  if (!Object.hasOwn(current,id)) fail('Valuation run not found',404);
  const item = current[id], run = runMetadata(id,item);
  if (action === 'detail') return { detail:view(run,item,version), catalog };
  if (action === 'evidence') {
    const selected = version ? item.reviews.find(r => r.id === version) : null;
    if (version && !selected) fail('Review version not found',404);
    const result = evidence(run,selected?.snapshot ?? item,data.key,data.attempt);
    if (selected?.decision) result.activity.push({ at:selected.decision.at, by:selected.decision.by, text:`${selected.id} · ${selected.decision.status}`, note:selected.decision.note });
    return { evidence:result };
  }

  const next = copy(current), draft = next[id], at = now();
  const status = reviewStatus(draft);
  const by = people[role];
  const editable = !version && role === 'Preparer' && (status === 'Draft' || status === 'Changes requested');
  const log = (entry) => draft.activity.push({ at, by, ...entry });
  if (action === 'decision') {
    const target = draft.reviews.at(-1);
    if (role !== 'Reviewer' || status !== 'In review' || target?.id !== version || target?.reviewer !== by) fail('This version is not awaiting your review',409);
    if (!['Signed off','Changes requested'].includes(data.decision)) fail('Select a review decision');
    if (data.decision === 'Changes requested' && !data.note?.trim()) fail('Enter a note to request changes');
    target.decision = { status:data.decision, by, at, note:data.note?.trim() ?? '' };
    log({ text:`${target.id} · ${data.decision}`, note:target.decision.note, review:true });
    return { state:next };
  }
  if (!editable) fail('This run is read-only',409);
  switch(action) {
    case 'select':
      if (!run.choices[data.slot]?.includes(data.file)) fail('File is unavailable');
      draft.files[data.slot] = data.file;
      log({ text:data.file ? `Associated ${catalog[data.file].name}` : 'Removed renewal output' });
      break;
    case 'check': {
      const { kind } = data;
      if (!['input','output'].includes(kind)) fail('Unknown check type');
      const attempt = execute(run,draft.files,kind,`${kind[0].toUpperCase()}-${String(draft.attempts.filter(a => a.kind === kind).length+1).padStart(3,'0')}`,at);
      draft.attempts.push(attempt);
      log({ text:`${kind === 'input' ? 'Input' : 'Output'} checks · ${checkStatus(draft,kind)} · ${attempt.id}`, attempt:attempt.id });
      break;
    }
    case 'assign':
    case 'note':
    case 'investigate': {
      const { key, attempt:attemptId } = data;
      const ev = evidence(run,draft,key,attemptId);
      const attempt = draft.attempts.find(a => a.id === ev.attempt);
      if (action === 'assign') {
        if (!Object.values(people).includes(data.owner)) fail('Select an owner');
        draft.owners[key] = data.owner;
        log({ key, attempt:attempt.id, assignment:true, text:`Assigned to ${data.owner}` });
      } else if (action === 'note') {
        if (!data.note?.trim()) fail('Enter a note');
        log({ key, attempt:attempt.id, text:'Note added', note:data.note.trim() });
      } else {
        const prompt = data.prompt?.trim() ?? '';
        const answer = key === 'reserve'
          ? { text:'The reserve breakdown compares the AXIS closing reserve with the roll-forward by product.', cause:ev.result.difference ? 'Cause unconfirmed' : null, rows:ev.breakdown }
          : { text:`${ev.title}: expected ${ev.result.expected}; observed ${ev.result.observed ?? 'missing'}.`, cause:ev.result.status === 'Passed' ? null : 'Cause unconfirmed', rows:[] };
        (attempt.investigations[key] ??= []).push({ ...answer, prompt, at });
        log({ key, attempt:attempt.id, text:'AI investigation recorded' });
      }
      break;
    }
    case 'submit': {
      if (['input','output'].some(kind => checkStatus(draft,kind) !== 'Passed')) fail('Input and output checks must pass before submission',409);
      const id = `v${draft.reviews.length+1}`;
      log({ text:`${id} submitted for review`, review:true });
      draft.reviews.push({ id, at, preparer:by, reviewer:people.Reviewer, snapshot:snapshot(draft), decision:null });
      return { state:next, version:id };
    }
    default: fail('Unknown mock action',404);
  }
  return { state:next };
}
