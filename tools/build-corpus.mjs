#!/usr/bin/env node
/** Create a local balanced or unbalanced JSONL training file from .txt/.md files.
 * No HTTP requests. Matching names across directories share the topic group.
 * Usage: node tools/build-corpus.mjs ./human ./ai ./training.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
const [humanDir, aiDir, output='training.jsonl']=process.argv.slice(2);
if(!humanDir||!aiDir){console.error('Usage: node tools/build-corpus.mjs HUMAN_FOLDER AI_FOLDER OUTPUT.jsonl');process.exit(1);}
function read(directory,label){
 const absolute=path.resolve(directory);
 if(!fs.existsSync(absolute)||!fs.statSync(absolute).isDirectory())throw Error(`Folder not found: ${directory}`);
 return fs.readdirSync(absolute,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(txt|md|markdown)$/i.test(e.name)).map(entry=>{
  const content=fs.readFileSync(path.join(absolute,entry.name),'utf8').trim();
  return {text:content,label,group:entry.name.replace(/\.(txt|md|markdown)$/i,'').replace(/[_ -](ai|human|gpt|chatgpt)$/i,'')};
 }).filter(x=>x.text.length>=160&&(x.text.match(/[\p{L}\p{N}]+/gu)||[]).length>=35);
}
try {
 const data=[...read(humanDir,'human'),...read(aiDir,'ai')];
 if (!data.length) throw Error('No valid samples (minimum 35 words) found.');
 fs.writeFileSync(path.resolve(output),data.map(row=>JSON.stringify(row)).join('\n')+'\n','utf8');
 console.log(`Saved ${data.length} samples (${data.filter(x=>x.label==='human').length} human / ${data.filter(x=>x.label==='ai').length} AI) to ${path.resolve(output)}`);
} catch (e){console.error(e.message);process.exitCode=1;}
