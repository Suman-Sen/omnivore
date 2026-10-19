import {ProfileService} from './profile-service.ts';
import {validateRecord} from '../domain/planning.ts';
import type {Task,Goal,CalendarEvent,TaskEvent} from '../domain/planning.ts';
import type {PersonalRecord} from '../domain/life.ts';
import {object,textField,optionalText,proposalHashPayload} from '../domain/ai-proposal.ts';
import type {AIProposal,AIApproval,AIWritable,ProposalOperation} from '../domain/ai-proposal.ts';
async function hash(proposal:AIProposal){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proposalHashPayload(proposal)));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
const shared=['title','description'];
const fields={task:[...shared,'status','priority','dueLocalDate','dueAt','scheduledStartAt','scheduledEndAt','goalId'],goal:[...shared,'status','targetDate','targetAt','parentGoalId','progressMode'],event:[...shared,'location','isAllDay','startAt','endAt','startLocalDate','endLocalDate','taskId']} as const;
export class ProposalService {
 private profiles:ProfileService;private now:()=>number;
 constructor(profiles:ProfileService,now:()=>number=Date.now){this.profiles=profiles;this.now=now;}
 async list(token:string){return (await this.profiles.readRecords(token)).filter((r):r is AIProposal=>r.kind==='ai_proposal'&&!r.deletedAt);}
 async propose(token:string,raw:unknown,provenance:{provider:string;model:string},previousId?:string):Promise<AIProposal>{
  const profile=this.profiles.getProfile(token);const snapshot=await this.profiles.readRecords(token);const body=object(raw,['intent','operations']);
  const intent=textField(body.intent,'intent',2000);if(!intent.trim())throw new Error('Describe the proposal intent.');
  if(!Array.isArray(body.operations)||body.operations.length<1||body.operations.length>200)throw new Error('Proposals need 1 to 200 operations.');
  const previous=previousId?snapshot.find((r):r is AIProposal=>r.id===previousId&&r.kind==='ai_proposal'&&r.status==='pending_approval'):undefined;
  if(previousId&&!previous)throw new Error('Proposal unavailable or already resolved.');
  const now=new Date(this.now()).toISOString();const staged:PersonalRecord[]=[...snapshot];const operations:ProposalOperation[]=[];const events:TaskEvent[]=[];const targets=new Set<string>();
  for(const rawOp of body.operations){
   const op=object(rawOp,['action','kind','targetId','expectedRevision','values']);
   if(op.action!=='create'&&op.action!=='update')throw new Error('Only create and update operations are supported; deletion requires a separate explicit flow.');
   if(op.kind!=='task'&&op.kind!=='goal'&&op.kind!=='event')throw new Error('Unsupported entity type.');
   const values=object(op.values,fields[op.kind]);
   const prior=op.action==='update'?snapshot.find((r):r is AIWritable=>r.id===op.targetId&&r.kind===op.kind&&!r.deletedAt):undefined;
   if(op.action==='update'&&(!prior||prior.revision!==op.expectedRevision))throw new Error('Target unavailable or changed.');
   if(op.action==='create'&&(op.targetId!=null||op.expectedRevision!=null))throw new Error('New records cannot set an existing identity.');
   const id=prior?.id??crypto.randomUUID();if(targets.has(id))throw new Error('A proposal cannot change the same record twice.');targets.add(id);
   const strings:Record<string,string|undefined>={};
   for(const [key,value] of Object.entries(values)){if(key!=='isAllDay')strings[key]=optionalText(value,key);}
   const common={...prior,...strings,id,profileId:profile.id,revision:(prior?.revision??0)+1,createdAt:prior?.createdAt??now,updatedAt:now,title:strings.title??prior?.title??'',description:strings.description??prior?.description??''};
   let record:AIWritable;
   if(op.kind==='task')record={status:'pending',priority:'none',createdByType:'ai',...common,kind:'task',timezone:profile.timezone} as Task;
   else if(op.kind==='goal')record={status:'active',progressMode:'evidence',...common,kind:'goal',timezone:profile.timezone} as Goal;
   else {if(values.isAllDay!==undefined&&typeof values.isAllDay!=='boolean')throw new Error('Invalid all-day flag.');record={location:'',isAllDay:false,...common,...(values.isAllDay!==undefined?{isAllDay:values.isAllDay}:{}),kind:'event',calendarId:'local',timezone:profile.timezone,sourceType:'ai_proposal'} as CalendarEvent;}
   if(record.kind==='task')record.completedAt=record.status==='completed'?(prior?.kind==='task'&&prior.completedAt||now):undefined;
   validateRecord(record,staged);operations.push({action:op.action,record,...(prior?{before:prior}:{})});
   const index=staged.findIndex(r=>r.id===id);if(index<0)staged.push(record);else staged[index]=record;
   if(record.kind==='task'&&(!prior||prior.kind==='task'&&prior.status!==record.status)){
    const oldStatus=prior?.kind==='task'?prior.status:undefined;
    events.push({id:crypto.randomUUID(),profileId:profile.id,kind:'task_event',revision:1,createdAt:now,updatedAt:now,taskId:id,eventType:!prior?'created':record.status==='completed'?'completed':record.status==='cancelled'?'cancelled':oldStatus==='completed'?'reopened':'status_changed',oldStatus,newStatus:record.status,occurredAt:now,actorType:'ai'});
   }
  }
  for(const {record} of operations)validateRecord(record,staged);
  const warnings:string[]=[];
  const timed=staged.filter((r):r is Task|CalendarEvent=>(r.kind==='task'&&r.status!=='cancelled'||r.kind==='event'&&!r.isAllDay)&&!r.deletedAt);
  for(const {record} of operations){const start=record.kind==='task'?record.scheduledStartAt:record.kind==='event'?record.startAt:undefined;const end=record.kind==='task'?record.scheduledEndAt:record.kind==='event'?record.endAt:undefined;if(!start||!end)continue;
   for(const other of timed){if(other.id===record.id)continue;const a=other.kind==='task'?other.scheduledStartAt:other.startAt,b=other.kind==='task'?other.scheduledEndAt:other.endAt;if(a&&b&&Date.parse(start)<Date.parse(b)&&Date.parse(a)<Date.parse(end))warnings.push(record.title+' overlaps '+other.title+'.');}
  }
  const proposal:AIProposal={id:previous?.id??crypto.randomUUID(),profileId:profile.id,kind:'ai_proposal',revision:(previous?.revision??0)+1,createdAt:previous?.createdAt??now,updatedAt:now,intent,status:'pending_approval',proposalVersion:(previous?.proposalVersion??0)+1,operations,events,warnings:[...new Set(warnings)],planHash:'',expiresAt:new Date(this.now()+86400000).toISOString(),provider:provenance.provider,model:provenance.model,baseRevisions:snapshot.filter(r=>!r.kind.startsWith('ai_')).map(r=>({id:r.id,revision:r.revision}))};
  proposal.planHash=await hash(proposal);await this.profiles.commitRecords(token,[proposal],snapshot);return proposal;
 }
 async reject(token:string,id:string,version:number){const snapshot=await this.profiles.readRecords(token);const p=snapshot.find((r):r is AIProposal=>r.id===id&&r.kind==='ai_proposal');if(!p||p.status!=='pending_approval'||p.proposalVersion!==version)throw new Error('Proposal unavailable or changed.');await this.profiles.commitRecords(token,[{...p,status:'rejected',revision:p.revision+1,updatedAt:new Date(this.now()).toISOString()}],snapshot);}
 async approve(token:string,approval:{id:string;version:number;hash:string;confirmed:true}){
  const profile=this.profiles.getProfile(token),snapshot=await this.profiles.readRecords(token);const p=snapshot.find((r):r is AIProposal=>r.kind==='ai_proposal'&&r.id===approval.id);
  if(approval.confirmed!==true||!p||p.profileId!==profile.id||p.status!=='pending_approval'||p.proposalVersion!==approval.version||p.planHash!==approval.hash||await hash(p)!==p.planHash)throw new Error('Approval does not match the current proposal.');
  if(Date.parse(p.expiresAt)<=this.now())throw new Error('Proposal expired. Generate and review a fresh plan.');
  const current=snapshot.filter(r=>!r.kind.startsWith('ai_'));
  if(current.length!==p.baseRevisions.length||current.some(r=>!p.baseRevisions.some(old=>old.id===r.id&&old.revision===r.revision)))throw new Error('Your data changed. Generate and review a fresh plan.');
  const now=new Date(this.now()).toISOString();const audit:AIApproval={id:crypto.randomUUID(),profileId:profile.id,kind:'ai_approval',revision:1,createdAt:now,updatedAt:now,proposalId:p.id,proposalVersion:p.proposalVersion,planHash:p.planHash,approvedAt:now,operationIds:p.operations.map(o=>o.record.id),confirmedDestructive:false};
  await this.profiles.commitRecords(token,[...p.operations.map(o=>o.record),...p.events,audit,{...p,status:'applied',appliedAt:now,updatedAt:now,revision:p.revision+1}],snapshot);
 }
}
