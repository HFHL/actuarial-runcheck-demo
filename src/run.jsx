import React, { useState } from 'react';
import { ArrowRightIcon, CaretDownIcon, CaretRightIcon, CheckCircleIcon, ClockCounterClockwiseIcon, FileXlsIcon, WarningCircleIcon, ClipboardTextIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Activity, Button, Modal, SourceLink, Status, Table, count, day, money, num, signed, stamp } from './ui';

const names = {reserve:'Reserve roll-forward',assumptions:'Assumptions version',policies:'In-force control totals',renewal:'Renewal record count'};
const slots = {assumptions:'Assumptions',policies:'In-force policies',rollforward:'Reserve roll-forward',reserve:'Closing reserves',renewal:'Renewal output'};
const amount = (key,v) => key === 'reserve' ? money(v) : count(v);

export function Overview({detail, select, selection, goTab}) {
  return <>
    <div className="section-heading"><h2>Run status</h2><Status>Batch completed</Status></div>
    <div className="summary-grid">
      {[['Input checks',detail.inputStatus,'Inputs',CheckCircleIcon],['Output checks',detail.outputStatus,'Outputs',CheckCircleIcon],['Review',detail.status,'Review',ClipboardTextIcon]].map(([label,status,tab,Icon]) => <button key={tab} className="summary" onClick={() => goTab(tab)}><Icon size={19}/><span><strong>{label}</strong><Status>{status}</Status></span><ArrowRightIcon className="summary-arrow" size={16}/></button>)}
    </div>
    <div className="section-heading separated"><h2>Open exceptions <span className="counter">{detail.exceptions.length}</span></h2></div>
    <Table columns={['Check','Result','Status','Owner','']} className="exceptions">
      {detail.exceptions.map(r => <tr key={r.key} className={selection?.key === r.key ? 'selected' : ''} onClick={() => select(r.key,r.attempt,names[r.key])}><td><button className="row-link" onClick={e => {e.stopPropagation();select(r.key,r.attempt,names[r.key]);}}><WarningCircleIcon size={17}/>{names[r.key]}</button></td><td>{r.key === 'reserve' ? `CAD ${signed(r.difference)}M` : r.key === 'assumptions' ? `${r.observed} → ${r.expected}` : r.issue ?? count(r.observed)}</td><td><Status>{r.status}</Status></td><td>{r.owner}</td><td><CaretRightIcon size={14}/></td></tr>)}
      {!detail.exceptions.length && <tr><td colSpan="5" className="empty">No open exceptions</td></tr>}
    </Table>
  </>;
}

