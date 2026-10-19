import {useEffect,useState} from 'react';
import type {ProfileService} from '../../../packages/application/profile-service';
import type {PersonalRecord} from '../../../packages/domain/life';
export default function HistoryWorkspace({profiles,token,timezone,onAI}:{profiles:ProfileService;token:string;timezone:string;onAI:()=>void}){
 const [records,setRecords]=useState<PersonalRecord[]>([]),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[search,setSearch]=useState('');
 useEffect(()=>{let alive=true;const refresh=()=>{profiles.readRecords(token).then(rows=>{if(alive)setRecords(rows);}).catch(()=>{if(alive)setError('History could not load. Lock and unlock to retry.');});};refresh();const unsubscribe=profiles.subscribe(refresh);return()=>{alive=false;unsubscribe();};},[profiles,token]);
 const rows=records.flatMap(r=>{
  if(r.kind==='task_event'){const task=records.find(t=>t.id===r.taskId&&t.kind==='task');return [{id:r.id,type:'tasks',title:task&&'title' in task?task.title:'Deleted task',detail:r.eventType.replaceAll('_',' ')+' · '+r.newStatus.replaceAll('_',' '),at:r.occurredAt}];}
  if(r.kind==='ai_conversation'&&!r.deletedAt)return [{id:r.id,type:'chats',title:r.title,detail:r.messages.length+' saved messages',at:r.updatedAt}];
  if(r.kind==='ai_proposal'&&!r.deletedAt)return [{id:r.id,type:'plans',title:r.intent,detail:'AI proposal · '+r.status.replaceAll('_',' '),at:r.updatedAt}];
  if(r.kind==='ai_approval')return [];
  if('title' in r)return [{id:r.id,type:'records',title:r.title||r.kind.replaceAll('_',' '),detail:r.kind.replaceAll('_',' ')+' · '+(r.deletedAt?'deleted':r.revision===1?'created':'last updated'),at:r.deletedAt??r.updatedAt}];
  return [];
 }).filter(r=>(filter==='all'||r.type===filter)&&(r.title+' '+r.detail).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
 return <section className="planning" aria-label="Activity history"><h2>History</h2><p>Your saved task transitions, chats, AI proposals and latest record activity. Earlier edits without a stored event cannot be reconstructed.</p><div className="toolbar"><label>History type<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All activity</option><option value="tasks">Task history</option><option value="chats">Chat history</option><option value="plans">AI plans</option><option value="records">Record activity</option></select></label><label>Search history<input value={search} onChange={e=>setSearch(e.target.value)}/></label><button onClick={onAI}>Open saved chats</button></div>{error&&<p role="alert">{error}</p>}{!rows.length&&<p>No saved history matches this view.</p>}<ol className="history-list">{rows.map(row=><li className="panel record" key={row.id}><h3>{row.title}</h3><p>{row.detail}</p><time dateTime={row.at}>{new Date(row.at).toLocaleString(undefined,{timeZone:timezone})} · {timezone}</time></li>)}</ol></section>;
}
