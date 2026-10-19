import {ProfileService} from './profile-service.ts';
import {isLifeRecord,validateLife,healthMetrics} from '../domain/life.ts';
import type {LifeRecord,LifeInput,PersonalRecord} from '../domain/life.ts';
export class LifeService{
  private profiles:ProfileService;
  constructor(profiles:ProfileService){this.profiles=profiles;}
  async list(token:string){return (await this.profiles.readRecords(token)).filter(isLifeRecord).filter(r=>!r.deletedAt);}
  async save(token:string,input:LifeInput&{title?:string},id?:string,revision?:number):Promise<LifeRecord>{
    const profile=this.profiles.getProfile(token);const records=await this.profiles.readRecords(token);
    const prior=id?records.find(r=>r.id===id&&!r.deletedAt):undefined;
    if(id&&(!prior||prior.kind!==input.kind||prior.revision!==revision))throw new Error('Record unavailable or changed. Reload before saving.');
    const now=new Date().toISOString();
    const record={...input,title:input.title??(input.kind==='health_sample'?healthMetrics[input.metric].label:'Untitled'),id:id??crypto.randomUUID(),profileId:profile.id,revision:(prior?.revision??0)+1,payloadVersion:1,createdAt:prior?.createdAt??now,updatedAt:now,...(input.kind==='health_sample'?{sourceType:'manual',sourceId:`manual:${profile.id}`}:{})} as LifeRecord;
    validateLife(record,records);await this.profiles.commitRecords(token,[record],records);return record;
  }
  async remove(token:string,id:string,revision:number){
    const records=await this.profiles.readRecords(token);const record=records.find(r=>r.id===id&&!r.deletedAt&&isLifeRecord(r));
    if(!record||record.revision!==revision)throw new Error('Record unavailable or changed.');
    const now=new Date().toISOString();const writes:PersonalRecord[]=[{...record,revision:revision+1,updatedAt:now,deletedAt:now}];
    if(record.kind==='study_topic')for(const r of records)if(r.kind==='study_session'&&r.topicId===id&&!r.deletedAt)writes.push({...r,topicId:undefined,revision:r.revision+1,updatedAt:now});
    await this.profiles.commitRecords(token,writes,records);
  }
}
