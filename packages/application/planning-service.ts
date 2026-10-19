import {isPlanningRecord} from '../domain/life.ts';
import type {PersonalRecord} from '../domain/life.ts';
import {ProfileService} from './profile-service.ts';
import {validateRecord} from '../domain/planning.ts';
import type {EditableRecord,RecordInput,Task,TaskEvent} from '../domain/planning.ts';
export class PlanningService {
  private profiles:ProfileService;
  constructor(profiles:ProfileService){this.profiles=profiles;}
  async list(token:string){return (await this.profiles.readRecords(token)).filter(isPlanningRecord).filter(record=>!record.deletedAt);}
  async save(token:string,input:RecordInput,id?:string,expectedRevision?:number):Promise<EditableRecord>{
    const profile=this.profiles.getProfile(token);
    const records=await this.profiles.readRecords(token);
    const prior=id?records.find(record=>record.id===id&&!record.deletedAt):undefined;
    if(id&&(!prior||prior.kind!==input.kind||prior.revision!==expectedRevision))throw new Error('Record unavailable or changed. Reload before saving.');
    const now=new Date().toISOString();
    const record={...input,id:id??crypto.randomUUID(),profileId:profile.id,revision:(prior?.revision??0)+1,createdAt:prior?.createdAt??now,updatedAt:now} as EditableRecord;
    if(record.kind==='task'||record.kind==='milestone')record.completedAt=record.status==='completed'?((prior&&'completedAt' in prior&&prior.completedAt)||now):undefined;
    validateRecord(record,records);
    const writes:PersonalRecord[]=[record];
    if(record.kind==='task'&&(!prior||!('status' in prior)||prior.status!==record.status)){
      const oldStatus=prior&&'status' in prior?prior.status as Task['status']:undefined;
      const event:TaskEvent={id:crypto.randomUUID(),profileId:profile.id,kind:'task_event',revision:1,createdAt:now,updatedAt:now,taskId:record.id,eventType:!prior?'created':record.status==='completed'?'completed':record.status==='cancelled'?'cancelled':oldStatus==='completed'?'reopened':'status_changed',oldStatus,newStatus:record.status,occurredAt:now,actorType:'user'};
      writes.push(event);
    }
    await this.profiles.commitRecords(token,writes,records);return record;
  }
  async remove(token:string,id:string,revision:number){
    const records=await this.profiles.readRecords(token);
    const record=records.find(item=>item.id===id&&!item.deletedAt&&isPlanningRecord(item)&&item.kind!=='task_event');
    if(!record||record.revision!==revision)throw new Error('Record unavailable or changed.');
    const now=new Date().toISOString();
    const writes:PersonalRecord[]=[{...record,deletedAt:now,updatedAt:now,revision:revision+1}];
    // Clear direct optional references, preserving independent records and tombstoned history.
    for(const related of records){
      if(related.deletedAt||related.id===id)continue;
      const copy={...related};let changed=false;
      if('sourceNoteId' in copy&&copy.sourceNoteId===id){copy.sourceNoteId=undefined;changed=true;}
      if('goalId' in copy&&copy.goalId===id){if(copy.kind==='milestone')copy.deletedAt=now;else copy.goalId=undefined;changed=true;}
      if(copy.kind==='goal'&&copy.parentGoalId===id){copy.parentGoalId=undefined;changed=true;}
      if(copy.kind==='event'&&copy.taskId===id){copy.taskId=undefined;changed=true;}
      if(changed)writes.push({...copy,updatedAt:now,revision:copy.revision+1});
    }
    await this.profiles.commitRecords(token,writes,records);
  }
  async search(token:string,query:string){const needle=query.trim().toLocaleLowerCase();return (await this.list(token)).filter(record=>record.kind!=='task_event'&&JSON.stringify(record).toLocaleLowerCase().includes(needle));}
}
