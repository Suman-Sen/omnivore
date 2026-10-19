import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const xcode=require('xcode');
const project=xcode.project('synthetic.pbxproj');
project.hash={project:{objects:{}}};
const id=project.generateUuid();
if(!/^[A-F0-9]{24}$/.test(id)) throw new Error('Xcode UUID compatibility regression');
console.log('PASS: patched UUID preserves xcode build-tool ID generation');
