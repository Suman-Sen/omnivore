import {validateBackground} from '../domain/appearance';
/** Decode locally, resize and re-encode to strip metadata and active content. */
export async function prepareBackground(file:File):Promise<string>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Choose a PNG, JPEG or WebP image up to 12 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;
    try{await image.decode();}catch{throw new Error('This image could not be opened. Choose another image.');}
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40_000_000)throw new Error('Choose an image smaller than 40 megapixels.');
    const scale=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('Image processing unavailable. Please retry.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/webp',0.8);validateBackground(result);return result;
  }finally{URL.revokeObjectURL(url);}
}
