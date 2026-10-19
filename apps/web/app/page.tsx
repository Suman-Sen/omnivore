'use client';
import ForgetProfile from './forget-profile';
import AppWorkspace from './app-workspace';
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,FormEvent} from 'react';
import {Capacitor} from '@capacitor/core';
import {accentForeground} from '../../../packages/domain/appearance';
import {prepareBackground} from '../../../packages/platform/background-image';
import {openProfiles} from '../../../packages/platform/runtime';
import {ProfileError} from '../../../packages/application/profile-service';
import type {ProfileService} from '../../../packages/application/profile-service';
import type {LocalProfile,ProfilePreferences} from '../../../packages/domain/local-profile';

export default function Home(){
  const service=useRef<ProfileService|null>(null);
  const operation=useRef(0);
  const [profiles,setProfiles]=useState<LocalProfile[]>([]);
  const [active,setActive]=useState<{token:string;profile:LocalProfile;preferences:ProfilePreferences;background:string|null;service:ProfileService}|null>(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false);
  const [selected,setSelected]=useState('');
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [timezone,setTimezone]=useState('Asia/Kolkata');
  function lock(){
    operation.current++;
    service.current?.lock();setActive(null);setPassword('');setConfirmation('');setError('');setNotice('');setBusy(false);
  }
  useEffect(()=>{
    let alive=true;
    if(!Capacitor.isNativePlatform()&&'serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>{if(alive)setNotice('Offline web caching is unavailable. Your local records are preserved; keep this tab open while offline.');});
    }
    openProfiles().then(async value=>{
      const list=await value.listProfiles();
      if(!alive)return;
      service.current=value;setProfiles(list);setCreating(list.length===0);setSelected(list[0]?.id??'');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);setReady(true);
    }).catch(()=>{if(alive)setError('Local storage could not open. Close and reopen Omnivae to retry. Your existing data has not been cleared.');});
    const hidden=()=>{if(document.visibilityState==='hidden')lock();};
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',lock);
    return()=>{alive=false;service.current?.lock();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',lock);};
  },[]);
  async function authenticate(event:FormEvent){
    event.preventDefault();if(!service.current||busy)return;
    setError('');setNotice('');
    if(creating&&password!==confirmation){setError('Passwords do not match.');return;}
    const epoch=++operation.current;setBusy(true);
    try{
      let id=selected;
      if(creating){
        const profile=await service.current.create(name,password,timezone);
        id=profile.id;
        const list=await service.current.listProfiles();
        if(epoch!==operation.current)return;
        setProfiles(list);setSelected(id);setCreating(false);setNotice('Profile created.');
      }
      if(epoch!==operation.current)return;
      const token=await service.current.unlock(id,password);
      const preferences=await service.current.getPreferences(token);
      const background=await service.current.getBackground(token);
      if(epoch!==operation.current)return;
      setActive({service:service.current,token,profile:service.current.getProfile(token),preferences,background});setPassword('');setConfirmation('');setNotice('');
    }catch(e){if(epoch===operation.current)setError(e instanceof ProfileError?e.message:'Unable to open this profile. Retry without clearing app data.');}
    finally{if(epoch===operation.current)setBusy(false);}
  }
  async function preferencesChange(patch:Partial<ProfilePreferences>){
    if(!active||!service.current||busy)return;
    const current=active;const epoch=operation.current;setBusy(true);setError('');setNotice('');
    setActive({...current,preferences:{...current.preferences,...patch}});
    try{
      await service.current.setPreferences(current.token,{...current.preferences,...patch});
      const preferences=await service.current.getPreferences(current.token);
      if(epoch!==operation.current)return;
      setActive({...current,preferences});setNotice('Settings saved on this device.');
    }catch(e){if(epoch===operation.current){setActive(current);setError(e instanceof ProfileError?e.message:'Settings were not saved. Please retry.');}}
    finally{if(epoch===operation.current)setBusy(false);}
  }
  async function backgroundChange(file:File|null){
    if(!active||busy)return;
    const current=active,epoch=operation.current;setBusy(true);setError('');setNotice('');
    try{
      const background=file?await prepareBackground(file):null;
      if(epoch!==operation.current)return;
      await current.service.setBackground(current.token,background);
      if(epoch!==operation.current)return;
      setActive({...current,background});setNotice(background?'Background image saved on this device.':'Background image removed.');
    }catch(e){if(epoch===operation.current)setError(e instanceof Error?e.message:'Image was not saved. Please retry.');}
    finally{if(epoch===operation.current)setBusy(false);}
  }
  async function forgetProfile(name:string,confirmed:boolean){
    if(!service.current||active||busy)return;
    setBusy(true);setError('');setNotice('');
    try{await service.current.forgetProfile(selected,name,confirmed);const remaining=await service.current.listProfiles();setProfiles(remaining);setSelected(remaining[0]?.id??'');setCreating(!remaining.length);setPassword('');setNotice('Profile and its local data forgotten.');}
    catch(e){setError(e instanceof Error?e.message:'Profile could not be forgotten. Please retry.');}
    finally{setBusy(false);}
  }
  async function deleteProfile(confirmation:string){
    if(!active||busy)return;
    const current=active;setBusy(true);setError('');
    try{await current.service.deleteProfile(current.token,confirmation);lock();const remaining=await current.service.listProfiles();setProfiles(remaining);setSelected(remaining[0]?.id??'');setCreating(!remaining.length);setNotice('Profile and its local data deleted.');}
    catch(e){setError(e instanceof Error?e.message:'Profile deletion failed. Please retry.');}
    finally{setBusy(false);}
  }
  const appearanceStyle=active?{'--accent':active.preferences.accentColor,'--accent-text':accentForeground(active.preferences.accentColor),'--custom-background':active.preferences.backgroundColor,'--background-image':active.background?`url("${active.background}")`:'radial-gradient(ellipse at 83% 10%,#d9e7bd66 0,transparent 42%),radial-gradient(ellipse at 38% 80%,#ccded966 0,transparent 47%)'} as CSSProperties:undefined;
  if(active)return <div style={appearanceStyle} className="workspace authenticated" data-theme={active.preferences.theme}><AppWorkspace key={active.token} profiles={active.service} token={active.token} profile={active.profile} preferences={active.preferences} hasImage={!!active.background} busy={busy} error={error} notice={notice} onPreferences={preferencesChange} onImage={backgroundChange} onLock={lock} onDeleteProfile={deleteProfile}/></div>;
  return <div className="workspace locked" data-theme="glass"><main id="main"><a className="brand" href="#main"><span className="mark">O</span>Omnivae</a><section className="welcome"><p className="eyebrow">PLAN · THINK · REFLECT · GROW</p><h1>Your life, your space.</h1><p>Create or unlock a private local profile to begin.</p></section>
  {error&&<p className="message error" role="alert">{error}</p>}<p role="status" aria-label="Profile status">{busy?'Working…':notice}</p>
  <section className="panel form-panel">
        <h2>{creating?'Create local profile':'Unlock your profile'}</h2>
        {!ready&&!error&&<p>Opening local storage…</p>}
        {ready&&<form onSubmit={authenticate}>
          {creating?<><label>Profile name<input autoComplete="nickname" value={name} maxLength={80} onChange={e=>setName(e.target.value)} required disabled={busy}/></label><label>Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} required disabled={busy}/></label></>:<label>Profile<select value={selected} onChange={e=>{setSelected(e.target.value);setPassword('');setError('');}} disabled={busy} required>{profiles.map(p=><option value={p.id} key={p.id}>{p.displayName}</option>)}</select></label>}
          <label>Password<input type="password" autoComplete={creating?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={creating?12:undefined} maxLength={256} required disabled={busy}/></label>
          {creating&&<><label>Confirm password<input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy}/></label><p className="note">Use at least 12 characters. Keep your password safe: this local profile has no email-based password recovery. Data stays on this device until you remove app data or uninstall. Guest access is not available in this build.</p></>}
          <button className="primary" type="submit" disabled={busy}>{creating?'Create profile':'Unlock profile'}</button>
          {(profiles.length>0||!creating)&&<button type="button" disabled={busy} onClick={()=>{setCreating(!creating);setPassword('');setConfirmation('');setError('');}}>{creating?'Back to profile chooser':'Create another profile'}</button>}
        </form>}
        {ready&&!creating&&profiles.find(p=>p.id===selected)&&<ForgetProfile key={selected} profile={profiles.find(p=>p.id===selected)!} busy={busy} onForget={forgetProfile}/>}
      </section><footer>Private by default. Built around your life.</footer></main></div>;
}
