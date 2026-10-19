import type {SectionRecord} from './sections.ts';
import type {AIRecord} from './ai-proposal.ts';
import type {BaseRecord,PlanningRecord} from './planning.ts';
export interface LifeBase extends Omit<BaseRecord,'kind'> {title:string;payloadVersion:1;}
export interface StudyTopic extends LifeBase {kind:'study_topic';description:string;goalId?:string;status:'active'|'archived';}
export interface StudySession extends LifeBase {kind:'study_session';topicId?:string;goalId?:string;plannedStartAt?:string;plannedEndAt?:string;actualStartAt?:string;actualEndAt?:string;notes:string;sourceType:'manual';}
export interface WorkoutSet {id:string;reps:number;loadValue:number;loadUnit:'kg'|'lb';durationSeconds:number;completed:boolean;}
export interface WorkoutExercise {id:string;name:string;sets:WorkoutSet[];}
export interface Workout extends LifeBase {kind:'workout';startedAt:string;endedAt?:string;notes:string;sourceType:'manual';exercises:WorkoutExercise[];}
export const healthMetrics={
  steps:{label:'Steps',unit:'count',aggregation:'sum'},heart_rate:{label:'Heart rate',unit:'bpm',aggregation:'average'},
  sleep:{label:'Sleep',unit:'hours',aggregation:'sum'},water:{label:'Water',unit:'mL',aggregation:'sum'},
  weight:{label:'Weight',unit:'kg',aggregation:'latest'},oxygen_saturation:{label:'Oxygen saturation',unit:'%',aggregation:'average'},
  temperature:{label:'Temperature',unit:'C',aggregation:'latest'},energy:{label:'Active energy',unit:'kcal',aggregation:'sum'},
} as const;
export type HealthMetric=keyof typeof healthMetrics;
export interface HealthSample extends LifeBase {kind:'health_sample';metric:HealthMetric;value:number;unit:string;startAt:string;endAt?:string;timezone:string;sourceType:'manual';sourceId:string;notes:string;}
export type LifeRecord=StudyTopic|StudySession|Workout|HealthSample;
export type LifeInput<T extends LifeRecord=LifeRecord>=T extends LifeRecord?Omit<T,keyof LifeBase|'sourceId'>:never;
export type PersonalRecord=PlanningRecord|LifeRecord|AIRecord|SectionRecord;
export function isLifeRecord(record:PersonalRecord):record is LifeRecord{return ['study_topic','study_session','workout','health_sample'].includes(record.kind);}
export function isPlanningRecord(record:PersonalRecord):record is PlanningRecord{return ['task','goal','note','event','milestone','task_event','journal'].includes(record.kind);}
function validInstant(value:string){return /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));}
function range(start:string|undefined,end:string|undefined,allowOpen=false){
  if(!start&&!end)return;
  if(!start||!validInstant(start)||end&&(!validInstant(end)||Date.parse(end)<=Date.parse(start))||!end&&!allowOpen)throw new Error('Use a valid start and a later end time.');
}
export function validateLife(record:LifeRecord,records:PersonalRecord[]):void{
  if(record.payloadVersion!==1||!record.title.trim()||record.title.length>300)throw new Error('Enter a title of up to 300 characters.');
  const link=(id:string|undefined,kind:string)=>{if(id&&!records.some(r=>r.id===id&&r.kind===kind&&r.profileId===record.profileId&&!r.deletedAt))throw new Error('The linked record is unavailable in this profile.');};
  if('goalId' in record)link(record.goalId,'goal');
  if(record.kind==='study_topic'&&!['active','archived'].includes(record.status))throw new Error('Invalid topic status.');
  if(record.kind==='study_session'){link(record.topicId,'study_topic');range(record.plannedStartAt,record.plannedEndAt);range(record.actualStartAt,record.actualEndAt);}
  if(record.kind==='workout'){
    range(record.startedAt,record.endedAt,true);if(!record.startedAt)throw new Error('Set a workout start time.');
    const ids=new Set<string>();
    for(const exercise of record.exercises){
      if(!exercise.name.trim()||ids.has(exercise.id))throw new Error('Enter unique, named exercises.');ids.add(exercise.id);
      for(const set of exercise.sets){
        if(ids.has(set.id)||![set.reps,set.loadValue,set.durationSeconds].every(v=>Number.isFinite(v)&&v>=0)||!Number.isInteger(set.reps)||!Number.isInteger(set.durationSeconds)||!['kg','lb'].includes(set.loadUnit)||typeof set.completed!=='boolean')throw new Error('Check workout set values and units.');
        ids.add(set.id);
      }
    }
  }
  if(record.kind==='health_sample'){
    const metric=healthMetrics[record.metric];
    if(!metric||metric.unit!==record.unit||!Number.isFinite(record.value)||record.value<0||record.metric==='oxygen_saturation'&&record.value>100||record.metric==='steps'&&!Number.isInteger(record.value))throw new Error('Check the metric, value and compatible unit.');
    if(!validInstant(record.startAt))throw new Error('Set a valid sample time.');if(record.endAt)range(record.startAt,record.endAt);
    if(record.sourceType!=='manual'||record.sourceId!==`manual:${record.profileId}`)throw new Error('Invalid health source.');
    try{new Intl.DateTimeFormat('en',{timeZone:record.timezone}).format();}catch{throw new Error('Invalid timezone.');}
  }
}
export function studySeconds(session:StudySession):number{return session.actualStartAt&&session.actualEndAt?(Date.parse(session.actualEndAt)-Date.parse(session.actualStartAt))/1000:0;}
export function workoutVolumeKg(workout:Workout):number{return workout.exercises.flatMap(e=>e.sets).filter(s=>s.completed).reduce((total,set)=>total+set.reps*set.loadValue*(set.loadUnit==='lb'?0.45359237:1),0);}
export function summarizeHealth(samples:HealthSample[],profileId:string,metric:HealthMetric,startAt:string,endAt:string){
  const filtered=samples.filter(s=>s.profileId===profileId&&!s.deletedAt&&s.metric===metric&&Date.parse(s.startAt)>=Date.parse(startAt)&&Date.parse(s.startAt)<Date.parse(endAt)).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
  if(!filtered.length)return null;
  const values=filtered.map(s=>s.value);const mode=healthMetrics[metric].aggregation;
  const value=mode==='latest'?values.at(-1)!:values.reduce((a,b)=>a+b,0)/(mode==='average'?values.length:1);
  return {value,unit:healthMetrics[metric].unit,count:filtered.length,sourceIds:[...new Set(filtered.map(s=>s.sourceId))]};
}
