import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(bundle.slice(0, bundle.indexOf('var NevisApp;')), context);
const { getStyleProfile, compareStyleProfiles, analyze, createReadableReport } = context.NevisEngine;

function generateEnglish(seed = 'road') {
  return Array.from({ length: 20 }, (_, i) =>
    `The ${seed} section number ${i} contains a recorded example. We carefully reviewed the original data before presenting the final outcomes. Different colleagues asked practical questions and added their own suggestions.`
  ).join('\n\n');
}
function generatePersian() {
  return Array.from({ length: 24 }, (_, i) =>
    `در جلسه شماره ${i} یکی از همکاران درباره وضعیت پروژه توضیح داد. گزارش فروش را با داده های حسابداری مطابقت دادیم و چند مشکل جدید پیدا کردیم. فردا برای بررسی نتیجه کار دوباره جلسه برگزار می شود.`
  ).join('\n\n');
}

test('returns exactly eight descriptive metrics with finite values', () => {
  const p = getStyleProfile(generateEnglish(), 'en');
  assert.equal(p.metrics.length, 8);
  assert.equal(p.validForComparison, true);
  for (const m of p.metrics) {
    assert.ok(Number.isFinite(m.value), m.id);
    assert.ok(m.available, m.id);
    assert.ok(m.detail.length > 20);
  }
});

test('short text does not return spurious numeric confidence', () => {
  const p = getStyleProfile('Hello world.', 'en');
  assert.equal(p.validForComparison, false);
  for (const metric of p.metrics) {
    assert.equal(metric.available, false);
    assert.equal(metric.display, 'داده ناکافی');
  }
});

test('repeating one sentence has more repeated trigrams than varied prose', () => {
  const repeated = getStyleProfile('We reviewed the project before sending the update. '.repeat(60), 'en');
  const varied = getStyleProfile(generateEnglish(), 'en');
  const get = (p, id) => p.metrics.find(m => m.id === id).value;
  assert.ok(get(repeated, 'repeatedTrigrams') > get(varied, 'repeatedTrigrams'));
});

test('Persian spelling variants and halfspaces normalize in profiles', () => {
  const a = getStyleProfile('می‌خواهم كتاب ها را بررسي كنم. '.repeat(50), 'fa');
  const b = getStyleProfile('میخواهم کتاب ها را بررسی کنم. '.repeat(50), 'fa');
  assert.equal(a.metrics.find(m => m.id === 'rollingVocabulary').value,
    b.metrics.find(m => m.id === 'rollingVocabulary').value);
});

test('style comparison reports differences without an authorship classification', () => {
  const p = getStyleProfile(generateEnglish('road'), 'en');
  const q = getStyleProfile(generateEnglish('street'), 'en');
  const c = compareStyleProfiles(p, q);
  assert.equal(c.comparable, true);
  assert.ok(c.differences.length >= 7);
  assert.ok(!('probability' in c));
  assert.ok(!('isAI' in c));
  assert.ok(c.explanation.includes('تعیین نمی‌کند'));
  assert.ok(c.differences.every(d => Number.isFinite(d.difference)));
});

test('cross-language or insufficient baseline cannot be compared', () => {
  const en = getStyleProfile(generateEnglish(), 'en');
  const fa = getStyleProfile(generatePersian(), 'fa');
  const short = getStyleProfile('Short example.', 'en');
  assert.equal(compareStyleProfiles(en, fa).comparable, false);
  assert.equal(compareStyleProfiles(en, short).comparable, false);
});

test('style profile appears in commercial exported analysis and report', () => {
  const result = analyze(generatePersian());
  assert.equal(result.style.language, 'fa');
  assert.equal(result.style.metrics.length, 8);
  const output = createReadableReport(result);
  assert.ok(output.includes('آنتروپی'));
  assert.ok(!output.includes('github.com'));
});

test('UI has no outbound academic or GitHub reference links, and minor version is correct', () => {
  const ui = fs.readFileSync(path.join(root, 'src', 'app.tsx'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '2.4.0');
  assert.ok(!ui.includes('research-section'));
  assert.ok(!ui.includes('sourceUrl'));
  assert.ok(!ui.includes('github.com'));
  assert.ok(ui.includes('بررسی متن'));
  assert.ok(!ui.includes('آموزش اختصاصی تشخیص'));
});
