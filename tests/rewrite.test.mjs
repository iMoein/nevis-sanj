import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=process.cwd();
const bundle=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const ctx={console};vm.createContext(ctx);
vm.runInContext(bundle.slice(0,bundle.indexOf('var NevisApp;')),ctx);
const engine=ctx.NevisRewrite;
test('rewrite engine is independent and defaults to professional, 45% and unknown origin',()=>{
 const result=engine.rewrite('این موضوع از اهمیت بالایی برخوردار است و به منظور بررسی آن از روش جدیدی بهره‌گیری از داده‌ها انجام می‌شود.');
 assert.equal(result.style,'professional-natural');
 assert.equal(result.strength,45);
 assert.equal(result.provenance.originalOrigin,'unknown');
 assert.equal(result.provenance.aiModelUsed,false);
 assert.equal(result.provenance.authorshipClaim,false);
 assert.ok(result.changes.length>=1);
 assert.equal(result.review.ok,true);
});
test('strength zero preserves every character and 100 changes every eligible phrase',()=>{
 const original='این گزارش به منظور بررسی داده‌ها می‌باشد. متن در خصوص فروش می‌باشد.';
 assert.equal(engine.rewrite(original,0).text,original);
 const all=engine.rewrite(original,100);
 assert.equal(all.candidates,4);
 assert.equal(all.changes.length,4);
 assert.match(all.text,/برای بررسی/);
 assert.match(all.text,/درباره فروش/);
 assert.equal(all.review.ok,true);
});
test('quotes, URLs, emails and backticked text stay verbatim',()=>{
 const original='او گفت «به منظور بررسی» و سپس نوشت `می‌باشد`. در خصوص گزارش صحبت شد. https://example.com/به-منظور';
 const r=engine.rewrite(original,100,'ai');
 assert.match(r.text,/«به منظور بررسی»/);
 assert.match(r.text,/`می‌باشد`/);
 assert.match(r.text,/https:\/\/example\.com\/به-منظور/);
 assert.match(r.text,/درباره گزارش/);
 assert.equal(r.provenance.originalOrigin,'ai');
});
test('negated verbs are not silently turned affirmative',()=>{
 const original='این وضعیت نمی‌باشد ولی گزارش می‌باشد.';
 const result=engine.rewrite(original,100);
 assert.ok(result.text.includes('نمی‌باشد'));
 assert.ok(result.text.includes('گزارش است'));
 assert.equal(result.review.ok,true);
});
test('a manual change to numbers or negation is flagged for review',()=>{
 const a='فروش ۱۲ واحد می‌باشد و عدد 27 تغییر نکرده است.';
 assert.equal(engine.review(a,'فروش ۱۳ واحد است و عدد 27 تغییر نکرده است.').ok,false);
 assert.ok(engine.review(a,'فروش ۱۲ واحد است و عدد 27 تغییر کرده است.').warnings.length>0);
 assert.equal(engine.review(a,'فروش ۱۲ واحد است و عدد 27 تغییر نکرده است.').ok,true);
});
test('rewriting input is local-only and user review is mandatory in UI',()=>{
 const app=fs.readFileSync(path.join(root,'src/app.tsx'),'utf8');
 assert.match(app,/NevisRewrite\.rewrite/);
 assert.match(app,/rewriteConfirmed/);
 assert.match(app,/منشأ نوشته را انسانی نمی‌کند/);
 assert.match(app,/id="natural-rewrite"/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'src/engine/rewrite.ts'),'utf8'),/fetch\(|XMLHttpRequest|publishedPredict\(/);
});
test('invalid strength is rejected',()=>{
 assert.throws(()=>engine.rewrite('متن فارسی',-1),{name:'RangeError'});
 assert.throws(()=>engine.rewrite('متن فارسی',101),{name:'RangeError'});
});

test('Persian verb half-spaces are normalized without changing negation',()=>{
 const original='در این حالت، او نمی شود و این کار می شود.';
 const result=engine.rewrite(original,100);
 assert.match(result.text,/نمی‌شود/);
 assert.match(result.text,/می‌شود/);
 assert.equal(result.review.ok,true);
});
test('outside preserved strings Latin names and amounts cannot be modified manually',()=>{
 const original='در خصوص AI و GPT-4 در سال ۱۴۰۵ بررسی می‌باشد.';
 assert.equal(engine.review(original,original.replace('GPT-4','GPT-5')).ok,false);
 assert.equal(engine.review(original,original.replace('۱۴۰۵','۱۴۰۶')).ok,false);
});
test('deterministic proposal and provenance remain stable',()=>{
 const source='به منظور توسعه نرم‌افزار، این کار می‌باشد و در خصوص کیفیت آن نیاز به بررسی وجود دارد.';
 assert.equal(engine.rewrite(source,45,'ai').text,engine.rewrite(source,45,'ai').text);
 assert.equal(engine.rewrite(source,45,'ai').provenance.originalOrigin,'ai');
});
