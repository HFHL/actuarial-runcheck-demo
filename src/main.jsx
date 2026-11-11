import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeftIcon, ArrowRightIcon, CalendarBlankIcon, CaretDownIcon, CaretRightIcon, ChartLineUpIcon, ClipboardTextIcon, DatabaseIcon, FilesIcon, FunnelSimpleIcon, LockSimpleIcon, PlusIcon, StackIcon, XIcon } from '@phosphor-icons/react';
import '@fontsource-variable/inter';
import './styles.css';
import { api } from './api';
import { Button, Modal, Status, Table, Workbook, day, num } from './ui';
import { Checks, Overview, Review, Variance } from './run';
import { Panel } from './panel';

const tabs = ['Overview','Inputs','Outputs','Variance','Review'];
const people = { Preparer:'Emma Chen', Reviewer:'Daniel Roy' };
const href = (id,tab='Overview',version) => `#/runs/${id}/${tab.toLowerCase()}${version ? '?version='+version:''}`;
const readRoute = () => {
  const [path,query] = location.hash.slice(1).split('?');
  const [,section,id,tab] = path.split('/');
  return { id:section === 'runs' ? id : undefined, reviews:section === 'reviews', tab:tabs.find(t => t.toLowerCase() === tab) ?? 'Overview', version:new URLSearchParams(query).get('version') ?? undefined };
};

function Sidebar({role,setRole,reviews}) {
  return <aside className="sidebar">
    <a href="#/runs" className="brand"><span className="brand-mark"><ChartLineUpIcon size={21} weight="bold"/></span><span>Actuarial Review<small>Workspace</small></span></a>
    <div className="nav-area"><span className="nav-label">Workspace</span><nav aria-label="Workspace">
      <a className={!reviews ? 'active':''} aria-current={!reviews ? 'page':undefined} href="#/runs"><StackIcon size={19}/>Valuation runs</a>
      <a className={reviews ? 'active':''} aria-current={reviews ? 'page':undefined} href="#/reviews"><ClipboardTextIcon size={19}/>My reviews</a>
    </nav></div>
    <div className="identity">
      <label htmlFor="role">Demo role</label><div className="role-select"><select id="role" value={role} onChange={e => setRole(e.target.value)}><option>Preparer</option><option>Reviewer</option></select><CaretDownIcon size={13}/></div>
      <div className="profile"><span className="avatar">{role === 'Preparer' ? 'EC':'DR'}</span><strong>{people[role]}</strong></div>
    </div>
  </aside>;
}

function NewRun({period,onClose,create,busy}) {
  const [template,setTemplate] = useState(period === 'sep' ? 'sep' : 'oct');
  const [name,setName] = useState('Life reserve valuation');
  const [batch,setBatch] = useState('');
  const [error,setError] = useState('');
  return <Modal title="New valuation run" onClose={onClose}>
    <form onSubmit={async e => {
      e.preventDefault();setError('');
      try { if (await create('create',{template,name,batch})) onClose(); }
      catch (error) { setError(error.message); }
    }}>
      <div className="dialog-body stack">
        <label htmlFor="run-name">Valuation name</label><input id="run-name" required maxLength="80" value={name} onChange={e => setName(e.target.value)}/>
        <label htmlFor="run-period">Valuation period</label><select id="run-period" value={template} onChange={e => setTemplate(e.target.value)}><option value="oct">October 2026</option><option value="sep">September 2026</option></select>
        <label htmlFor="run-batch">AXIS Batch ID</label><input id="run-batch" required inputMode="numeric" maxLength="8" value={batch} onChange={e => setBatch(e.target.value)}/>
        <dl className="new-run-meta"><div><dt>Dataset</dt><dd>LIFE_CA</dd></div><div><dt>Model version</dt><dd>{template === 'oct' ? 'v24':'v23'}</dd></div></dl>
        {error && <p className="negative" role="alert">{error}</p>}
      </div>
      <div className="dialog-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button primary busy={busy === 'create'} disabled={!!busy}>Create run</Button></div>
    </form>
  </Modal>;
}

