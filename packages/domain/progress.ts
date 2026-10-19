import type {PlanningRecord} from './planning.ts';
import {localDateAt,validDate} from './planning.ts';
export type ProgressRange='day'|'week'|'month'|'year';
export function dateRange(anchor:string,range:ProgressRange,weekStartsOn:number):{start:string;end:string}{
  if(!validDate(anchor)||!Number.isInteger(weekStartsOn)||weekStartsOn<0||weekStartsOn>6)throw new Error('Invalid progress range.');
  const date=new Date(anchor+'T12:00:00Z');let start:Date;let end:Date;
  if(range==='day'){start=new Date(date);end=new Date(date);end.setUTCDate(end.getUTCDate()+1);}
  else if(range==='week'){start=new Date(date);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()-weekStartsOn+7)%7);end=new Date(start);end.setUTCDate(end.getUTCDate()+7);}
  else if(range==='month'){start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1,12));end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1,12));}
  else {start=new Date(Date.UTC(date.getUTCFullYear(),0,1,12));end=new Date(Date.UTC(date.getUTCFullYear()+1,0,1,12));}
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export function summarizeProgress(records:PlanningRecord[],profileId:string,timezone:string,anchor:string,range:ProgressRange,weekStartsOn:number){
  const bounds=dateRange(anchor,range,weekStartsOn);
  const inside=(date:string)=>date>=bounds.start&&date<bounds.end;
  const scoped=records.filter(r=>r.profileId===profileId&&!r.deletedAt);
  const completedTasks=scoped.filter(r=>r.kind==='task'&&r.status==='completed'&&r.completedAt&&inside(localDateAt(r.completedAt,timezone))).length;
  const journalEntries=scoped.filter(r=>r.kind==='journal'&&inside(r.localDate)).length;
  const events=scoped.filter(r=>r.kind==='event'&&(r.isAllDay?r.startLocalDate!<bounds.end&&r.endLocalDate!>bounds.start:localDateAt(r.startAt!,timezone)<bounds.end&&localDateAt(new Date(Date.parse(r.endAt!)-1).toISOString(),timezone)>=bounds.start)).length;
  return {...bounds,completedTasks,journalEntries,events};
}
