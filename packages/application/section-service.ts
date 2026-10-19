import type {ProfileService} from './profile-service.ts';
import type {CustomSection,SectionEntry,SectionRecord} from '../domain/sections.ts';
import {sectionTitle} from '../domain/sections.ts';
export class SectionService {
  private profiles:ProfileService;
  constructor(profiles:ProfileService){this.profiles=profiles;}
  async list(token:string):Promise<SectionRecord[]>{return (await this.profiles.readRecords(token)).filter((r):r is SectionRecord=>(r.kind==='custom_section'||r.kind==='section_entry')&&!r.deletedAt);}
  async saveSection(token:string,input:{title:string;description:string;archived:boolean},id?:string,revision?:number):Promise<CustomSection>{
    const profile=this.profiles.getProfile(token),all=await this.profiles.readRecords(token);
    const prior=id?all.find(r=>r.id===id&&r.kind==='custom_section'&&!r.deletedAt):undefined;
    if(id&&(!prior||prior.revision!==revision))throw new Error('Section unavailable or changed. Reload before saving.');
    const title=sectionTitle(input.title);
    if(typeof input.description!=='string'||input.description.length>2000||typeof input.archived!=='boolean')throw new Error('Keep the description within 2,000 characters.');
    if(all.some(r=>r.kind==='custom_section'&&!r.deletedAt&&r.id!==id&&r.title.toLocaleLowerCase()===title.toLocaleLowerCase()))throw new Error('A section with that name already exists.');
    const now=new Date().toISOString();
    const record:CustomSection={...input,title,kind:'custom_section',payloadVersion:1,id:id??crypto.randomUUID(),profileId:profile.id,revision:(prior?.revision??0)+1,createdAt:prior?.createdAt??now,updatedAt:now};
    await this.profiles.commitRecords(token,[record],all);return record;
  }
  async saveEntry(token:string,sectionId:string,input:{title:string;content:string;completed:boolean},id?:string,revision?:number):Promise<SectionEntry>{
    const profile=this.profiles.getProfile(token),all=await this.profiles.readRecords(token);
    if(!all.some(r=>r.kind==='custom_section'&&r.id===sectionId&&!r.archived&&!r.deletedAt))throw new Error('Section unavailable.');
    const prior=id?all.find(r=>r.kind==='section_entry'&&r.id===id&&r.sectionId===sectionId&&!r.deletedAt):undefined;
    if(id&&(!prior||prior.revision!==revision))throw new Error('Entry unavailable or changed. Reload before saving.');
    if(typeof input.title!=='string'||!input.title.trim()||input.title.length>300||typeof input.content!=='string'||input.content.length>20000||typeof input.completed!=='boolean')throw new Error('Add a title (up to 300 characters) and content (up to 20,000 characters).');
    const now=new Date().toISOString();
    const record:SectionEntry={...input,title:input.title.trim(),kind:'section_entry',payloadVersion:1,sectionId,id:id??crypto.randomUUID(),profileId:profile.id,revision:(prior?.revision??0)+1,createdAt:prior?.createdAt??now,updatedAt:now};
    await this.profiles.commitRecords(token,[record],all);return record;
  }
  async removeEntry(token:string,id:string,revision:number){
    const all=await this.profiles.readRecords(token),prior=all.find(r=>r.kind==='section_entry'&&r.id===id&&!r.deletedAt);
    if(!prior||prior.revision!==revision)throw new Error('Entry unavailable or changed.');
    const now=new Date().toISOString();await this.profiles.commitRecords(token,[{...prior,deletedAt:now,updatedAt:now,revision:revision+1}],all);
  }
}
