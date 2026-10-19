import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root='apps/web/out';
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);}
const files=walk(root).filter(path=>!path.endsWith('sw.js')&&!path.endsWith('.map'));
const version=createHash('sha256');for(const file of files)version.update(readFileSync(file));
const cache='omnivae-shell-'+version.digest('hex').slice(0,16);
const urls=files.map(file=>'/'+relative(root,file).replaceAll('\\','/'));
urls.push('/');
writeFileSync(join(root,'sw.js'),`
const CACHE=${JSON.stringify(cache)};
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('omnivae-shell-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.includes(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});
`);
console.log(`Offline shell generated: ${urls.length} static assets, ${cache}`);
