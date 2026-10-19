import {useState} from 'react';
import type {ProfilePreferences} from '../../../packages/domain/local-profile';
export default function AppearanceSettings({preferences,busy,hasImage,onPreferences,onImage}:{preferences:ProfilePreferences;busy:boolean;hasImage:boolean;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>;onImage:(file:File|null)=>Promise<void>}){
  const [accent,setAccent]=useState(preferences.accentColor);
  const [background,setBackground]=useState(preferences.backgroundColor);
  return <div className="custom-appearance">
    <h3>Colors and background</h3>
    <form onSubmit={event=>{event.preventDefault();void onPreferences({accentColor:accent,backgroundColor:background});}}>
      <label>Accent hex color<input value={accent} onChange={event=>setAccent(event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} placeholder="#264c40" spellCheck={false} required disabled={busy}/></label>
      <label>Background hex color<input value={background} onChange={event=>setBackground(event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} placeholder="#f3f1e9" spellCheck={false} required disabled={busy}/></label>
      <p className="note">Use # followed by six hex digits. Accent colors apply to selected navigation and primary buttons; text contrast adjusts automatically.</p>
      <button type="submit" disabled={busy}>Save colors</button>
      <button type="button" disabled={busy} onClick={()=>{setAccent('#264c40');setBackground('#f3f1e9');void onPreferences({accentColor:'#264c40',backgroundColor:'#f3f1e9'});}}>Reset colors</button>
    </form>
    <label>Background image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void onImage(file);}}/></label>
    <p className="note">Choose a local PNG, JPEG or WebP, up to 12 MB. Images are resized, encrypted and saved only in this profile. Choosing another image replaces the current one.</p>
    {hasImage&&<button type="button" disabled={busy} onClick={()=>void onImage(null)}>Remove background image</button>}
    {preferences.theme==='contrast'&&<p className="note">High contrast uses its own accessible colors and hides your image. Your custom appearance returns in Glass or Solid mode.</p>}
  </div>;
}
