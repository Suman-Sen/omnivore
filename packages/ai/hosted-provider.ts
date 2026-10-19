import type {AIProvider} from './ports.ts';
export type HostedProviderName='openai'|'gemini';
const nullable={type:['string','null']};
const obj=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const values={
 task:obj({title:{type:'string'},description:{type:'string'},status:{type:'string',enum:['pending','in_progress','completed','cancelled']},priority:{type:'string',enum:['none','low','medium','high','urgent']},dueLocalDate:nullable,dueAt:nullable,scheduledStartAt:nullable,scheduledEndAt:nullable,goalId:nullable}),
 goal:obj({title:{type:'string'},description:{type:'string'},status:{type:'string',enum:['active','paused','completed','abandoned','archived']},targetDate:nullable,targetAt:nullable,parentGoalId:nullable,progressMode:{type:'string',enum:['evidence','milestone']}}),
 event:obj({title:{type:'string'},description:{type:'string'},location:{type:'string'},isAllDay:{type:'boolean'},startAt:nullable,endAt:nullable,startLocalDate:nullable,endLocalDate:nullable,taskId:nullable}),
};
export const responseSchema=obj({reply:{type:'string'},proposal:{anyOf:[{type:'null'},obj({intent:{type:'string'},operations:{type:'array',items:{anyOf:Object.entries(values).map(([kind,value])=>obj({action:{type:'string',enum:['create','update']},kind:{type:'string',enum:[kind]},targetId:nullable,expectedRevision:{type:['integer','null']},values:value}))}}})]}});
export class ProviderError extends Error {constructor(publicCode:string){super(publicCode);this.name='ProviderError';}}
function dict(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
/** Fixed HTTPS origins; credentials are header-only. Transport errors never echo provider payloads. */
export class HostedAIProvider implements AIProvider {
 readonly execution='hosted' as const;
 private provider:HostedProviderName;private model:string;private key:string;private request:typeof fetch;
 constructor(provider:HostedProviderName,model:string,key:string,request:typeof fetch=fetch){
  if(!['openai','gemini'].includes(provider)||! /^[a-zA-Z0-9._:-]{1,120}$/.test(model)||!key.trim()||key.length>4096)throw new ProviderError('Check your provider, model and API key.');
  this.provider=provider;this.model=model;this.key=key;this.request=request.bind(globalThis);
 }
 async *generate({prompt,signal}:{prompt:string;signal:AbortSignal}){
  const openai=this.provider==='openai';
  const url=openai?'https://api.openai.com/v1/responses':'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(this.model)+':generateContent';
  const body=openai?{model:this.model,store:false,input:prompt,text:{format:{type:'json_schema',name:'omnivae_response',strict:true,schema:responseSchema}}}:{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:responseSchema}};
  let response:Response;
  try{response=await this.request(url,{method:'POST',headers:{'Content-Type':'application/json',...(openai?{Authorization:'Bearer '+this.key}:{'x-goog-api-key':this.key})},body:JSON.stringify(body),signal,redirect:'error',credentials:'omit',cache:'no-store'});}catch{throw new ProviderError(signal.aborted?'Request cancelled.':'Could not connect to the provider. Your message is kept.');}
  if(!response.ok)throw new ProviderError(response.status===401||response.status===403?'Provider rejected the key or permissions.':response.status===429?'Provider usage limit reached. Retry later.':response.status>=500?'Provider is temporarily unavailable.':'Provider rejected this model or request configuration.');
  let data:Record<string,unknown>;try{data=dict(await response.json());}catch{throw new ProviderError('Provider returned an unreadable response.');}
  if(signal.aborted)throw new ProviderError('Request cancelled.');
  let output:string;
  if(openai){if(data.status!=='completed')throw new ProviderError('Provider did not finish the response. Retry or shorten the request.');output=array(data.output).filter(item=>dict(item).type==='message').flatMap(item=>array(dict(item).content)).filter(item=>dict(item).type==='output_text').map(item=>String(dict(item).text??'')).join('');}
  else {const candidate=dict(array(data.candidates)[0]);if(candidate.finishReason!=='STOP')throw new ProviderError('Provider did not finish the response or declined the request.');output=array(dict(candidate.content).parts).filter(item=>!dict(item).thought).map(item=>typeof dict(item).text==='string'?dict(item).text:'').join('');}
  if(!output||output.length>500000)throw new ProviderError('Provider returned an empty or oversized response.');yield output;
 }
}
