import {useState} from 'react';
import type {ProfilePreferences} from '../../../packages/domain/local-profile';
import type {CustomSection,SectionKey} from '../../../packages/domain/sections';
import {sectionNames,sectionTitle} from '../../../packages/domain/sections';
import type {SectionService} from '../../../packages/application/section-service';
export default function SectionManager({preferences,onPreferences,sections,service,token,order}:{preferences:ProfilePreferences;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>;sections:CustomSection[];service:SectionService;token:string;order:string[]}){
 const [type,setType]=useState('custom'),[title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [editing,setEditing]=useState<CustomSection|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function run(action:()=>Promise<unknown>){if(busy)return;setBusy(true);setError('');setNotice('');try{await action();setNotice('Sections updated.');}catch(e){setError(e instanceof Error?e.message:'Could not update sections.');}finally{setBusy(false);}}
 async function move(key:string,direction:number){const index=order.indexOf(key),next=[...order];if(index+direction<0||index+direction>=next.length)return;[next[index],next[index+direction]]=[next[index+direction],next[index]];await onPreferences({sectionOrder:next});}
 return <section className="planning section-manager" aria-label="Manage sections">
  <p>Add the areas that matter to you. Rename or reorder your navigation below. Hiding a section keeps its records.</p>
  {error&&<p role="alert" className="message error">{error}</p>}<p role="status" aria-label="Section status">{busy?'Saving…':notice}</p>
  <form className="section-create panel" onSubmit={event=>{event.preventDefault();void run(async()=>{
   if(type==='custom'){await service.saveSection(token,{title,description,archived:editing?.archived??false},editing?.id,editing?.revision);}
   else {const key=type as 'study'|'workouts'|'health';await onPreferences({enabledModules:[...new Set([...preferences.enabledModules,key])],sectionLabels:{...preferences.sectionLabels,[key]:sectionTitle(title||sectionNames[key])}});}
   setTitle('');setDescription('');setEditing(null);setType('custom');
  });}}><h2>{editing?'Edit section':'Add a section'}</h2><fieldset disabled={busy}>
   {!editing&&<label>Section type<select value={type} onChange={e=>{setType(e.target.value);setTitle(e.target.value==='custom'?'':sectionNames[e.target.value as SectionKey]);}}><option value="custom">Custom section — notes and checklist</option>{(['study','workouts','health'] as const).map(key=><option key={key} value={key} disabled={preferences.enabledModules.includes(key)}>{sectionNames[key]}{preferences.enabledModules.includes(key)?' (already added)':''}</option>)}</select></label>}
   <label>Section name<input required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder="For example: Reading, Projects or Travel"/></label>
   {type==='custom'&&<label>Section description<textarea maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What would you like to keep here?"/></label>}
   <div className="actions"><button className="primary" type="submit">{editing?'Save section':'Create section'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setTitle('');setDescription('');}}>Cancel section edit</button>}</div>
  </fieldset></form>
  <h2>Your sections</h2><div className="section-list">{order.map((key,index)=>{
   const custom=sections.find(s=>'custom:'+s.id===key);if(key.startsWith('custom:')&&!custom)return null;
   const builtin=key as SectionKey,name=custom?.title??preferences.sectionLabels[builtin]??sectionNames[builtin];
   const optional=['study','workouts','health'].includes(key),shown=custom?!custom.archived:optional?preferences.enabledModules.includes(key as 'study'|'workouts'|'health'):key==='journal'?preferences.journalEnabled:true;
   return <article className="section-row panel" key={key}><div><strong>{name}</strong><small>{custom?'Custom notes and checklist':sectionNames[builtin]} · {shown?'Shown':'Hidden'}</small></div>
    <div className="actions"><button disabled={busy||index===0} aria-label={`Move ${name} up`} onClick={()=>void run(()=>move(key,-1))}>↑</button><button disabled={busy||index===order.length-1} aria-label={`Move ${name} down`} onClick={()=>void run(()=>move(key,1))}>↓</button>
    {custom?<><button disabled={busy} aria-label={`Edit section ${name}`} onClick={()=>{setEditing(custom);setType('custom');setTitle(custom.title);setDescription(custom.description);}}>Edit</button><button disabled={busy} onClick={()=>void run(()=>service.saveSection(token,{...custom,archived:!custom.archived},custom.id,custom.revision))}>{shown?'Hide':'Show'} {name}</button></>:<>
    {(optional||key==='journal')&&<button disabled={busy} onClick={()=>void run(()=>onPreferences(key==='journal'?{journalEnabled:!shown}:{enabledModules:shown?preferences.enabledModules.filter(m=>m!==key):[...preferences.enabledModules,key as 'study'|'workouts'|'health']}))}>{shown?'Hide':'Show'} {name}</button>}
    <form className="rename-section" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void run(()=>onPreferences({sectionLabels:{...preferences.sectionLabels,[key]:sectionTitle(String(form.get('name')))}}));}}><label>Rename {sectionNames[builtin]}<input name="name" key={name} defaultValue={name} required maxLength={60} disabled={busy}/></label><button type="submit" disabled={busy}>Save name for {sectionNames[builtin]}</button></form>
    </>}</div></article>;
  })}</div>
 </section>;
}
