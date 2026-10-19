import type {BaseRecord,Task,Goal,CalendarEvent,TaskEvent} from './planning.ts';
export type AIWritable=Task|Goal|CalendarEvent;
export interface ProposalOperation {action:'create'|'update';record:AIWritable;before?:AIWritable;}
export interface AIProposal extends Omit<BaseRecord,'kind'> {
 kind:'ai_proposal';intent:string;status:'pending_approval'|'rejected'|'applied';proposalVersion:number;
 operations:ProposalOperation[];events:TaskEvent[];warnings:string[];planHash:string;expiresAt:string;
 provider:string;model:string;baseRevisions:{id:string;revision:number}[];appliedAt?:string;
}
export interface AIApproval extends Omit<BaseRecord,'kind'> {kind:'ai_approval';proposalId:string;proposalVersion:number;planHash:string;approvedAt:string;operationIds:string[];confirmedDestructive:false;}
export interface ChatMessage {id:string;role:'user'|'assistant';text:string;createdAt:string;}
export interface AIConversation extends Omit<BaseRecord,'kind'> {kind:'ai_conversation';title:string;messages:ChatMessage[];}
export type AIRecord=AIProposal|AIApproval|AIConversation;
/** Only JSON objects with exactly documented fields enter the command boundary. */
export function object(value:unknown,allowed:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected a structured object.');
 const result=value as Record<string,unknown>;if(Object.keys(result).some(key=>!allowed.includes(key)))throw new Error('Unsupported proposal field.');return result;
}
export function textField(value:unknown,name:string,max=10000):string {if(typeof value!=='string'||value.length>max)throw new Error('Invalid '+name+'.');return value;}
export function optionalText(value:unknown,name:string){return value===undefined||value===null||value===''?undefined:textField(value,name);}
export function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
export function proposalHashPayload(proposal:AIProposal){return canonical({id:proposal.id,profileId:proposal.profileId,proposalVersion:proposal.proposalVersion,intent:proposal.intent,operations:proposal.operations,events:proposal.events,warnings:proposal.warnings,expiresAt:proposal.expiresAt,provider:proposal.provider,model:proposal.model,baseRevisions:proposal.baseRevisions});}
