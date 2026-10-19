import {validateBackground} from './appearance.ts';
export interface CalendarGallery {version:1;selectedId:string|null;activeId:string|null;images:{id:string;name:string;data:string}[];}
export function validateGallery(value:CalendarGallery){
 if(value.version!==1||!Array.isArray(value.images)||value.images.length>6)throw new Error('Keep up to six calendar images. Delete one before uploading another.');
 const ids=new Set<string>();for(const image of value.images){if(!/^[0-9a-f-]{36}$/.test(image.id)||ids.has(image.id)||!image.name||image.name.length>100)throw new Error('Invalid gallery image.');ids.add(image.id);validateBackground(image.data);}
 if((value.selectedId!==null&&!ids.has(value.selectedId))||(value.activeId!==null&&!ids.has(value.activeId)))throw new Error('Image is no longer available.');
}
