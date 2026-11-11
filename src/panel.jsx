import React, { useState } from 'react';
import { XIcon, SparkleIcon } from '@phosphor-icons/react';
import { Activity, Button, SourceLink, Status, Table, money, num, signed, count, stamp } from './ui';

function Breakdown({rows,onOpen}) {
  return <Table columns={['Product',num('Expected'),num('AXIS'),num('Diff.'),'Source']} className="breakdown">
    {rows.map(row => <tr key={row.name}><td>{row.name}</td><td className="num">{money(row.expected)}</td><td className="num">{money(row.current)}</td><td className={'num '+(row.difference ? 'negative':'')}>{signed(row.difference)}</td><td><button className="text" onClick={() => onOpen(row.links[1])}>AXIS</button><button className="text" onClick={() => onOpen(row.links[0])}>Calc</button></td></tr>)}
  </Table>;
}

export function Panel({selection, ev, panelTab, setPanelTab, editable, busy, mutate, close, openSource}) {
  const [breakdown,setBreakdown] = useState(false), [prompt,setPrompt] = useState(''), [note,setNote] = useState('');
  const [assigned,setAssigned] = useState('');
  const extra = { key:selection.key, attempt:selection.attempt };
  const investigate = async (question) => { if (await mutate('investigate',{...extra,prompt:question})) setPrompt(''); };
  const r = ev?.result, t = ev?.reserve?.totals;
  const format = t ? money : count;
  return <aside className="panel" aria-label="Selected item">
    <div className="panel-head"><div><div className="meta-line">Check {selection.attempt}</div><h2>{ev?.title ?? selection.title}</h2></div><button className="icon" aria-label="Close panel" onClick={close}><XIcon size={19}/></button></div>
    <div className="tabs panel-tabs" aria-label="Selected item views">{['Evidence','AI','Activity'].map(tab => <button key={tab} className={panelTab === tab ? 'active' : ''} aria-pressed={panelTab === tab} onClick={() => setPanelTab(tab)}>{tab}</button>)}</div>
    <div className="panel-body">
      {!ev ? <p className="empty" role="status">Loading evidence…</p> : panelTab === 'Evidence' ? <>
        <div className="spread evidence-status"><Status>{r.status}</Status><small>{stamp(ev.at)}</small></div>
        <dl className="measurements"><div><dt>Observed {t && '(CAD M)'}</dt><dd>{format(r.observed)}</dd></div><div><dt>Expected {t && '(CAD M)'}</dt><dd>{format(r.expected)}</dd></div>{t && <><div><dt>Tolerance (CAD M)</dt><dd>{money(r.tolerance)}</dd></div><div><dt>Unexplained (CAD M)</dt><dd className={r.difference ? 'negative':''}>{signed(r.difference)}</dd></div></>}</dl>
        {r.issue && <p className="negative">{r.issue}</p>}
        {t && <section className="panel-section"><h3>Calculation <small>CAD M</small></h3><dl className="calculation"><div><dt>Opening reserve</dt><dd>{money(t.opening)}</dd></div><div><dt>Net movements</dt><dd>{signed(t.net)}</dd></div><div><dt>Expected closing reserve</dt><dd>{money(t.expected)}</dd></div></dl>
          <Button aria-expanded={breakdown} onClick={() => setBreakdown(!breakdown)}>{breakdown ? 'Hide product breakdown':'Break down by product'}</Button>
          {breakdown && <div className="breakdown-section"><h3>Product breakdown <small>CAD M</small></h3><Breakdown rows={ev.breakdown} onOpen={openSource}/></div>}
        </section>}
        <section className="panel-section"><h3>Source files</h3>{ev.links.length ? ev.links.map(link => <SourceLink key={link.file} link={link} onOpen={openSource}/>) : <p className="empty">No source file</p>}</section>
        <section className="panel-section"><h3>Assigned owner</h3>
          {editable ? <form className="inline" onSubmit={e => {e.preventDefault();mutate('assign',{...extra,owner:assigned || ev.owner});}}><select aria-label="Assigned owner" value={assigned || ev.owner} onChange={e => setAssigned(e.target.value)}><option>Emma Chen</option><option>Daniel Roy</option></select><Button disabled={!!busy}>Assign</Button></form> : <p>{ev.owner}</p>}
        </section>
      </> : panelTab === 'AI' ? <>
        {editable && <Button primary busy={busy === 'investigate'} disabled={!!busy} onClick={() => investigate('')}><SparkleIcon size={16}/> {busy === 'investigate' ? 'Investigating…' : 'Investigate with AI'}</Button>}
        {!ev.investigation?.length && !busy && <p className="empty">No investigation</p>}
        {ev.investigation?.map((answer,i) => <section key={i} className="panel-section">
          {answer.prompt && <p className="question">{answer.prompt}</p>}
          <h3>{answer.rows.length ? 'Product breakdown' : 'Investigation result'} {answer.rows.length > 0 && <small>CAD M</small>}</h3>
          <p>{answer.text}</p>{answer.rows.length > 0 && <Breakdown rows={answer.rows} onOpen={openSource}/>}
          {answer.cause && <p><Status>{answer.cause}</Status></p>}
          <button className="text" onClick={() => setPanelTab('Evidence')}>View evidence · {ev.attempt}</button>
        </section>)}
        {editable && <form className="panel-section stack" onSubmit={e => {e.preventDefault();investigate(prompt);}}><label htmlFor="prompt">Ask about this exception</label><textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows="2"/><Button disabled={!!busy || !prompt.trim()}>Ask</Button></form>}
      </> : <>
        <Activity items={ev.activity}/>
        {editable && <form className="panel-section stack" onSubmit={async e => {e.preventDefault();if(await mutate('note',{...extra,note})) setNote('');}}><label htmlFor="activity-note">Note</label><textarea id="activity-note" value={note} onChange={e => setNote(e.target.value)} rows="3"/><Button disabled={!!busy || !note.trim()}>Add note</Button></form>}
      </>}
    </div>
  </aside>;
}