function Worklist({reviewList, runs, role, period,setPeriod,line,setLine, loading,mutate,busy}) {
  const [adding,setAdding] = useState(false);
  const filtered = runs.filter(r => (!reviewList || r.reviewer === people[role]) && (period === 'all' || r.periodKey === period) && (line === 'all' || line === 'Life insurance'));
  return <>
    <div className="topline"><span className="topline-section">{reviewList ? <ClipboardTextIcon size={16}/> : <StackIcon size={16}/>}Workspace</span><CaretRightIcon size={12}/><span>{reviewList ? 'My reviews':'Valuation runs'}</span></div>
    <div className="page">
      <div className="spread"><h1>{reviewList ? 'My reviews' : 'Valuation runs'}</h1>
        {!reviewList && role === 'Preparer' && <Button primary onClick={() => setAdding(true)}><PlusIcon size={16}/> New valuation run</Button>}
      </div>
      <div className="filters">
        <div><label htmlFor="period">Period</label><div className="filter-control"><CalendarBlankIcon size={17}/><select id="period" value={period} onChange={e => setPeriod(e.target.value)}><option value="all">All periods</option><option value="oct">October 2026</option><option value="sep">September 2026</option></select><CaretDownIcon className="select-arrow" size={13}/></div></div>
        <div><label htmlFor="business-line">Business line</label><div className="filter-control"><FunnelSimpleIcon size={17}/><select id="business-line" value={line} onChange={e => setLine(e.target.value)}><option value="all">All business lines</option><option>Life insurance</option><option>Annuities</option></select><CaretDownIcon className="select-arrow" size={13}/></div></div>
      </div>
      <div className="worklist">
      <Table columns={['Valuation','Valuation date','Model version','Input checks','Output checks',num('Open exceptions'),'Review','Owner','']}>
        {filtered.map(r => {
          const link = href(r.id,reviewList ? 'Review':'Overview',reviewList ? r.latestVersion:undefined);
          return <tr key={r.id} onClick={() => {location.hash=link;}}><td><a className="valuation-link" href={link} onClick={e => e.stopPropagation()}><span className="file-tile"><FilesIcon size={19}/></span><span><strong>{r.name}</strong><small>{r.period} · Batch {r.batch}</small></span></a></td><td>{day(r.date)}</td><td><span className="mono">{r.model}</span></td><td><Status>{r.inputStatus}</Status></td><td><Status>{r.outputStatus}</Status></td><td className={'num '+(r.exceptions ? 'negative':'muted')}>{r.exceptions}</td><td><Status>{r.status}</Status></td><td className="nowrap">{r.owner}</td><td><CaretRightIcon size={15}/></td></tr>;
        })}
        {!filtered.length && <tr><td colSpan="9" className="empty">{loading ? 'Loading runs…' : reviewList ? 'No assigned reviews' : 'No valuation runs'}</td></tr>}
      </Table>
      <div className="table-footer">{filtered.length} {reviewList ? (filtered.length === 1 ? 'review':'reviews') : (filtered.length === 1 ? 'run':'runs')}</div>
      </div>
      {adding && !reviewList && role === 'Preparer' && <NewRun period={period} onClose={() => setAdding(false)} create={mutate} busy={busy}/>}
    </div>
  </>;
}

