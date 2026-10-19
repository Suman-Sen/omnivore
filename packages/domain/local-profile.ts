import {sectionKeys,sectionTitle} from './sections.ts';
import type {SectionKey} from './sections.ts';
export type Appearance = 'glass' | 'solid' | 'contrast';
export interface LocalProfile {
  id: string;
  displayName: string;
  timezone: string;
  status: 'active' | 'archived' | 'deleted';
  profileType: 'standard' | 'guest';
  createdAt: string;
  updatedAt: string;
}
export interface SectionAppearance {accentColor:string;surfaceColor:string;transparency:number;}
export interface ProfilePreferences {
  immersiveVoice:boolean;
  aiConnection:{provider:'openai'|'gemini'|'offline';model:string};
  calendarDisplay:{imageTransparency:number;font:'system'|'serif'|'rounded'|'mono';fontColor:string};
  dashboardCharts: Partial<Record<'tasks'|'calendar'|'goals'|'journal','number'|'bar'|'pie'|'donut'>>;
  sectionStyles: Record<string,SectionAppearance>;
  theme: Appearance;
  appearanceVersion: 2;
  navigationVersion: 1;
  sectionLabels: Partial<Record<SectionKey,string>>;
  sectionOrder: string[];
  accentColor: string;
  backgroundColor: string;
  weekStartsOn: number;
  timeFormat: '12h' | '24h';
  defaultCalendarView: 'day' | 'week' | 'month';
  reflectionEnabled: boolean;
  reflectionLocalTime: string;
  aiMemoryEnabled: boolean;
  aiHistoryEnabled: boolean;
  healthAIAccess: 'off' | 'per_request';
  dashboardWidgets: ('tasks'|'calendar'|'goals'|'journal')[];
  journalEnabled: boolean;
  enabledModules: ('study'|'workouts'|'health')[];
  updatedAt: string;
}
export interface EncryptedValue { version: 1; iv: string; ciphertext: string; }
export interface ProfileAuth {
  profileId: string;
  mode: 'password';
  salt: string;
  iterations: number;
  wrappedKey: EncryptedValue;
  failedAttempts: number;
  lockedUntil: number;
}
export interface StoredPreferences { profileId: string; value: EncryptedValue; }
export const defaultPreferences: Readonly<ProfilePreferences> = Object.freeze({
  immersiveVoice:true,aiConnection:{provider:'gemini' as const,model:'gemini-3.5-flash-lite'}, calendarDisplay:{imageTransparency:15,font:'system' as const,fontColor:'#443345'}, dashboardCharts:{}, sectionStyles:{}, navigationVersion:1, sectionLabels:{}, sectionOrder:[...sectionKeys], appearanceVersion:2, accentColor:'#264c40', backgroundColor:'#f3f1e9', theme:'glass', weekStartsOn:1, timeFormat:'24h', defaultCalendarView:'week',
  reflectionEnabled:false, reflectionLocalTime:'21:00', aiMemoryEnabled:false,
  aiHistoryEnabled:true, healthAIAccess:'off', dashboardWidgets:['tasks','calendar','goals','journal'] as ProfilePreferences['dashboardWidgets'], journalEnabled:true, enabledModules:['study','workouts','health'] as ProfilePreferences['enabledModules'], updatedAt:'',
});
/** v1 ciphertext is unchanged during storage migration; add new defaults after decryption. */
export function normalizePreferences(value:Partial<ProfilePreferences>):ProfilePreferences {
  const result={...defaultPreferences,...value};
  if(typeof result.immersiveVoice!=='boolean')throw new Error('Invalid voice appearance setting.');
  if(!result.aiConnection||!['openai','gemini','offline'].includes(result.aiConnection.provider)||! /^[a-zA-Z0-9._:-]{1,120}$/.test(result.aiConnection.model))throw new Error('Invalid AI connection settings.');
  if(!result.calendarDisplay||!Number.isInteger(result.calendarDisplay.imageTransparency)||result.calendarDisplay.imageTransparency<0||result.calendarDisplay.imageTransparency>100||!['system','serif','rounded','mono'].includes(result.calendarDisplay.font)||!/^#[0-9a-f]{6}$/i.test(result.calendarDisplay.fontColor))throw new Error('Invalid calendar display.');
  if(!result.dashboardCharts||typeof result.dashboardCharts!=='object'||Array.isArray(result.dashboardCharts)||Object.entries(result.dashboardCharts).some(([key,value])=>!['tasks','calendar','goals','journal'].includes(key)||!['number','bar','pie','donut'].includes(value)))throw new Error('Invalid chart settings.');
  if(!result.sectionStyles||typeof result.sectionStyles!=='object'||Array.isArray(result.sectionStyles)||Object.keys(result.sectionStyles).length>104)throw new Error('Invalid section colors.');
  result.sectionStyles=Object.fromEntries(Object.entries(result.sectionStyles).map(([key,style])=>{
    if(![...sectionKeys,'settings','manage'].includes(key as SectionKey)&&!/^custom:[0-9a-f-]{36}$/.test(key))throw new Error('Invalid section.');
    if(!style||!/^#[0-9a-f]{6}$/i.test(style.accentColor)||!/^#[0-9a-f]{6}$/i.test(style.surfaceColor)||!Number.isInteger(style.transparency)||style.transparency<0||style.transparency>100)throw new Error('Invalid section colors or transparency.');
    return [key,{accentColor:style.accentColor.toLowerCase(),surfaceColor:style.surfaceColor.toLowerCase(),transparency:style.transparency}];
  }));
  if(result.navigationVersion!==1||!result.sectionLabels||typeof result.sectionLabels!=='object'||Array.isArray(result.sectionLabels)||Object.entries(result.sectionLabels).some(([key,label])=>!sectionKeys.includes(key as SectionKey)||sectionTitle(label)!==label))throw new Error('Invalid section names.');
  if(!Array.isArray(result.sectionOrder)||result.sectionOrder.length>100||new Set(result.sectionOrder).size!==result.sectionOrder.length||result.sectionOrder.some(key=>!sectionKeys.includes(key as SectionKey)&&!/^custom:[0-9a-f-]{36}$/.test(key)))throw new Error('Invalid section order.');
  if(result.appearanceVersion!==2 || !/^#[0-9a-f]{6}$/i.test(result.accentColor) || !/^#[0-9a-f]{6}$/i.test(result.backgroundColor))throw new Error('Use a six-digit hex color such as #264c40.');
  result.accentColor=result.accentColor.toLowerCase();result.backgroundColor=result.backgroundColor.toLowerCase();
  if(!Array.isArray(result.enabledModules)||result.enabledModules.some(module=>!['study','workouts','health'].includes(module))||new Set(result.enabledModules).size!==result.enabledModules.length)throw new Error('Invalid module settings.');
  if(!Array.isArray(result.dashboardWidgets)||result.dashboardWidgets.some(widget=>!['tasks','calendar','goals','journal'].includes(widget))||new Set(result.dashboardWidgets).size!==result.dashboardWidgets.length||typeof result.journalEnabled!=='boolean')throw new Error('Invalid dashboard settings.');
  if(!['glass','solid','contrast'].includes(result.theme) ||
    !Number.isInteger(result.weekStartsOn) || result.weekStartsOn<0 || result.weekStartsOn>6 ||
    !['12h','24h'].includes(result.timeFormat) || !['day','week','month'].includes(result.defaultCalendarView) ||
    !['off','per_request'].includes(result.healthAIAccess) ||
    typeof result.reflectionEnabled!=='boolean' || typeof result.aiMemoryEnabled!=='boolean' ||
    typeof result.aiHistoryEnabled!=='boolean' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(result.reflectionLocalTime)) {
    throw new Error('Invalid profile settings.');
  }
  return result;
}

