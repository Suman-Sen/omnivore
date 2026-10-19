import CalendarSkin from './calendar-skin';
import type {CSSProperties} from 'react';

import {accentForeground} from '../../../packages/domain/appearance';

import SectionAppearanceEditor from './section-appearance';

import HistoryWorkspace from './history-workspace';

import {useEffect,useMemo,useState} from 'react';

import type {LocalProfile,ProfilePreferences,Appearance} from '../../../packages/domain/local-profile';

import type {ProfileService} from '../../../packages/application/profile-service';

import {SectionService} from '../../../packages/application/section-service';

import {sectionKeys,sectionNames} from '../../../packages/domain/sections';

import type {SectionKey,SectionRecord,CustomSection,SectionEntry} from '../../../packages/domain/sections';

import PlanningWorkspace from './planning-workspace';

import LifeWorkspace from './life-workspace';

import AIWorkspace from './ai-workspace';

import AppearanceSettings from './appearance-settings';

import SectionManager from './section-manager';

import CustomSectionWorkspace from './custom-section';

type PlanningScreen='overview'|'task'|'goal'|'note'|'event'|'journal';

const planningKeys=['overview','event','task','goal','note','journal'];

const glyphs:Record<SectionKey,string>={history:'H',overview:'◫',event:'▦',task:'☑',goal:'◎',note:'▤',journal:'✎',study:'▥',workouts:'↗',health:'♡',ai:'✧'};