function App() {
  const [route,setRoute] = useState(readRoute), [role,setRoleState] = useState(localStorage.getItem('actuarial-role') ?? 'Preparer');
  const [lastList,setLastList] = useState(readRoute().version ? 'reviews':'runs');
  const [period,setPeriod] = useState('all'), [line,setLine] = useState('all');
  const [list,setList] = useState([]), [loaded,setLoaded] = useState(false), [packet,setPacket] = useState(null);
  const [selection,setSelection] = useState(null), [panelOpen,setPanelOpen] = useState(false), [panelTab,setPanelTab] = useState('Evidence'), [ev,setEv] = useState(null);
  const [book,setBook] = useState(null), [busy,setBusy] = useState(''), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  const pending = useRef(false), sourceSequence = useRef(0);
  const {id,tab,version,reviews} = route;

  useEffect(() => {
    const change = () => setRoute(readRoute());
    addEventListener('hashchange',change);
    return () => removeEventListener('hashchange',change);
  },[]);
  useEffect(() => {
    if (!id) setLastList(reviews ? 'reviews':'runs');
  },[id,reviews]);
  useEffect(() => {
    setPanelOpen(false);setSelection(null);setEv(null);setError('');setBook(null);sourceSequence.current++;
  },[id,version,tab]);
  useEffect(() => {
    let active = true;
    const load = id ? api('detail',{id,version}) : api('list',{reviewList:reviews});
    load.then(result => {
      if (!active) return;
      if (id) setPacket(result);
      else {setList(result.runs);setLoaded(true);}
    }).catch(e => {if(active)setError(e.message);});
    return () => {active=false;};
  },[id,version,reviews,revision]);
  useEffect(() => {
    if (!selection || !panelOpen) return;
    let active = true;
    api('evidence',{id,version,key:selection.key,attempt:selection.attempt}).then(({evidence}) => {if(active)setEv(evidence);}).catch(e => {if(active)setError(e.message);});
    return () => {active=false;};
  },[id,version,selection,panelOpen,revision]);

  const setRole = value => {localStorage.setItem('actuarial-role',value);setRoleState(value);if(value === 'Reviewer') location.hash='#/reviews';};
  const goTab = next => {location.hash=href(id,next,version);};
  const goVersion = next => {location.hash=href(id,next === version ? 'Overview':'Review',next);};
  const select = (key,attempt,title) => {
    if (selection?.key !== key || selection?.attempt !== attempt) {setEv(null);setPanelTab('Evidence');setSelection({key,attempt,title});}
    else if (!panelOpen) setPanelTab('Evidence');
    setPanelOpen(true);
  };
  const mutate = async (action,data) => {
    if (pending.current) return false;
    pending.current=true;setBusy(action);setError('');
    try {
      const result = await api(action,{id,version,role,...data});
      setRevision(v => v+1);
      if (action === 'create') {
        setPeriod(old => old === 'all' ? old : data.template);
        setLine('all');
        location.hash=href(result.id);
      }
      if (action === 'submit' && readRoute().id === id) goVersion(result.version);
      return true;
    } catch(e) {if (action === 'create') throw e;setError(e.message);return false;}
    finally {pending.current=false;setBusy('');}
  };
  const openSource = async link => {
    const seq = ++sourceSequence.current;
    try {
      const {workbook} = await api('workbook',link);
      if (sourceSequence.current === seq) setBook(workbook);
    } catch(e) {if (sourceSequence.current === seq) setError(e.message);}
  };

  const detail = id && packet?.detail?.run.id === id && (packet.detail.version ?? undefined) === version ? packet.detail : null;
  const editable = !!detail && !version && role === 'Preparer' && ['Draft','Changes requested'].includes(detail.status);
  const ready = detail?.inputStatus === 'Passed' && detail?.outputStatus === 'Passed';
  const latest = detail?.reviews.at(-1);
  const clearSelection = () => {setPanelOpen(false);setSelection(null);setEv(null);};
  const shared = {detail,select,selection,clearSelection,openSource,editable,mutate,busy};

  return <div className="app">
    <Sidebar role={role} setRole={setRole} reviews={id ? lastList === 'reviews':reviews}/>
    <main>
      {error && <div className="toast" role="alert">{error}<button className="icon" aria-label="Dismiss error" onClick={() => setError('')}><XIcon size={16}/></button></div>}
      {!id ? <Worklist reviewList={reviews} runs={list} role={role} period={period} setPeriod={setPeriod} line={line} setLine={setLine} loading={!loaded} mutate={mutate} busy={busy}/> : <>
        <div className="topline"><a className="back" aria-label="Back to worklist" href={lastList === 'reviews' ? '#/reviews':'#/runs'}><ArrowLeftIcon size={16}/></a><a href={lastList === 'reviews' ? '#/reviews':'#/runs'}>{lastList === 'reviews' ? 'My reviews':'Valuation runs'}</a>{detail && <><CaretRightIcon size={12}/><a href={lastList === 'reviews' ? '#/reviews':'#/runs'} onClick={() => setPeriod(detail.run.periodKey)}>{detail.run.period}</a><CaretRightIcon size={12}/><span>Life reserves</span></>}</div>
        {!detail ? <div className="page"><p role="status">{error ? 'Run unavailable' : 'Loading run…'}</p></div> : <>
          <div className="run-header">
            <div className="run-title"><div className="run-kicker"><DatabaseIcon size={14}/> LIFE_CA <span> / </span> AXIS Batch {detail.run.batch}</div><h1>{detail.run.name}</h1></div>
            <div className="submit-area">{editable ? <><Button primary disabled={!ready || !!busy} busy={busy === 'submit'} onClick={() => mutate('submit')}>Submit for review <ArrowRightIcon size={15}/></Button>{!ready && <small>Checks must pass</small>}</> : version ? <><span className="locked"><LockSimpleIcon size={15}/> {version} · Read-only</span>{role === 'Preparer' && latest?.decision?.status === 'Changes requested' && <a className="text" href={href(id)}>Open working run</a>}</> : latest ? <Button onClick={() => goVersion(latest.id)}>Open submitted version</Button> : <span className="locked"><LockSimpleIcon size={15}/> Read-only</span>}</div>
            <dl className="run-meta"><div><dt>Valuation date</dt><dd>{day(detail.run.date)}</dd></div><div><dt>Dataset</dt><dd>LIFE_CA</dd></div><div><dt>Batch ID</dt><dd>{detail.run.batch}</dd></div><div><dt>Model version</dt><dd>{detail.run.model}</dd></div><div><dt>Baseline</dt><dd>{detail.run.baseline}</dd></div></dl>
            <nav className="tabs" aria-label="Run views">{tabs.map(name => <a key={name} href={href(id,name,version)} className={tab === name ? 'active':''} aria-current={tab === name ? 'page':undefined}>{name}</a>)}</nav>
          </div>
          <div className={'run-body'+(panelOpen ? ' with-panel':'')}>
            <div className="run-content" key={`${id}:${tab}:${version}`}>
              {tab === 'Overview' && <Overview {...shared} goTab={goTab}/>}
              {tab === 'Inputs' && <Checks {...shared} kind="input" catalog={packet.catalog}/>}
              {tab === 'Outputs' && <Checks {...shared} kind="output" catalog={packet.catalog}/>}
              {tab === 'Variance' && <Variance {...shared}/>}
              {tab === 'Review' && <Review {...shared} role={role} goVersion={goVersion}/>}
            </div>
            {panelOpen && selection && <Panel key={`${selection.key}:${selection.attempt}`} {...shared} ev={ev} panelTab={panelTab} setPanelTab={setPanelTab} close={() => setPanelOpen(false)}/>}
          </div>
        </>}
      </>}
      {book && <Modal title={book.name} onClose={() => setBook(null)} wide><Workbook data={book}/></Modal>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
