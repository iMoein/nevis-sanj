import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bundle=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');const ctx={console};vm.createContext(ctx);
vm.runInContext(bundle.slice(0,bundle.indexOf('var NevisApp;')),ctx);
const engine=ctx.NevisEngine;
test('no model never returns 0%, even for long obviously AI text',()=>{
 const p=engine.publishedPredict('در دنیای امروز، هوش مصنوعی تحول آفرین است. '.repeat(20),null);
 assert.equal(p.score,null);assert.equal(p.verdict,'unavailable');
});
test('model input validates schema and dimensions, rejects forged NaN',()=>{
 const m={schema:2,language:'fa',dimensions:2048,numeric_dimensions:8,weights:Array(2056).fill(0),bias:0,metrics:{}};
 assert.equal(engine.isPublishedModel(m),true);m.weights[4]=NaN;assert.equal(engine.isPublishedModel(m),false);
});
test('public application hides training UI and API credentials',()=>{
 const src=fs.readFileSync(path.join(root,'src/app.tsx'),'utf8');
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(!src.includes('trainLocal('));assert.ok(!src.includes('/api/train'));assert.ok(!html.includes('admin'));
});