export default function AppWorkspace({profiles,token,profile,preferences,hasImage,busy,error,notice,onPreferences,onImage,onLock,onDeleteProfile}:{profiles:ProfileService;token:string;profile:LocalProfile;preferences:ProfilePreferences;hasImage:boolean;busy:boolean;error:string;notice:string;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>;onImage:(file:File|null)=>Promise<void>;onLock:()=>void;onDeleteProfile:(confirmation:string)=>Promise<void>}){

 const [deleteName,setDeleteName]=useState('');

 const [planningRevision,setPlanningRevision]=useState(0);

 const [view,setView]=useState('event'),[planningScreen,setPlanningScreen]=useState<PlanningScreen>('event'),[items,setItems]=useState<SectionRecord[]>([]),[sectionError,setSectionError]=useState('');

 const service=useMemo(()=>new SectionService(profiles),[profiles]);

 useEffect(()=>{let alive=true;const refresh=()=>{service.list(token).then(rows=>{if(alive)setItems(rows);}).catch(()=>{if(alive)setSectionError('Sections could not load. Lock and unlock to retry.');});};refresh();const unsubscribe=profiles.subscribe(refresh);return()=>{alive=false;unsubscribe();};},[service,profiles,token]);

 const sections=items.filter((r):r is CustomSection=>r.kind==='custom_section');

 const known=[...sectionKeys,...sections.map(s=>'custom:'+s.id)];

 const order=[...preferences.sectionOrder.filter(key=>known.includes(key)),...known.filter(key=>!preferences.sectionOrder.includes(key))];

 const visible=order.filter(key=>key==='journal'?preferences.journalEnabled:['study','workouts','health'].includes(key)?preferences.enabledModules.includes(key as 'study'|'workouts'|'health'):key.startsWith('custom:')?sections.some(s=>'custom:'+s.id===key&&!s.archived):true);

 const selected=sections.find(s=>'custom:'+s.id===view&&!s.archived);

 const title=view==='settings'?'Settings':view==='manage'?'Your sections':selected?.title??preferences.sectionLabels[view as SectionKey]??sectionNames[view as SectionKey]??'Your space';

 function navigate(next:string){setView(next);if(planningKeys.includes(next)){if(next!==planningScreen)setPlanningRevision(n=>n+1);setPlanningScreen(next as PlanningScreen);}window.scrollTo({top:0,behavior:'instant'});}

 async function checkedPreferences(patch:Partial<ProfilePreferences>){if(busy)throw new Error('Wait for the current save to finish.');await onPreferences(patch);const actual=await profiles.getPreferences(token);if(Object.entries(patch).some(([key,value])=>JSON.stringify(actual[key as keyof ProfilePreferences])!==JSON.stringify(value)))throw new Error('Section settings were not saved. Please retry.');}

 const sectionStyle=preferences.sectionStyles[view];

 const surface=sectionStyle?.surfaceColor??'#f7faf5',alpha=1-(sectionStyle?.transparency??18)/100;

 const accent=sectionStyle?.accentColor??preferences.accentColor;

 const variables={'--accent':accent,'--accent-text':accentForeground(accent),'--section-ink':accentForeground(surface),'--section-solid':surface,'--surface':`rgba(${parseInt(surface.slice(1,3),16)},${parseInt(surface.slice(3,5),16)},${parseInt(surface.slice(5,7),16)},${alpha})`} as CSSProperties;

 return <><a className="skip" href="#main">Skip to content</a><aside className="sidebar panel">

  <a className="brand" href="#main" onClick={()=>navigate('overview')}><span className="mark">O</span>Omnivae</a>

  <div className="profile-badge"><span className="status-dot"/><span data-testid="active-profile">{profile.displayName}</span><small>YOUR PERSONAL SPACE</small></div>

  <button className="add-section" onClick={()=>navigate('manage')}>＋ Add section</button>

  <nav aria-label="Sections"><p className="nav-caption">MY SPACE</p>{visible.map(key=>{const custom=sections.find(s=>'custom:'+s.id===key),name=custom?.title??preferences.sectionLabels[key as SectionKey]??sectionNames[key as SectionKey];return <button key={key} className="side-link" aria-current={view===key?'page':undefined} onClick={()=>navigate(key)}><span aria-hidden="true" className="nav-icon">{custom?'◇':glyphs[key as SectionKey]}</span>{name}</button>;})}</nav>

  

  <div className="sidebar-foot"><button className="side-link" aria-current={view==='settings'?'page':undefined} onClick={()=>navigate('settings')}>Settings</button><button onClick={onLock}>Lock / switch profile</button><p><span className="status-dot"/>Saved on this device</p></div>

 </aside><main id="main" className="app-main" style={preferences.theme==='contrast'?undefined:variables} data-section={view}><header className="page-header"><div><p className="eyebrow">YOUR LIFE, AT YOUR PACE</p><h1>{title}</h1></div><div className="header-actions"><button onClick={()=>navigate('manage')}>Manage sections</button><button className="mobile-lock" onClick={onLock}>Lock / switch profile</button></div></header>

 <SectionAppearanceEditor key={view} sectionId={view} title={title} preferences={preferences} busy={busy} onPreferences={onPreferences}/>

 {view==='history'&&<HistoryWorkspace profiles={profiles} token={token} timezone={profile.timezone} onAI={()=>navigate('ai')}/>}

 {error&&<p className="message error" role="alert">{error}</p>}{sectionError&&<p className="message error" role="alert">{sectionError}</p>}<p role="status" aria-label="Profile status" aria-live="polite">{busy?'Working…':notice}</p>

 <CalendarSkin preferences={preferences} onPreferences={checkedPreferences} profiles={profiles} token={token} active={view==='event'}><div className="primary-content" hidden={!planningKeys.includes(view)}><PlanningWorkspace key={token+planningRevision} profiles={profiles} token={token} profile={profile} preferences={preferences} onPreferences={onPreferences} preferencesBusy={busy} selectedScreen={planningScreen} onNavigate={next=>{setPlanningScreen(next);setView(next);}}/></div></CalendarSkin>

 {(['study','workouts','health'] as const).includes(view as 'study')&&<div className="primary-content"><LifeWorkspace key={view} profiles={profiles} token={token} profile={profile} preferences={preferences} onPreferences={onPreferences} preferencesBusy={busy} selectedModule={view as 'study'|'workouts'|'health'}/></div>}

 <div className="primary-content" hidden={view!=='ai'}><AIWorkspace profiles={profiles} token={token} profile={profile} preferences={preferences} onPreferences={onPreferences}/></div>

 {selected&&<CustomSectionWorkspace key={selected.id} section={selected} entries={items.filter((r):r is SectionEntry=>r.kind==='section_entry'&&r.sectionId===selected.id)} service={service} token={token} onManage={()=>navigate('manage')}/>}

 {view==='manage'&&<SectionManager preferences={preferences} onPreferences={checkedPreferences} sections={sections} service={service} token={token} order={order}/>}

 <section className="planning settings-page" id="appearance" hidden={view!=='settings'} aria-label="Profile settings"><div className="settings-intro"><h2>Make it feel like you</h2><p>Personalize your space. Your choices belong only to this profile.</p></div><div className="settings-grid"><div><h3>Surface style</h3><fieldset disabled={busy}><legend>Appearance</legend>{[['glass','Glass','Soft light and translucent surfaces'],['solid','Solid','Clean surfaces with reduced effects'],['contrast','High contrast','Clear edges and stronger contrast']].map(([id,label,detail])=><label className="theme-choice" key={id}><input type="radio" name="theme" checked={preferences.theme===id} onChange={()=>void onPreferences({theme:id as Appearance})}/><span><strong>{label}</strong><small>{detail}</small></span></label>)}</fieldset><h3>Calendar preferences</h3><label>Week starts on<select disabled={busy} value={preferences.weekStartsOn} onChange={e=>void onPreferences({weekStartsOn:Number(e.target.value)})}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,index)=><option key={day} value={index}>{day}</option>)}</select></label><label>Time format<select disabled={busy} value={preferences.timeFormat} onChange={e=>void onPreferences({timeFormat:e.target.value as '12h'|'24h'})}><option value="24h">24 hour</option><option value="12h">12 hour</option></select></label><p className="note">Timezone: {profile.timezone}. Your profile locks when the app goes into the background.</p></div><AppearanceSettings preferences={preferences} busy={busy} hasImage={hasImage} onPreferences={onPreferences} onImage={onImage}/></div><details className="delete-profile"><summary>Delete profile</summary><h3>Delete {profile.displayName} from this device</h3><p>This permanently removes this profile’s records, history, saved AI keys, settings and background image. Other profiles are kept. There is no undo or backup/restore feature yet.</p><form onSubmit={e=>{e.preventDefault();void onDeleteProfile(deleteName);}}><label>Type profile name to delete<input required value={deleteName} onChange={e=>setDeleteName(e.target.value)} disabled={busy} autoComplete="off"/></label><button type="submit" disabled={busy||deleteName!==profile.displayName}>Permanently delete this profile</button></form></details></section>

 <footer>Private by default. Built around your life.</footer></main></>;

}

