import type {AIProvider} from './ports.ts';
export interface OfflineTransport {generate(input:{prompt:string;requestId:string}):Promise<{text:string}>;cancel(input:{requestId:string}):Promise<void>;}
/** No network transport and no credential access; cancellation suppresses late results. */
export class OfflineAIProvider implements AIProvider {
 readonly execution='on_device' as const;
 private transport:OfflineTransport;
 constructor(transport:OfflineTransport){this.transport=transport;}
 async *generate({prompt,signal}:{prompt:string;signal:AbortSignal}){
  if(signal.aborted)throw new Error('Request cancelled.');
  if(prompt.length>16000)throw new Error('Shorten the conversation or planning range for the offline model.');
  const requestId=crypto.randomUUID();
  const cancel=()=>{void this.transport.cancel({requestId}).catch(()=>{});};
  signal.addEventListener('abort',cancel,{once:true});
  try{
   const result=await this.transport.generate({prompt,requestId});
   if(signal.aborted)throw new Error('Request cancelled.');
   if(!result.text||result.text.length>500000)throw new Error('Offline model returned an empty or oversized response.');
   // Remove an outer code fence only; invalid JSON still fails closed in the application service.
   yield result.text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/,'$1');
  }finally{signal.removeEventListener('abort',cancel);}
 }
}
