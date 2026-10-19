'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import VoiceOverlay from './voice-overlay';

import type {FormEvent} from 'react';

import type {ProfileService} from '../../../packages/application/profile-service';

import type {LocalProfile,ProfilePreferences} from '../../../packages/domain/local-profile';

import type {AIConversation,AIProposal} from '../../../packages/domain/ai-proposal';

import {AIChatService} from '../../../packages/application/ai-chat-service';

import {ProposalService} from '../../../packages/application/proposal-service';

import {HostedAIProvider} from '../../../packages/ai/hosted-provider';

import {OfflineAIProvider} from '../../../packages/ai/offline-provider';

import {offlineNative,offlineVoice,hasNativeAI} from '../../../packages/platform/offline-ai';

import type {ModelStatus,VoiceStatus} from '../../../packages/platform/offline-ai';

type ProviderName='openai'|'gemini'|'offline';

import {CredentialVault} from '../../../packages/platform/credential-vault';

import {localDateAt} from '../../../packages/domain/planning';

import {planningEnd} from '../../../packages/domain/calendar-view';

export default function AIWorkspace({profiles,token,profile,preferences,onPreferences}:{profiles:ProfileService;token:string;profile:LocalProfile;preferences:ProfilePreferences;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>}){

 const chat=useMemo(()=>new AIChatService(profiles),[profiles]),proposals=useMemo(()=>new ProposalService(profiles),[profiles]),vault=useMemo(()=>new CredentialVault(profiles),[profiles]);

 const [provider,setProvider]=useState<ProviderName>(preferences.aiConnection.provider),[model,setModel]=useState(preferences.aiConnection.model),[key,setKey]=useState(''),[message,setMessage]=useState('');

 const [localModel,setLocalModel]=useState<ModelStatus|null>(null),[voiceStatus,setVoiceStatus]=useState<VoiceStatus|null>(null),[listening,setListening]=useState(false),[speakReplies,setSpeakReplies]=useState(false);

 const [voiceView,setVoiceView]=useState(false),[speaking,setSpeaking]=useState(false);
 const mounted=useRef(true);

 useEffect(()=>{mounted.current=true;if(hasNativeAI()){void offlineNative.status().then(setLocalModel).catch(()=>{});void offlineVoice.status().then(setVoiceStatus).catch(()=>{});}return()=>{mounted.current=false;if(hasNativeAI())void offlineVoice.stop().catch(()=>{});};},[]);

 const [history,setHistory]=useState<AIConversation[]>([]),[conversation,setConversation]=useState<AIConversation|undefined>(),[pending,setPending]=useState<AIProposal[]>([]),[revise,setRevise]=useState('');

 const [start,setStart]=useState(localDateAt(new Date().toISOString(),profile.timezone)),[horizon,setHorizon]=useState<'day'|'week'|'month'>('day'),[mode,setMode]=useState<'chat'|'schedule'>('schedule'),[include,setInclude]=useState(false),[disclosure,setDisclosure]=useState(false);

 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');const controller=useRef<AbortController|null>(null);

 useEffect(()=>{let alive=true;const refresh=()=>{Promise.all([chat.list(token),proposals.list(token)]).then(([chats,plans])=>{if(alive){setHistory(chats);setPending(plans.filter(p=>p.status==='pending_approval'));}}).catch(()=>{if(alive)setError('Could not load local AI history.');});};refresh();const unsubscribe=profiles.subscribe(refresh);return()=>{alive=false;unsubscribe();controller.current?.abort();};},[chat,proposals,profiles,token]);

 function startVoice(){if(preferences.immersiveVoice)setVoiceView(true);setListening(true);setError('');void offlineVoice.listen().then(result=>{if(mounted.current)setMessage(previous=>previous+(previous?'\n':'')+result.text);}).catch(e=>{if(mounted.current)setError(e instanceof Error?e.message:'Offline voice failed.');}).finally(()=>{if(mounted.current)setListening(false);});}
 useEffect(()=>{if(!hasNativeAI())return;const listener=offlineVoice.addListener('voiceState',state=>{if(mounted.current)setSpeaking(state.speaking);});return()=>{void listener.then(handle=>handle.remove()).catch(()=>{});};},[]);
 async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Request failed. Your input is kept.');}finally{setBusy(false);}}

 async function send(e:FormEvent){e.preventDefault();await run(async()=>{

  if(provider!=='offline'&&!disclosure)throw new Error('Confirm external processing before sending.');

  const secret=provider==='offline'?'':key.trim()||await vault.read(token,provider);if(provider!=='offline'&&!secret)throw new Error('Enter your API key in AI connection settings.');

  const abort=new AbortController();controller.current=abort;

  const end=planningEnd(start,horizon);

  await onPreferences({aiConnection:{provider,model:model.trim()}});

  const requestMessage=mode==='schedule'?`Create a practical ${horizon} schedule from ${start} to ${end} (exclusive). Return a structured proposal of scheduled tasks/events with exact start/end times. Respect existing commitments, allow breaks, do not mark work completed, and explain conflicts. If essential constraints are missing, ask a focused question. User request: ${message}`:message;

  const result=await chat.send(token,{message:requestMessage,conversation,startDate:start,endDate:end,includePlanning:include,previousProposalId:revise||undefined},provider==='offline'?new OfflineAIProvider(offlineNative):new HostedAIProvider(provider,model.trim(),secret!),{provider,model:model.trim()},abort.signal);

  if(speakReplies&&hasNativeAI()){const reply=result.conversation.messages.at(-1)?.text;if(reply)void offlineVoice.speak({text:reply.slice(0,4000)}).catch(()=>{if(mounted.current)setError('Reply received, but offline speech output was unavailable.');});}

  setConversation(result.conversation);setMessage('');setKey('');setRevise('');setNotice(result.proposal?'Plan ready for review. No planning changes have been applied.':'Reply received.');

 });}

 return <section id="ask-ai" className="planning" aria-label="Ask AI">{voiceView&&<VoiceOverlay state={listening?'listening':busy?'thinking':speaking?'speaking':'ready'} local={provider==='offline'} canTalk={hasNativeAI()} hasDraft={!!message.trim()} transcript={message||conversation?.messages.at(-1)?.text||''} error={error} onClose={()=>{setVoiceView(false);if(hasNativeAI())void offlineVoice.stop().catch(()=>{});}} onTalk={startVoice} onSend={()=>{(document.getElementById('ai-message-form') as HTMLFormElement|null)?.requestSubmit();}} onStop={()=>{controller.current?.abort();if(hasNativeAI())void offlineVoice.stop().catch(()=>{});}}/>}<h2>Ask AI</h2><p>Talk through goals or plan a day, week or month. Review every proposed change before it is applied.</p>

  <details className="panel"><summary>AI connection settings</summary><fieldset disabled={busy}><label>AI provider<select value={provider} onChange={e=>{setProvider(e.target.value as ProviderName);setModel(e.target.value==='offline'?'local-model':e.target.value==='gemini'?'gemini-3.5-flash-lite':'');setKey('');setDisclosure(false);void onPreferences({aiConnection:{provider:e.target.value as ProviderName,model:e.target.value==='offline'?'local-model':e.target.value==='gemini'?'gemini-3.5-flash-lite':'gpt-4.1-mini'}}).catch(()=>setError('Could not save provider preference.'));}}><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="offline">Offline AI (this tablet)</option></select></label>{provider!=='offline'?<><label>Model ID<input value={model} onChange={e=>setModel(e.target.value)} placeholder="Model available to your API account" autoComplete="off"/></label><label>API key<input type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off"/></label><div className="actions"><button type="button" onClick={()=>void run(async()=>{await vault.save(token,provider==='gemini'?'gemini':'openai',key.trim());setKey('');setNotice('API key saved in this profileâ€™s encrypted credential vault.');})}>Save API key</button><button type="button" onClick={()=>void run(async()=>{await vault.remove(token,provider==='gemini'?'gemini':'openai');setKey('');setNotice('Saved API key removed.');})}>Remove saved API key</button></div><p>Provider usage may incur charges on your API account. Keys stay separate from planning data. </p></>:<div><p>Runs on this tablet. No API key, PC or internet is used for generation. Model weights are shared; chats and schedules stay private to each profile.</p><p>{localModel?.available?`Imported: ${localModel.name} (${Math.round(localModel.bytes/1024/1024)} MB)`:'No local model imported.'}</p><button type="button" disabled={!hasNativeAI()} onClick={()=>void run(async()=>{const status=await offlineNative.importModel();setLocalModel(status);setNotice('Model imported. Unlock again if the file picker locked your profile.');})}>Import offline model</button><p>Use Gemma 3 1B IT Q4 (.gguf) or INT4 (.litertlm). Download once, then import from tablet storage. Keep several GB free for the model and its working memory. Model compatibility and speed depend on your device.</p>{!hasNativeAI()&&<p>On-device inference requires the Android app.</p>}</div>}<label className="check"><input type="checkbox" checked={preferences.aiHistoryEnabled} onChange={e=>void onPreferences({aiHistoryEnabled:e.target.checked})}/>Save chat history locally</label><p>Turning history off stops saving new messages. Existing chats remain until deleted.</p></fieldset></details>

  {error&&<p role="alert" className="message error">{error}</p>}<p role="status" aria-label="AI status">{busy?'Workingâ€¦':notice}</p>

  <div className="toolbar"><label>Conversation<select disabled={busy} value={conversation?.id??''} onChange={e=>{setConversation(history.find(c=>c.id===e.target.value));setRevise('');}}><option value="">New conversation</option>{history.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button disabled={busy} onClick={()=>{setConversation(undefined);setRevise('');}}>New chat</button>{conversation&&<><button disabled={busy} onClick={()=>void run(async()=>{await chat.remove(token,conversation.id);setConversation(undefined);setNotice('Conversation deleted.');})}>Delete this chat</button><button onClick={()=>{const blob=new Blob([JSON.stringify(conversation,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='omnivae-chat.json';a.click();URL.revokeObjectURL(url);}}>Export this chat</button></>}</div>

  <details><summary>Clear all saved chats</summary><p>This removes all chat messages in this profile. Planning records and approval history are kept.</p><button disabled={busy} onClick={()=>void run(async()=>{await chat.remove(token);setConversation(undefined);setNotice('All chats deleted.');})}>Confirm delete all chats</button></details>

  <div className="chat-messages" aria-label="Conversation messages">{conversation?.messages.map(m=><article className="panel" key={m.id}><strong>{m.role==='user'?'You':'AI'}</strong><p className="preserve">{m.text}</p></article>)}</div>

  <div className="panel"><h3>Offline voice</h3><label className="check"><input type="checkbox" checked={preferences.immersiveVoice} onChange={e=>void onPreferences({immersiveVoice:e.target.checked})}/>Full-screen voice effects</label><button onClick={()=>setVoiceView(true)}>Open voice view</button><p>English push-to-talk. Review the transcription, then send. No cloud speech fallback.</p><p>Microphone: {voiceStatus?.recognition?'on-device engine available':'offline engine unavailable or not checked'} · Speaker: {voiceStatus?.synthesis?'offline voice available':'offline voice unavailable or not checked'}</p><div className="actions"><button disabled={busy||listening||!hasNativeAI()} onClick={startVoice}>{listening?'Listening…':'Talk'}</button><button disabled={!hasNativeAI()} onClick={()=>void offlineVoice.stop().catch(()=>{})}>Stop voice</button><button disabled={!hasNativeAI()} onClick={()=>void offlineVoice.status().then(setVoiceStatus).catch(()=>setError('Could not check offline speech.'))}>Check voice</button></div><label className="check"><input type="checkbox" checked={speakReplies} onChange={e=>setSpeakReplies(e.target.checked)}/>Read replies aloud using an offline voice</label></div><form id="ai-message-form" onSubmit={send}><fieldset disabled={busy}><label>AI action<select value={mode} onChange={e=>setMode(e.target.value as 'chat'|'schedule')}><option value="schedule">Create my schedule</option><option value="chat">Chat and ask questions</option></select></label><div className="toolbar"><label>Plan from<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Planning horizon<select value={horizon} onChange={e=>setHorizon(e.target.value as 'day'|'week'|'month')}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label></div><label className="check"><input type="checkbox" checked={include} onChange={e=>setInclude(e.target.checked)}/>Include my active goals and tasks/calendar in this range</label><p>Journal, notes and health readings are excluded.</p>{provider!=='offline'&&<label className="check"><input type="checkbox" checked={disclosure} onChange={e=>setDisclosure(e.target.checked)}/>Send this conversation and selected context to {provider==='openai'?'OpenAI':'Google Gemini'} for processing</label>}<label>Your message<textarea required rows={4} maxLength={16000} value={message} onChange={e=>setMessage(e.target.value)}/></label>{revise&&<p>Revising a pending plan. Its previous approval will become invalid.</p>}<button type="submit" className="primary">{mode==='schedule'?'Generate schedule':'Send to AI'}</button></fieldset>{busy&&<button type="button" onClick={()=>controller.current?.abort()}>Cancel request</button>}</form>

  {pending.map(p=><article className="panel proposal" key={p.id}><h3>{p.intent}</h3><p>{p.provider} Â· {p.model} Â· Version {p.proposalVersion} Â· Expires {new Date(p.expiresAt).toLocaleString()}</p><div className="schedule-scroll"><table className="day-schedule"><caption>Review proposed calendar changes before applying</caption><thead><tr><th>Action</th><th>Title</th><th>Start / due</th><th>End</th></tr></thead><tbody>{[...p.operations].sort((a,b)=>{const time=(r:typeof a.record)=>r.kind==='task'?r.scheduledStartAt??r.dueAt??r.dueLocalDate??'':r.kind==='event'?r.startAt??r.startLocalDate??'':r.targetAt??r.targetDate??'';return time(a.record).localeCompare(time(b.record));}).map(op=>{const r=op.record,format=(v:string|undefined)=>v?(v.includes('T')?new Date(v).toLocaleString(undefined,{timeZone:profile.timezone}):v):'Not set';return <tr key={r.id}><td>{op.action} {r.kind}</td><th scope="row">{r.title}</th><td>{format(r.kind==='task'?r.scheduledStartAt??r.dueAt??r.dueLocalDate:r.kind==='event'?r.startAt??r.startLocalDate:r.targetAt??r.targetDate)}</td><td>{format(r.kind==='task'?r.scheduledEndAt:r.kind==='event'?r.endAt??r.endLocalDate:undefined)}</td></tr>;})}</tbody></table><p className="note">Times shown in {profile.timezone}. All-day end dates are exclusive.</p></div>{p.warnings.map((w,i)=><p key={i}>{w}</p>)}<ol>{p.operations.map(op=><li key={op.record.id}><strong>{op.action==='create'?'Create':'Update'} {op.record.kind}: {op.record.title}</strong><details><summary>Review all fields{op.before?' before and after':''}</summary>{op.before&&<><h4>Before</h4><pre>{JSON.stringify(op.before,null,2)}</pre></>}<h4>After</h4><pre>{JSON.stringify(op.record,null,2)}</pre></details></li>)}</ol><p>{p.events.length} task history entry/entries will also be recorded.</p><details><summary>Review history entries</summary><pre>{JSON.stringify(p.events,null,2)}</pre></details><div className="actions"><button className="primary" disabled={busy} onClick={()=>void run(async()=>{await proposals.approve(token,{id:p.id,version:p.proposalVersion,hash:p.planHash,confirmed:true});setNotice('Approved plan saved. Calendar and tasks updated.');})}>Apply schedule ({p.operations.length} changes)</button><button disabled={busy} onClick={()=>{setRevise(p.id);setMessage('Revise this plan: '+p.intent+'\n');}}>Request changes</button><button disabled={busy} onClick={()=>void run(async()=>{await proposals.reject(token,p.id,p.proposalVersion);setNotice('Proposal rejected. Planning records unchanged.');})}>Reject plan</button></div></article>)}

 </section>;

}

