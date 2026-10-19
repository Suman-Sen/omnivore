'use client';
import {useEffect,useRef} from 'react';
export default function VoiceOverlay({state,local,canTalk,hasDraft,transcript,error,onClose,onTalk,onSend,onStop}:{state:'listening'|'thinking'|'speaking'|'ready';local:boolean;canTalk:boolean;hasDraft:boolean;transcript:string;error:string;onClose:()=>void;onTalk:()=>void;onSend:()=>void;onStop:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),lastTap=useRef(0);
 useEffect(()=>{const element=dialog.current;const previous=document.activeElement as HTMLElement|null;element?.showModal();return()=>{element?.close();previous?.focus();};},[]);
 const label={listening:'Listening to you',thinking:local?'Thinking on this tablet':'Waiting for your provider',speaking:'Speaking',ready:'Ready when you are'}[state];
 return <dialog ref={dialog} className="voice-overlay" aria-label="Omnivae voice assistant" onCancel={e=>{e.preventDefault();onClose();}} onPointerUp={e=>{if((e.target as HTMLElement).closest('button,input,textarea'))return;const now=Date.now();if(now-lastTap.current<350){lastTap.current=0;onClose();}else lastTap.current=now;}}>
  <div className="voice-top"><span>OMNIVAE <small>VOICE</small></span><button autoFocus onClick={onClose} aria-label="Close voice view">Close ×</button></div>
  <div className="voice-stage" data-state={state}><div className="voice-orbit" aria-hidden="true"><span/><span/><span/><svg viewBox="0 0 100 100"><path d="M50 15 80 32v36L50 85 20 68V32Z"/><circle cx="50" cy="50" r="17"/><path d="M50 15v18m30-1L65 41m15 27-15-9M50 85V67M20 68l15-9M20 32l15 9"/></svg></div><p className="voice-eyebrow">YOUR PERSONAL ASSISTANT</p><h2 aria-live="polite">{label}</h2><div className="voice-wave" aria-hidden="true">{Array.from({length:17},(_,i)=><i key={i} style={{animationDelay:`${i*0.075}s`}}/>)}</div></div>
  <div className="voice-transcript"><p>{transcript||'Tap Talk and tell me what you would like to plan.'}</p>{error&&<p role="alert">{error}</p>}</div>
  <div className="voice-controls"><button onClick={onTalk} disabled={!canTalk||state==='listening'||state==='thinking'}>Talk</button><button onClick={onSend} disabled={!hasDraft||state==='thinking'||state==='listening'}>Send message</button><button onClick={onStop}>Stop</button></div><p className="voice-hint">Double-tap the background to return to chat · Review schedule proposals before applying</p>
 </dialog>;
}