export function Checks({kind,detail,catalog,editable,busy,mutate,select,openSource,selection,clearSelection}) {
  const [picker,setPicker] = useState(null), [chosen,setChosen] = useState('');
  const [history,setHistory] = useState(false), [attemptId,setAttemptId] = useState(null);
  const input = kind === 'input';
  const list = detail.attempts.filter(a => a.kind === kind).slice().reverse();
  const attempt = list.find(a => a.id === attemptId) ?? list[0];
  const batch = detail.run;
  const label = input ? 'input' : 'output';
  return <>
    {!input && <>
      <div className="section-heading"><h2>AXIS Batch {batch.batch}</h2><Status>Batch completed</Status></div>
      <Table columns={['Time (ET)','Level','Log entry']} className="logs">
        {[[batch.started,'Dataset LIFE_CA loaded'],[batch.started,'Valuation started'],[batch.ended,'Output export completed'],[batch.ended,'Batch completed']].map(([time,entry]) => <tr key={entry}><td className="mono">{time}</td><td>Info</td><td>{entry}</td></tr>)}
      </Table>
    </>}
    <div className={'section-heading'+(!input ? ' separated':'')}><h2>{input ? 'Input files' : 'Output files'}</h2></div>
    <Table columns={['File','Associated source','Version / as of','']}>
      {(input ? ['assumptions','policies','rollforward'] : ['reserve','renewal']).map(slot => {
        const file = detail.files[slot], info = catalog[file];
        return <tr key={slot}><td className="strong">{slots[slot]}</td><td>{info ? <button className="text file-link" onClick={() => openSource({file,range:info.rows ? (slot === 'rollforward' ? 'B5:D5':'B5') : 'B3:B5'})}><FileXlsIcon size={17}/>{info.name}<ArrowSquareOutIcon size={13}/></button> : <span className="negative">Renewal output missing</span>}</td><td>{info?.version ? `${info.version} · ${day(info.date)}` : day(info?.date ?? (info ? batch.date : null))}</td><td className="action-cell">{editable && batch.choices[slot] && <Button disabled={!!busy} onClick={() => {setPicker(slot);setChosen(file ?? '');}}>{slot === 'assumptions' ? 'Select replacement':'Associate output'}</Button>}</td></tr>;
      })}
    </Table>
    <div className="section-heading separated"><div><h2>{input ? 'Input check results' : 'Post-run checks'}</h2>{attempt && <div className="meta-line">{attempt.id} · {stamp(attempt.at)}{attempt.id !== list[0].id && ' · Previous attempt'}</div>}</div>
      <div className="inline">{attempt && <Button aria-expanded={history} onClick={() => setHistory(!history)}><ClockCounterClockwiseIcon size={16}/> Attempt history</Button>}{editable && <Button primary disabled={!!busy} busy={busy === 'check'} onClick={async () => {if(await mutate('check',{kind})) {setAttemptId(null);clearSelection();}}}>{busy === 'check' ? 'Running checks…' : `Run ${label} checks`}</Button>}</div>
    </div>
    {history && attempt && <div className="history"><label htmlFor="attempt">Check attempt</label><select id="attempt" value={attempt.id} onChange={e => {setAttemptId(e.target.value);clearSelection();}}>{list.map(a => <option key={a.id} value={a.id}>{a.id} · {a.results.map(r => r.status).join(' / ')} · {stamp(a.at)}</option>)}</select></div>}
    {attempt && (input ? detail.inputStatus : detail.outputStatus) === 'Not run' && attempt.id === list[0].id && <p className="check-message" role="status"><Status>Not run</Status> {!input && !detail.files.renewal ? 'Renewal output missing' : 'Files changed since the last check'}</p>}
    <Table columns={['Check','Expected','Observed','Expected date','Observed date','Status','']}>
      {!attempt && <tr><td colSpan="7" className="empty">No check attempts</td></tr>}
      {attempt?.results.map(r => <tr key={r.key} className={selection?.key === r.key && selection.attempt === attempt.id ? 'selected':''} onClick={() => select(r.key,attempt.id,names[r.key])}><td><button className="row-link" onClick={e => {e.stopPropagation();select(r.key,attempt.id,names[r.key]);}}>{names[r.key]}{r.key === 'reserve' && <small>CAD M</small>}</button></td><td className="value">{amount(r.key,r.expected)}</td><td className="value">{r.issue || amount(r.key,r.observed)}</td><td>{day(r.expectedDate ?? batch.date)}</td><td>{day(r.date ?? (r.key === 'reserve' ? batch.date : null))}</td><td><Status>{r.status}</Status></td><td><CaretRightIcon size={14}/></td></tr>)}
    </Table>
    {picker && <Modal title={picker === 'assumptions' ? 'Select replacement' : `Associate ${slots[picker].toLowerCase()}`} onClose={() => setPicker(null)}>
      <form onSubmit={async e => {e.preventDefault();if(await mutate('select',{slot:picker,file:chosen || null})) setPicker(null);}}>
        <div className="dialog-body stack"><label htmlFor="fixture">Available files</label><select id="fixture" value={chosen} onChange={e => setChosen(e.target.value)}>{batch.choices[picker].map(file => <option key={file ?? 'missing'} value={file ?? ''}>{catalog[file]?.name ?? 'No file associated'}</option>)}</select></div>
        <div className="dialog-actions"><Button type="button" onClick={() => setPicker(null)}>Cancel</Button><Button primary disabled={!!busy || (chosen || null) === detail.files[picker]}>Associate file</Button></div>
      </form>
    </Modal>}
  </>;
}

