/** Bounded inert raster asset. Transport/decoding belongs in the platform adapter. */
export function validateBackground(value:string):void {
  if(typeof value!=='string'||value.length>1_400_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('Choose a PNG, JPEG or WebP image smaller than 1 MB after resizing.');
}
export function accentForeground(hex:string):string {
  if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Invalid color.');
  const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2]>0.179?'#000000':'#ffffff';
}
