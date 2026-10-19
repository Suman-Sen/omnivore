import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sources = ['rules.md','prd.md','architecture.md','schema.md','phases.md','testing.md','memory.md','docs/delivery-contract.md'];
const sections = [];
for (const file of sources) {
  const text = new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(file));
  let fence = false;
  let current;
  for (const [index,line] of text.split(/\r?\n/).entries()) {
    if (line.startsWith('```')) fence = !fence;
    if (!fence && /^#{1,6} /.test(line)) {
      current = {id:`${file.replace(/[^a-z0-9]/gi,'-')}-L${index+1}`,source:file,line:index+1,title:line.replace(/^#+ /,''),text:[],status:'not_started',implementation:[],testIds:[],evidence:[],mappingReview:'pending'};
      sections.push(current);
    }
    if (current) current.text.push(line);
  }
  if (fence) throw new Error(`${file}: unbalanced code fences`);
  if (!text.trim()) throw new Error(`${file}: empty document`);
}
const target = 'docs/requirements/source-inventory.json';
const output = sections.map(section=>({...section,text:section.text.join('\n').trim(),sourceHash:createHash('sha256').update(section.text.join('\n').trim()).digest('hex')}));
if (process.argv.includes('--check')) {
  const previous = JSON.parse(readFileSync(target,'utf8'));
  for (const section of output) {
    const match = previous.find(row=>row.id===section.id);
    if (!match || match.sourceHash!==section.sourceHash) throw new Error(`Inventory out of date: ${section.id}`);
  }
  if (previous.length!==output.length) throw new Error('Inventory contains removed sections');
  console.log(`PASS: ${sources.length} UTF-8 source files, balanced fences, ${output.length} source sections current.`);
} else {
  const previous = existsSync(target) ? JSON.parse(readFileSync(target,'utf8')) : [];
  const merged=output.map(row=>{
    const old=previous.find(item=>item.id===row.id && item.sourceHash===row.sourceHash);
    return old ? {...row,status:old.status,implementation:old.implementation,testIds:old.testIds,evidence:old.evidence,mappingReview:old.mappingReview} : row;
  });
  mkdirSync('docs/requirements',{recursive:true});
  writeFileSync(target,JSON.stringify(merged,null,2)+'\n');
  console.log(`Indexed ${output.length} sections. Mapping review remains explicit; indexing is not implementation coverage.`);
}
