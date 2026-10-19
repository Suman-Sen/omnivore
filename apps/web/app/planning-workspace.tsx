'use client';
import DashboardChart from './dashboard-chart';

import {useEffect,useMemo,useState} from 'react';
import DailyCalendar from './daily-calendar';
import {shiftDate} from '../../../packages/domain/calendar-view';

import type {FormEvent} from 'react';

import type {ProfileService} from '../../../packages/application/profile-service';

import {PlanningService} from '../../../packages/application/planning-service';

import {summarizeProgress} from '../../../packages/domain/progress';

import type {ProgressRange} from '../../../packages/domain/progress';

import type {LocalProfile,ProfilePreferences} from '../../../packages/domain/local-profile';

import type {EditableRecord,PlanningRecord,RecordInput,Task,Goal,Note} from '../../../packages/domain/planning';

import {goalProgress,localDateAt,wallTimeToInstant} from '../../../packages/domain/planning';

type Screen='overview'|'task'|'goal'|'note'|'event'|'journal';

const labels:Record<Screen,string>={overview:'Dashboard',task:'Tasks',goal:'Goals',note:'Notes',event:'Calendar',journal:'Journal'};

type Draft={kind:EditableRecord['kind'];id?:string;revision?:number;title:string;content:string;status:string;priority:string;date:string;deadline:string;endDate:string;start:string;end:string;allDay:boolean;goalId:string;parentGoalId:string;sourceNoteId:string;taskId:string;location:string;progressMode:string;pinned:boolean;favorite:boolean;disambiguation:'reject'|'earlier'|'later'};

function blank(kind:Draft['kind'],timezone:string):Draft{return {kind,title:'',content:'',status:kind==='goal'?'active':'pending',priority:'none',date:localDateAt(new Date().toISOString(),timezone),deadline:'',endDate:'',start:'',end:'',allDay:false,goalId:'',parentGoalId:'',sourceNoteId:'',taskId:'',location:'',progressMode:'evidence',pinned:false,favorite:false,disambiguation:'reject'};}

function wall(instant:string|undefined,timezone:string){if(!instant)return '';const date=new Date(instant);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);const p=(type:string)=>parts.find(x=>x.type===type)!.value;return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;}

