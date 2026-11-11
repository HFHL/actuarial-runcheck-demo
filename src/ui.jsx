import React, { useEffect, useRef } from 'react';
import { ArrowSquareOutIcon, XIcon, FileXlsIcon, CircleNotchIcon } from '@phosphor-icons/react';

export const money = v => v == null ? '—' : (v/10).toLocaleString('en-CA',{ minimumFractionDigits:1, maximumFractionDigits:1 });
export const count = v => v == null ? '—' : v.toLocaleString('en-CA');
export const day = value => value ? new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value)) : '—';
export const stamp = value => new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(value)) + ' ET';
export const signed = n => (n > 0 ? '+' : '') + money(n);

export function Status({children}) {
  return <span className={'status '+String(children).toLowerCase().replaceAll(' ','-')}><i aria-hidden="true"/>{children}</span>;
}
export function Button({children, primary, busy, ...props}) {
  return <button className={'button'+(primary ? ' primary':'')} {...props}>{busy && <CircleNotchIcon className="spin" size={15}/>} {children}</button>;
}
export function Table({columns, children, className = ''}) {
  return <div className={'table-wrap '+className}><table><thead><tr>{columns.map((col,i) => <th key={i} scope="col" className={typeof col === 'object' ? col.className : undefined}>{typeof col === 'object' ? col.label : col}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export const num = label => ({label,className:'num'});
export function SourceLink({link, onOpen, compact}) {
  return <button className="source-link" onClick={() => onOpen(link)}>
    {compact ? <ArrowSquareOutIcon size={15}/> : <FileXlsIcon size={17}/>}
    <span>{link.label}{!compact && <small>{link.range}</small>}</span>
    {!compact && <ArrowSquareOutIcon className="external" size={14}/>}
  </button>;
}
export function Modal({title, onClose, children, wide = false}) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  },[]);
  return <dialog ref={ref} className={wide ? 'wide' : ''} onCancel={e => {e.preventDefault();onClose();}} aria-labelledby="dialog-title">
    <div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon" aria-label="Close dialog" onClick={onClose}><XIcon size={19}/></button></div>{children}
  </dialog>;
}
export function Activity({items}) {
  if (!items.length) return <p className="empty">No activity</p>;
  return <ol className="timeline">{items.map((entry,i) => <li key={i}><strong>{entry.text}</strong><small>{entry.by} · {stamp(entry.at)}</small>{entry.note && <p>{entry.note}</p>}</li>)}</ol>;
}
export function Workbook({data}) {
  const cell = (col,row) => {
    const [a,b=a] = data.range.split(':');
    const [,sc,sr] = /^([A-Z])(\d+)$/.exec(a);
    const [,ec,er] = /^([A-Z])(\d+)$/.exec(b);
    return col >= sc && col <= ec && row >= +sr && row <= +er;
  };
  return <div className="workbook">
    <div className="formula"><strong>{data.range}</strong><span>{data.sheet}</span></div>
    <div className="table-wrap"><table><thead><tr><th scope="col" aria-label="Row"/>{data.columns.map((_,i) => <th scope="col" key={i}>{String.fromCharCode(65+i)}</th>)}</tr></thead><tbody>
      <tr className="sheet-header"><th scope="row">2</th>{data.columns.map(c => <td key={c}>{c}</td>)}</tr>
      {data.rows.map((row,i) => <tr key={i}><th scope="row">{i+3}</th>{row.map((val,j) => <td key={j} className={cell(String.fromCharCode(65+j),i+3) ? 'highlight' : ''}>{typeof val === 'number' ? (data.columns[j].includes('CAD') ? val.toFixed(1) : count(val)) : val}</td>)}</tr>)}
    </tbody></table></div><div className="sheet-tab">{data.sheet}</div>
  </div>;
}
