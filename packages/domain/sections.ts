import type {BaseRecord} from './planning.ts';
export const sectionKeys=['overview','event','task','goal','note','journal','study','workouts','health','ai','history'] as const;
export type SectionKey=typeof sectionKeys[number];
export const sectionNames:Record<SectionKey,string>={overview:'Dashboard',event:'Calendar',task:'Tasks',goal:'Goals',note:'Notes',journal:'Journal',study:'Study',workouts:'Workouts',health:'Health',ai:'Ask AI',history:'History'};
export interface CustomSection extends Omit<BaseRecord,'kind'> {kind:'custom_section';payloadVersion:1;title:string;description:string;archived:boolean;}
export interface SectionEntry extends Omit<BaseRecord,'kind'> {kind:'section_entry';payloadVersion:1;sectionId:string;title:string;content:string;completed:boolean;}
export type SectionRecord=CustomSection|SectionEntry;
export function sectionTitle(value:string):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>60)throw new Error('Use a section name between 1 and 60 characters.');
  return value.trim();
}