export default function PlanningWorkspace({profiles,token,profile,preferences,onPreferences,preferencesBusy,selectedScreen,onNavigate}:{profiles:ProfileService;token:string;profile:LocalProfile;preferences:ProfilePreferences;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>;preferencesBusy:boolean;selectedScreen?:Screen;onNavigate?:(screen:Screen)=>void}){

  const service=useMemo(()=>new PlanningService(profiles),[profiles]);

  const [records,setRecords]=useState<PlanningRecord[]>([]);

  const [range,setRange]=useState<ProgressRange>('week');

  const [anchor,setAnchor]=useState(localDateAt(new Date().toISOString(),profile.timezone));

  const [localScreen,setLocalScreen]=useState<Screen>('event');
  const screen=selectedScreen??localScreen;
  const setScreen=(next:Screen)=>{setLocalScreen(next);onNavigate?.(next);};

  const [draft,setDraft]=useState<Draft|null>(null);

  const [search,setSearch]=useState('');

  const [filter,setFilter]=useState('all');

  const [error,setError]=useState('');

  const [notice,setNotice]=useState('');

  const [busy,setBusy]=useState(false);

  const [deleting,setDeleting]=useState<EditableRecord|null>(null);

  useEffect(()=>{let alive=true;const refresh=()=>{service.list(token).then(value=>{if(alive)setRecords(value);}).catch(()=>{if(alive)setError('Could not load your records. Lock and unlock to retry.');});};refresh();const unsubscribe=profiles.subscribe(refresh);return()=>{alive=false;unsubscribe();};},[service,profiles,token]);

  const goals=records.filter((r):r is Goal=>r.kind==='goal');

  const tasks=records.filter((r):r is Task=>r.kind==='task');

  const today=localDateAt(new Date().toISOString(),profile.timezone);

  const progress=summarizeProgress(records,profile.id,profile.timezone,anchor,range,preferences.weekStartsOn);

  const visible=records.filter((record):record is EditableRecord=>record.kind!=='task_event'&&record.kind===screen).filter(record=>(!search||JSON.stringify(record).toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&(screen!=='task'||filter==='all'||('status' in record&&record.status===filter))).sort((a,b)=>a.kind==='note'&&b.kind==='note'?Number(b.pinned)-Number(a.pinned)||b.updatedAt.localeCompare(a.updatedAt):b.updatedAt.localeCompare(a.updatedAt));

  function field<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(current=>current?{...current,[key]:value}:null);}

  function edit(record:EditableRecord){

    const value=blank(record.kind,profile.timezone);value.id=record.id;value.revision=record.revision;value.title=record.title;

    if('description' in record)value.content=record.description;

    if('sourceNoteId' in record)value.sourceNoteId=record.sourceNoteId??'';

    if('status' in record)value.status=record.status;

    if(record.kind==='note'){value.content=record.content;value.pinned=record.pinned;value.favorite=record.favorite;}

    if(record.kind==='journal'){value.content=record.narrative;value.date=record.localDate;}

    if(record.kind==='task'){value.priority=record.priority;value.date=record.dueLocalDate??'';value.deadline=wall(record.dueAt,profile.timezone);value.start=wall(record.scheduledStartAt,profile.timezone);value.end=wall(record.scheduledEndAt,profile.timezone);value.goalId=record.goalId??'';}

    if(record.kind==='goal'){value.date=record.targetDate??'';value.deadline=wall(record.targetAt,profile.timezone);value.parentGoalId=record.parentGoalId??'';value.progressMode=record.progressMode;}

    if(record.kind==='milestone')value.goalId=record.goalId;

    if(record.kind==='event'){value.allDay=record.isAllDay;value.date=record.startLocalDate??today;value.endDate=record.endLocalDate??'';value.start=wall(record.startAt,profile.timezone);value.end=wall(record.endAt,profile.timezone);value.location=record.location;value.taskId=record.taskId??'';}

    setDraft(value);setError('');setNotice('');

  }

  async function run(action:()=>Promise<unknown>,message:string){if(busy)return;setBusy(true);setError('');setNotice('');try{await action();setRecords(await service.list(token));setNotice(message);return true;}catch(e){setError(e instanceof Error?e.message:'Unable to save. Please retry.');return false;}finally{setBusy(false);}}

  async function toggleTask(task:Task){
    if(busy)return;
    const updated:Task={...task,status:task.status==='completed'?'pending':'completed'};
    setRecords(current=>current.map(r=>r.id===task.id?updated:r));
    const ok=await run(()=>service.save(token,updated,task.id,task.revision),'Task updated.');
    if(!ok)setRecords(current=>current.map(r=>r.id===task.id?task:r));
  }

  async function save(event:FormEvent){

    event.preventDefault();if(!draft)return;

    const d=draft;

    const ok=await run(async()=>{

      const optional=(value:string)=>value||undefined;

      const instant=(value:string)=>value?wallTimeToInstant(value,profile.timezone,d.disambiguation):undefined;

      let input:RecordInput;

      switch(d.kind){

        case 'task':input={kind:'task',title:d.title,description:d.content,status:d.status as Task['status'],priority:d.priority as Task['priority'],dueLocalDate:d.deadline?undefined:optional(d.date),dueAt:instant(d.deadline),scheduledStartAt:instant(d.start),scheduledEndAt:instant(d.end),goalId:optional(d.goalId),sourceNoteId:optional(d.sourceNoteId),timezone:profile.timezone,createdByType:'user'};break;

        case 'goal':input={kind:'goal',title:d.title,description:d.content,status:d.status as Goal['status'],targetDate:d.deadline?undefined:optional(d.date),targetAt:instant(d.deadline),timezone:profile.timezone,parentGoalId:optional(d.parentGoalId),progressMode:d.progressMode as Goal['progressMode'],sourceNoteId:optional(d.sourceNoteId)};break;

        case 'note':input={kind:'note',title:d.title,content:d.content,contentFormat:'plain',pinned:d.pinned,favorite:d.favorite};break;

        case 'journal':input={kind:'journal',title:d.title,narrative:d.content,localDate:d.date};break;

        case 'milestone':input={kind:'milestone',title:d.title,goalId:d.goalId,status:d.status as 'pending'|'completed',orderIndex:records.filter(r=>r.kind==='milestone'&&r.goalId===d.goalId).length};break;

        case 'event':input={kind:'event',title:d.title,description:d.content,location:d.location,calendarId:'local',isAllDay:d.allDay,startAt:d.allDay?undefined:instant(d.start),endAt:d.allDay?undefined:instant(d.end),startLocalDate:d.allDay?d.date:undefined,endLocalDate:d.allDay?d.endDate:undefined,timezone:profile.timezone,sourceType:'user',sourceNoteId:optional(d.sourceNoteId),taskId:optional(d.taskId)};

      }

      await service.save(token,input,d.id,d.revision);

    },'Saved on this device.');if(ok)setDraft(null);

  }

  function convert(note:Note,kind:'task'|'goal'|'event'){setScreen(kind);setDraft({...blank(kind,profile.timezone),title:note.title,content:note.content,sourceNoteId:note.id});setNotice('Review the fields before saving. Your original note will be kept.');}

  return <section className="planning" aria-label="Planning workspace">

    {!selectedScreen&&<nav className="module-nav" aria-label="Modules">{(Object.keys(labels) as Screen[]).filter(key=>key!=='journal'||preferences.journalEnabled).map(key=><button key={key} aria-current={screen===key?'page':undefined} onClick={()=>{setScreen(key);setDraft(null);setDeleting(null);setSearch('');setFilter('all');setError('');}}>{labels[key]}</button>)}</nav>}

    <h2>{labels[screen]}</h2>

    {error&&<p role="alert" className="message error">{error}</p>}<p role="status">{busy?'Saving…':notice}</p>

    {screen==='overview'?<>

      <div className="toolbar"><label>Progress range<select value={range} onChange={e=>setRange(e.target.value as ProgressRange)}>{['day','week','month','year'].map(value=><option key={value}>{value}</option>)}</select></label><label>Containing date<input type="date" value={anchor} onChange={e=>{if(e.target.value)setAnchor(e.target.value);}}/></label></div>

      <p>{progress.start} to {progress.end} (exclusive) · {profile.timezone}</p>

      <div className="summary-grid">{preferences.dashboardWidgets.filter(widget=>widget!=='journal'||preferences.journalEnabled).map(widget=><article className="panel" key={widget}><h3>{widget==='tasks'?'Task progress':widget==='calendar'?'Calendar':widget==='goals'?'Goals':'Journal'}</h3><strong>{widget==='tasks'?progress.completedTasks:widget==='calendar'?progress.events:widget==='goals'?goals.filter(g=>g.status==='active').length:progress.journalEntries}</strong><p>{widget==='tasks'?'Tasks completed in this range':widget==='calendar'?'Events in this range':widget==='goals'?'Active goals':'Entries in this range'}</p><DashboardChart widget={widget} preferences={preferences} busy={preferencesBusy} onPreferences={onPreferences} data={widget==='tasks'?(['pending','in_progress','completed','cancelled'] as const).map(status=>({label:status.replaceAll('_',' '),value:records.filter(r=>r.kind==='task'&&!r.deletedAt&&r.status===status).length})):widget==='goals'?(['active','paused','completed','abandoned','archived'] as const).map(status=>({label:status,value:goals.filter(g=>g.status===status).length})):[{label:widget==='calendar'?'Events':'Journal entries',value:widget==='calendar'?progress.events:progress.journalEntries}]}/></article>)}</div>

      <details className="panel dashboard-settings"><summary>Customize dashboard</summary><fieldset disabled={preferencesBusy}><legend>Widgets and order</legend>{(['tasks','calendar','goals','journal'] as const).map(widget=><label className="check" key={widget}><input type="checkbox" checked={preferences.dashboardWidgets.includes(widget)} onChange={e=>void onPreferences({dashboardWidgets:e.target.checked?[...preferences.dashboardWidgets,widget]:preferences.dashboardWidgets.filter(w=>w!==widget)})}/>{widget}</label>)}{preferences.dashboardWidgets.map((widget,index)=><div className="actions" key={widget}><span>{index+1}. {widget}</span><button disabled={index===0} onClick={()=>{const widgets=[...preferences.dashboardWidgets];[widgets[index-1],widgets[index]]=[widgets[index],widgets[index-1]];void onPreferences({dashboardWidgets:widgets});}}>Move {widget} up</button></div>)}<label className="check"><input type="checkbox" checked={preferences.journalEnabled} onChange={e=>void onPreferences({journalEnabled:e.target.checked})}/>Enable Journal module</label></fieldset><p>Disabling Journal hides its navigation and widget. Existing entries are kept.</p></details>

    </>:<>

      <div className="toolbar"><button onClick={()=>{setDraft(blank(screen,profile.timezone));setError('');}}>New {screen==='event'?'event':screen}</button><label>Search {labels[screen].toLowerCase()}<input value={search} onChange={e=>setSearch(e.target.value)}/></label>{screen==='task'&&<label>Status filter<select value={filter} onChange={e=>setFilter(e.target.value)}>{['all','pending','in_progress','completed','cancelled'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>}</div>

      {draft&&<section className="panel editor"><h3>{draft.id?'Edit':'New'} {draft.kind}</h3><form onSubmit={save}><fieldset disabled={busy}>

        <label>Title<input value={draft.title} maxLength={300} required={!['note','journal'].includes(draft.kind)} onChange={e=>field('title',e.target.value)}/></label>

        {draft.kind!=='milestone'&&<label>{draft.kind==='journal'?'Your narrative':draft.kind==='note'?'Note content':'Description'}<textarea rows={5} value={draft.content} onChange={e=>field('content',e.target.value)}/></label>}

        {['task','goal','milestone'].includes(draft.kind)&&<label>Status<select value={draft.status} onChange={e=>field('status',e.target.value)}>{(draft.kind==='goal'?['active','paused','completed','abandoned','archived']:draft.kind==='milestone'?['pending','completed']:['pending','in_progress','completed','cancelled']).map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>}

        {draft.kind==='task'&&<><label>Priority<select value={draft.priority} onChange={e=>field('priority',e.target.value)}>{['none','low','medium','high','urgent'].map(value=><option key={value}>{value}</option>)}</select></label><label>Linked goal<select value={draft.goalId} onChange={e=>field('goalId',e.target.value)}><option value="">None</option>{goals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label></>}

        {draft.kind==='goal'&&<><label>Parent goal<select value={draft.parentGoalId} onChange={e=>field('parentGoalId',e.target.value)}><option value="">None</option>{goals.filter(g=>g.id!==draft.id).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label><label>Progress from<select value={draft.progressMode} onChange={e=>field('progressMode',e.target.value)}><option value="evidence">Linked tasks</option><option value="milestone">Milestones</option></select></label></>}

        {(['task','goal','journal'].includes(draft.kind)||(draft.kind==='event'&&draft.allDay))&&<label>{draft.kind==='task'?'Due date':draft.kind==='goal'?'Target date':'Date'}<input type="date" value={draft.date} required={draft.kind==='journal'||draft.kind==='event'} onChange={e=>field('date',e.target.value)}/></label>}

        {(draft.kind==='task'||draft.kind==='goal')&&<label>{draft.kind==='task'?'Due date and time (optional)':'Target date and time (optional)'}<input type="datetime-local" value={draft.deadline} onChange={e=>field('deadline',e.target.value)}/><small>A date and time replaces the date-only deadline. Times use {profile.timezone}.</small></label>}

        {draft.kind==='event'&&<><label className="check"><input type="checkbox" checked={draft.allDay} onChange={e=>field('allDay',e.target.checked)}/>All-day event</label>{draft.allDay&&<label>End date (exclusive)<input type="date" value={draft.endDate} onChange={e=>field('endDate',e.target.value)} required/></label>}<label>Location<input value={draft.location} onChange={e=>field('location',e.target.value)}/></label><label>Linked task<select value={draft.taskId} onChange={e=>field('taskId',e.target.value)}><option value="">None</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></>}

        {(draft.kind==='task'||draft.kind==='event'&&!draft.allDay)&&<><p>Times use {profile.timezone}.</p><label>Start time<input type="datetime-local" value={draft.start} required={draft.kind==='event'} onChange={e=>field('start',e.target.value)}/></label><label>End time<input type="datetime-local" value={draft.end} required={draft.kind==='event'} onChange={e=>field('end',e.target.value)}/></label><label>Repeated time during clock change<select value={draft.disambiguation} onChange={e=>field('disambiguation',e.target.value as Draft['disambiguation'])}><option value="reject">Ask me to choose</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label></>}

        {draft.kind==='goal'&&draft.deadline&&<label>Repeated time during clock change<select value={draft.disambiguation} onChange={e=>field('disambiguation',e.target.value as Draft['disambiguation'])}><option value="reject">Ask me to choose</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label>}

        {draft.kind==='note'&&<><label className="check"><input type="checkbox" checked={draft.pinned} onChange={e=>field('pinned',e.target.checked)}/>Pin note</label><label className="check"><input type="checkbox" checked={draft.favorite} onChange={e=>field('favorite',e.target.checked)}/>Favorite</label></>}

        {draft.sourceNoteId&&<p>Linked to the original note, which will be preserved.</p>}

        <div className="actions"><button type="submit" className="primary">Save {draft.kind}</button><button type="button" onClick={()=>setDraft(null)}>Cancel</button></div>

      </fieldset></form></section>}

      {deleting&&<section className="panel confirmation" role="alertdialog" aria-label="Confirm deletion"><h3>Delete {deleting.title||'this record'}?</h3><p>Independent linked records will be kept. This record will leave active views.</p><button disabled={busy} onClick={()=>void run(()=>service.remove(token,deleting.id,deleting.revision),'Deleted.').then(ok=>{if(ok)setDeleting(null);})}>Confirm delete</button><button onClick={()=>setDeleting(null)}>Keep record</button></section>}

      {screen==='event'&&<DailyCalendar weekStartsOn={preferences.weekStartsOn} timeFormat={preferences.timeFormat} records={records} profileId={profile.id} timezone={profile.timezone} busy={busy} onEdit={record=>{edit(record);setTimeout(()=>document.querySelector('.editor')?.scrollIntoView({behavior:'smooth',block:'start'}),0);}} onTask={task=>void toggleTask(task)} onCreate={(date,hour)=>{setDraft({...blank('event',profile.timezone),start:date+'T'+String(hour).padStart(2,'0')+':00',end:(hour===23?shiftDate(date,1):date)+'T'+String((hour+1)%24).padStart(2,'0')+':00'});setTimeout(()=>document.querySelector('.editor')?.scrollIntoView({behavior:'smooth',block:'start'}),0);}}/>}
      {screen==='event'&&<h3>All events</h3>}

      <div className="record-list">{!visible.length&&<p>No {labels[screen].toLowerCase()} found. Create one to get started.</p>}{visible.map(record=><article className="panel record" key={record.id}><h3>{record.title||'Untitled'}</h3>{'status' in record&&<span className="pill">{record.status.replaceAll('_',' ')}</span>}

        <p className="preserve">{'description' in record?record.description:record.kind==='note'?record.content:record.kind==='journal'?record.narrative:''}</p>

        {record.kind==='task'&&<p>Priority: {record.priority}{record.dueLocalDate&&` · Due ${record.dueLocalDate}`}{record.completedAt&&` · Completed ${localDateAt(record.completedAt,profile.timezone)}`}</p>}

        {record.kind==='event'&&<p>{record.isAllDay?`${record.startLocalDate} to ${record.endLocalDate} (exclusive)`:new Intl.DateTimeFormat(undefined,{timeZone:profile.timezone,dateStyle:'medium',timeStyle:'short'}).formatRange(new Date(record.startAt!),new Date(record.endAt!))} · {profile.timezone}</p>}

        {(record.kind==='task'||record.kind==='goal')&&<div className="record-times">{record.kind==='task'&&record.scheduledStartAt&&record.scheduledEndAt&&<p>Scheduled: {wall(record.scheduledStartAt,profile.timezone).replace('T',' ')} to {wall(record.scheduledEndAt,profile.timezone).replace('T',' ')} ({profile.timezone})</p>}{((record.kind==='task'&&record.dueAt)||(record.kind==='goal'&&record.targetAt))&&<p>Deadline: {wall(record.kind==='task'?record.dueAt:record.targetAt,profile.timezone).replace('T',' ')} ({profile.timezone})</p>}{record.kind==='goal'&&record.targetDate&&<p>Target: {record.targetDate}</p>}<small>Created {wall(record.createdAt,profile.timezone).replace('T',' ')} · Updated {wall(record.updatedAt,profile.timezone).replace('T',' ')} ({profile.timezone})</small></div>}

        {record.kind==='journal'&&<p>{record.localDate}</p>}

        {record.kind==='goal'&&<><p>{goalProgress(record,records).percent===null?'No evidence yet':`${goalProgress(record,records).percent}% · ${goalProgress(record,records).completed}/${goalProgress(record,records).total} complete`}</p>{records.filter(r=>r.kind==='milestone'&&r.goalId===record.id).map(m=>m.kind==='milestone'&&<p key={m.id}><button onClick={()=>edit(m)}>{m.status==='completed'?'✓':'○'} {m.title}</button></p>)}<button onClick={()=>setDraft({...blank('milestone',profile.timezone),goalId:record.id})}>Add milestone</button></>}

        <div className="actions"><button disabled={busy} onClick={()=>edit(record)}>Edit</button>{record.kind==='task'&&<button disabled={busy} onClick={()=>void run(()=>service.save(token,{...record,status:record.status==='completed'?'pending':'completed'},record.id,record.revision),'Task updated.')}>{record.status==='completed'?'Reopen':'Complete'}</button>}<button disabled={busy} onClick={()=>setDeleting(record)}>Delete</button>{record.kind==='note'&&(['task','event','goal'] as const).map(kind=><button key={kind} onClick={()=>convert(record,kind)}>Convert to {kind}</button>)}</div>

      </article>)}</div>

    </>}

  </section>;

}

