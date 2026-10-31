import fs from 'node:fs';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';
const root=process.cwd();const html=fs.readFileSync(path.join(root,'admin/index.html'),'utf8');
test('source onboarding shows simple, progressive steps',()=>{
 assert.match(html,/منبع رو انتخاب کن/);assert.match(html,/تأیید کن؛ ادامه خودکاره/);
 assert.match(html,/id="source-search"/);assert.match(html,/id="source-filter"/);
 assert.match(html,/<details id="mapping-details">/);
 assert.match(html,/id="review-samples"/);assert.match(html,/تأیید و شروع دریافت داده/);
});
test('approval initiates sync instead of requiring a second manual step',()=>{
 assert.match(html,/await action\('\/api\/sync-sources'\)/);
 assert.match(html,/sourceRank/);assert.match(html,/visibleSources=7/);
});


test('the training UI does not ask users to guess 0/1 by reading text',()=>{
 assert.doesNotMatch(html,/name="numeric_mapping"/);
 assert.match(html,/suggest\.evidence==='documentation_and_source'/);
 assert.match(html,/نیازی نیست از روی متن حدس بزنی/);
 assert.match(html,/const unresolved=!suggest\.ready/);
 assert.match(html,/disabled=limited\|\|tooShort\|\|unresolved/);
});

test('paired human and AI text corpus has a nontechnical onboarding flow',()=>{
  assert.match(html,/<option value="paired">/);
  assert.match(html,/suggest\.mode==='paired'/);
  assert.match(html,/human_text \(انسانی\) و ai_text \(AI\)/);
  assert.match(html,/ردیف/);
});

test('Persian-first source filtering uses measured language and labels catalog hints',()=>{
 assert.match(html,/<option value="fa">فارسی — اولویت من<\/option>/);
 assert.match(html,/id="language-filter"/);
 assert.match(html,/language_measured/);
 assert.match(html,/زبان نمونه‌ها:/);
 assert.match(html,/option value="en">انگلیسی/);
});

test('documented Persian AI-only corpus maps itself without user guessing',()=>{
 assert.match(html,/suggest\.mode==='ai'/);
 assert.match(html,/suggest\.evidence==='documented_ai_only'/);
 assert.match(html,/منبع فقط متن ماشینی/);
 assert.match(html,/منشأ مستند: متن AI/);
});
