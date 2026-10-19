import type {PersonalRecord} from './life.ts';
export type RecordKind='task'|'goal'|'note'|'event'|'milestone'|'task_event'|'journal';
export interface BaseRecord {
  id:string;profileId:string;kind:RecordKind;revision:number;createdAt:string;updatedAt:string;deletedAt?:string;
}
export interface Task extends BaseRecord {
  kind:'task';title:string;description:string;status:'pending'|'in_progress'|'completed'|'cancelled';
  priority:'none'|'low'|'medium'|'high'|'urgent';dueLocalDate?:string;dueAt?:string;
  scheduledStartAt?:string;scheduledEndAt?:string;timezone:string;completedAt?:string;
  goalId?:string;sourceNoteId?:string;createdByType:'user'|'ai';
}
export interface Goal extends BaseRecord {
  kind:'goal';title:string;description:string;status:'active'|'paused'|'completed'|'abandoned'|'archived';
  parentGoalId?:string;targetDate?:string;targetAt?:string;timezone?:string;progressMode:'evidence'|'milestone';sourceNoteId?:string;
}
export interface Note extends BaseRecord {kind:'note';title:string;content:string;contentFormat:'plain';pinned:boolean;favorite:boolean;}
export interface CalendarEvent extends BaseRecord {
  kind:'event';title:string;description:string;location:string;calendarId:'local';isAllDay:boolean;
  startAt?:string;endAt?:string;startLocalDate?:string;endLocalDate?:string;timezone:string;
  sourceType:'user'|'ai_proposal';sourceNoteId?:string;taskId?:string;
}
export interface Milestone extends BaseRecord {kind:'milestone';goalId:string;title:string;status:'pending'|'completed';completedAt?:string;orderIndex:number;}
export interface TaskEvent extends BaseRecord {kind:'task_event';taskId:string;eventType:'created'|'status_changed'|'completed'|'reopened'|'cancelled';oldStatus?:Task['status'];newStatus:Task['status'];occurredAt:string;actorType:'user'|'ai';}
export interface Journal extends BaseRecord {kind:'journal';title:string;narrative:string;localDate:string;}
export type PlanningRecord=Task|Goal|Note|CalendarEvent|Milestone|TaskEvent|Journal;
export type EditableRecord=Task|Goal|Note|CalendarEvent|Milestone|Journal;
export type RecordInput<T extends EditableRecord=EditableRecord> = T extends EditableRecord ? Omit<T,keyof BaseRecord> & {kind:T['kind']} : never;
export function validDate(value:string):boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
function instant(value:string):boolean{return /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));}
export function validateRecord(record:EditableRecord,records:PersonalRecord[]):void {
  const fail=(message:string):never=>{throw new Error(message);};
  if(record.title.trim().length>300)fail('Keep the title within 300 characters.');
  if(record.kind!=='note'&&record.kind!=='journal'&&!record.title.trim())fail('Enter a title.');
  const link=(id:string|undefined,kind:RecordKind)=>{
    if(id&&!records.some(item=>item.id===id&&item.kind===kind&&item.profileId===record.profileId&&!item.deletedAt))fail('The linked record is unavailable in this profile.');
  };
  if('sourceNoteId' in record)link(record.sourceNoteId,'note');
  if('timezone' in record){try{new Intl.DateTimeFormat('en',{timeZone:record.timezone}).format();}catch{fail('Select a valid timezone.');}}
  if(record.kind==='task'){
    if(!['pending','in_progress','completed','cancelled'].includes(record.status)||!['none','low','medium','high','urgent'].includes(record.priority))fail('Invalid task status or priority.');
    link(record.goalId,'goal');
    if(record.dueLocalDate&&!validDate(record.dueLocalDate))fail('Invalid due date.');
    if(record.dueAt&&!instant(record.dueAt))fail('Invalid due time.');
    if(Boolean(record.scheduledStartAt)!==Boolean(record.scheduledEndAt)||(record.scheduledStartAt&&record.scheduledEndAt&&(!instant(record.scheduledStartAt)||!instant(record.scheduledEndAt)||Date.parse(record.scheduledEndAt)<=Date.parse(record.scheduledStartAt))))fail('Scheduled end must be after start.');
  }
  if(record.kind==='goal'){
    if(!['active','paused','completed','abandoned','archived'].includes(record.status)||!['evidence','milestone'].includes(record.progressMode))fail('Invalid goal settings.');
    if(record.targetDate&&!validDate(record.targetDate))fail('Invalid target date.');
    if(record.targetAt&&(!instant(record.targetAt)||!record.timezone))fail('A timed goal needs a valid target time and timezone.');
    if(record.targetAt&&record.targetDate)fail('Choose either a target date or a target date and time.');
    link(record.parentGoalId,'goal');
    const visited=new Set([record.id]);let parent=record.parentGoalId;
    while(parent){if(visited.has(parent))fail('A goal cannot be its own ancestor.');visited.add(parent);parent=(records.find(item=>item.kind==='goal'&&item.id===parent) as Goal|undefined)?.parentGoalId;}
  }
  if(record.kind==='note'&&(record.contentFormat!=='plain'||typeof record.pinned!=='boolean'||typeof record.favorite!=='boolean'))fail('Invalid note settings.');
  if(record.kind==='event'){
    link(record.taskId,'task');
    if(record.isAllDay){if(!record.startLocalDate||!record.endLocalDate||!validDate(record.startLocalDate)||!validDate(record.endLocalDate)||record.endLocalDate<=record.startLocalDate)fail('All-day end date must be after start (exclusive).');}
    else if(!record.startAt||!record.endAt||!instant(record.startAt)||!instant(record.endAt)||Date.parse(record.endAt)<=Date.parse(record.startAt))fail('Event end must be after start.');
  }
  if(record.kind==='milestone'){link(record.goalId,'goal');if(!record.goalId||!['pending','completed'].includes(record.status))fail('Invalid milestone.');}
  if(record.kind==='journal'&&!validDate(record.localDate))fail('Invalid journal date.');
}
export function goalProgress(goal:Goal,records:PlanningRecord[]):{completed:number;total:number;percent:number|null}{
  const sources=records.filter(record=>!record.deletedAt&&record.profileId===goal.profileId&&((goal.progressMode==='milestone'&&record.kind==='milestone'&&record.goalId===goal.id)||(goal.progressMode==='evidence'&&record.kind==='task'&&record.goalId===goal.id&&record.status!=='cancelled')));
  const completed=sources.filter(record=>'status' in record&&record.status==='completed').length;
  return {completed,total:sources.length,percent:sources.length?Math.round(completed/sources.length*100):null};
}
export function localDateAt(instant:string,timezone:string):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
  const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
/** Resolve wall time using IANA offsets; reject gaps and require a choice for folds. */
export function wallTimeToInstant(value:string,timezone:string,disambiguation:'reject'|'earlier'|'later'='reject'):string {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!validDate(value.slice(0,10)))throw new Error('Invalid date and time.');
  const naive=Date.parse(value+'Z');if(!Number.isFinite(naive))throw new Error('Invalid date and time.');
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const wall=(timestamp:number)=>{const parts=formatter.formatToParts(timestamp);const p=(type:string)=>parts.find(x=>x.type===type)!.value;return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;};
  const candidates=new Set<number>();
  for(let hour=-36;hour<=36;hour+=6){const sample=naive+hour*3600000;const offset=Date.parse(wall(sample)+'Z')-sample;const candidate=naive-offset;if(wall(candidate)===value)candidates.add(candidate);}
  const sorted=[...candidates].sort((a,b)=>a-b);
  if(!sorted.length)throw new Error('This local time does not exist because the clock changes. Choose another time.');
  if(sorted.length>1&&disambiguation==='reject')throw new Error('This local time occurs twice. Choose the earlier or later occurrence.');
  return new Date(disambiguation==='later'?sorted.at(-1)!:sorted[0]).toISOString();
}