export function Variance({detail,openSource}) {
  const [expanded,setExpanded] = useState(false), [calculation,setCalculation] = useState(null);
  const { totals,rows } = detail.variance;
  const open = (row,key) => {
    const sources = row.sources[key];
    if (sources.length === 1) openSource(sources[0]);
    else setCalculation({row,key,sources});
  };
  return <>
    <div className="section-heading"><h2>Reserve variance</h2><span className="muted">Baseline · {detail.run.baseline}</span></div>
    <Table columns={['Business segment',num('Prior (CAD M)'),num('Current (CAD M)'),num('Movement (CAD M)'),num('Unexplained (CAD M)')]} className="variance">
      {[totals,...(expanded ? rows : [])].map((row,i) => <tr key={row.name} className={i ? 'product':'total'}><td>{i ? row.name : <button className="row-link" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <CaretDownIcon size={15}/> : <CaretRightIcon size={15}/>} {row.name}</button>}</td>
        {['prior','current','movement','difference'].map(key => <td className="num" key={key}><button className={'text '+(key === 'difference' && row[key] ? 'negative':'')} aria-label={`${row.name}: ${key === 'difference' ? 'unexplained difference' : key} ${signed(row[key])} CAD million`} onClick={() => open(row,key)}>{['movement','difference'].includes(key) ? signed(row[key]) : money(row[key])}</button></td>)}</tr>)}
    </Table>
    {calculation && <Modal title={calculation.key === 'movement' ? 'Reserve movement' : 'Unexplained difference'} onClose={() => setCalculation(null)}>
      <div className="dialog-body"><p className="muted">{calculation.row.name} · CAD M</p><div className="equation">{money(calculation.row.current)} − {money(calculation.key === 'movement' ? calculation.row.prior : calculation.row.expected)} = {signed(calculation.row[calculation.key])}</div>{calculation.sources.map(link => <SourceLink key={link.file} link={link} onOpen={l => {setCalculation(null);openSource(l);}}/>)}</div>
    </Modal>}
  </>;
}

export function Review({detail,role,goVersion,mutate,busy}) {
  const [note,setNote] = useState('');
  const selected = detail.reviews.find(r => r.id === detail.version);
  const latest = detail.reviews.at(-1);
  const canDecide = role === 'Reviewer' && selected && selected.id === latest?.id && detail.status === 'In review';
  const history = detail.reviews.flatMap(r => [{at:r.at,by:r.preparer,text:`${r.id} submitted for review`},...(r.decision ? [{...r.decision,text:`${r.id} · ${r.decision.status}`}] : [])]);
  return <>
    <div className="section-heading"><h2>{selected ? `Submitted version ${selected.id}` : 'Review submissions'}</h2>{selected && <Status>{detail.status}</Status>}</div>
    {selected ? <>
      <dl className="review-meta"><div><dt>Preparer</dt><dd>{selected.preparer}</dd></div><div><dt>Reviewer</dt><dd>{selected.reviewer}</dd></div><div><dt>Submitted</dt><dd>{stamp(selected.at)}</dd></div><div><dt>Outstanding exceptions</dt><dd>{detail.exceptions.length}</dd></div></dl>
      {detail.exceptions.length > 0 && <ul>{detail.exceptions.map(r => <li key={r.key}>{names[r.key]}</li>)}</ul>}
    </> : null}
    {detail.reviews.length ? <Table columns={['Version','Preparer','Reviewer','Submitted','Decision','']}>
      {detail.reviews.slice().reverse().map(r => <tr key={r.id} className={selected?.id === r.id ? 'selected':''}><td className="strong">{r.id}</td><td>{r.preparer}</td><td>{r.reviewer}</td><td>{stamp(r.at)}</td><td><Status>{r.decision?.status ?? 'In review'}</Status></td><td className="action-cell"><Button onClick={() => goVersion(r.id)}>{selected?.id === r.id ? 'View overview':'Open version'}</Button></td></tr>)}
    </Table> : <p className="empty">No review submissions</p>}
    {canDecide && <section className="decision">
      <h2>Review decision</h2><label htmlFor="decision-note">Review note</label><textarea id="decision-note" rows="3" value={note} onChange={e => setNote(e.target.value)}/>
      <div className="spread"><small className="muted">Note required to request changes</small><div className="inline"><Button disabled={!!busy || !note.trim()} onClick={() => mutate('decision',{decision:'Changes requested',note})}>Request changes</Button><Button primary disabled={!!busy} onClick={() => mutate('decision',{decision:'Signed off',note})}>Sign off</Button></div></div>
    </section>}
    {history.length > 0 && <section className="separated"><div className="section-heading"><h2>Decision history</h2></div><Activity items={history}/></section>}
  </>;
}
