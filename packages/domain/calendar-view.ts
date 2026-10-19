import type {PlanningRecord,Task,CalendarEvent} from './planning.ts';
import {localDateAt,validDate} from './planning.ts';
export function shiftDate(date:string,days:number){if(!validDate(date))throw new Error('Invalid date.');const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
export interface DayItem {record:Task|CalendarEvent;hour:number|null;label:string;}
export function calendarDay(records:PlanningRecord[],profileId:string,date:string,timezone:string,timeFormat:'12h'|'24h'='24h'):DayItem[]{
  if(!validDate(date))throw new Error('Invalid date.');
  const time=new Intl.DateTimeFormat(undefined,{timeZone:timezone,hour12:timeFormat==='12h',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'});
  const hour=new Intl.DateTimeFormat('en',{timeZone:timezone,hour:'2-digit',hourCycle:'h23'});
  const items:DayItem[]=[];
  for(const record of records){
    if(record.profileId!==profileId||record.deletedAt||(record.kind!=='task'&&record.kind!=='event'))continue;
    if(record.kind==='task'&&record.status==='cancelled')continue;
    if(record.kind==='event'&&record.isAllDay){if(record.startLocalDate!<=date&&record.endLocalDate!>date)items.push({record,hour:null,label:'All day'});continue;}
    const start=record.kind==='task'?record.scheduledStartAt:record.startAt;
    const end=record.kind==='task'?record.scheduledEndAt:record.endAt;
    if(start&&end){
      const first=localDateAt(start,timezone),last=localDateAt(new Date(Date.parse(end)-1).toISOString(),timezone);
      if(first<=date&&last>=date)items.push({record,hour:first<date?0:Number(hour.format(new Date(start))),label:(first<date?'Continued':time.format(new Date(start)))+' – '+(localDateAt(end,timezone)>date?'continues tomorrow':time.format(new Date(end)))});
    }else if(record.kind==='task'){
      const due=record.dueAt?localDateAt(record.dueAt,timezone):record.dueLocalDate;
      if(due===date||(!due&&record.status!=='completed'))items.push({record,hour:record.dueAt?Number(hour.format(new Date(record.dueAt))):null,label:record.dueAt?'Due '+time.format(new Date(record.dueAt)):due?'Due today':'Not scheduled'});
    }
  }
  const rank=(item:DayItem)=>item.label==='Not scheduled'?2:item.hour===null?0:1;
  const instant=(item:DayItem)=>item.record.kind==='task'?(item.record.scheduledStartAt??item.record.dueAt??''):(item.record.startAt??'');
  return items.sort((a,b)=>rank(a)-rank(b)||instant(a).localeCompare(instant(b))||a.record.title.localeCompare(b.record.title));
}

export function planningEnd(start:string,horizon:'day'|'week'|'month'):string{
 if(horizon!=='month')return shiftDate(start,horizon==='week'?7:1);
 if(!validDate(start))throw new Error('Invalid date.');
 const value=new Date(start+'T12:00:00Z'),day=value.getUTCDate();value.setUTCDate(1);value.setUTCMonth(value.getUTCMonth()+1);const last=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(day,last));return value.toISOString().slice(0,10);
}
