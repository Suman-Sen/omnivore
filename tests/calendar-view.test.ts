import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDay,shiftDate} from '../packages/domain/calendar-view.ts';
import type {Task,CalendarEvent} from '../packages/domain/planning.ts';
const base={id:'one',profileId:'a',revision:1,createdAt:'2026-10-04T00:00:00Z',updatedAt:'2026-10-04T00:00:00Z'};
const task:Task={...base,kind:'task',title:'Task',description:'',status:'pending',priority:'none',timezone:'Asia/Kolkata',createdByType:'user'};
const event:CalendarEvent={...base,kind:'event',title:'Event',description:'',location:'',calendarId:'local',isAllDay:false,timezone:'Asia/Kolkata',sourceType:'user'};
test('CAL-UI-010: local midnight, exclusive ends, profile scope and unscheduled completion',()=>{
 const timed={...task,scheduledStartAt:'2026-10-03T18:30:00Z',scheduledEndAt:'2026-10-04T18:30:00Z'};
 assert.equal(calendarDay([timed],'a','2026-10-04','Asia/Kolkata')[0].hour,0);
 assert.equal(calendarDay([timed],'a','2026-10-05','Asia/Kolkata').length,0);
 assert.equal(calendarDay([timed],'b','2026-10-04','Asia/Kolkata').length,0);
 assert.equal(calendarDay([{...timed,deletedAt:base.createdAt}],'a','2026-10-04','Asia/Kolkata').length,0);
 assert.equal(calendarDay([{...event,isAllDay:true,startLocalDate:'2026-10-04',endLocalDate:'2026-10-05'}],'a','2026-10-05','Asia/Kolkata').length,0);
 assert.equal(calendarDay([task,{...task,id:'done',status:'completed'}],'a','2026-10-04','Asia/Kolkata').length,1);
 assert.equal(calendarDay([{...task,status:'completed',dueLocalDate:'2026-10-04'}],'a','2026-10-04','Asia/Kolkata').length,1);
 assert.equal(shiftDate('2024-02-28',1),'2024-02-29');
});
test('CAL-UI-010: DST repeated hours retain distinguishable UTC offsets',()=>{
 const early={...event,startAt:'2026-11-01T05:15:00Z',endAt:'2026-11-01T05:45:00Z'};
 const late={...event,id:'late',startAt:'2026-11-01T06:15:00Z',endAt:'2026-11-01T06:45:00Z'};
 const items=calendarDay([early,late],'a','2026-11-01','America/New_York');
 assert.deepEqual(items.map(i=>i.hour),[1,1]);assert.notEqual(items[0].label,items[1].label);
});
test('CAL-UI-011: exact chronological order within an hour and due-time tasks',()=>{
 const later={...event,id:'later',title:'A later event',startAt:'2026-10-04T05:25:00Z',endAt:'2026-10-04T05:30:00Z'};
 const earlier={...event,id:'earlier',title:'Z earlier event',startAt:'2026-10-04T05:05:00Z',endAt:'2026-10-04T05:10:00Z'};
 const due={...task,id:'due',dueAt:'2026-10-04T05:15:00Z'};
 assert.deepEqual(calendarDay([later,task,due,earlier],'a','2026-10-04','Asia/Kolkata').map(i=>i.record.id),['earlier','due','later','one']);
});
import {planningEnd} from '../packages/domain/calendar-view.ts';
test('AI-SCHED-001: day/week/month horizons clamp month-end and leap years',()=>{
 assert.equal(planningEnd('2026-01-31','month'),'2026-02-28');assert.equal(planningEnd('2024-01-31','month'),'2024-02-29');assert.equal(planningEnd('2026-12-31','month'),'2027-01-31');assert.equal(planningEnd('2026-10-05','week'),'2026-10-12');assert.equal(planningEnd('2026-10-05','day'),'2026-10-06');
});
