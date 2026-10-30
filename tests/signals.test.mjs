import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(bundle.slice(0, bundle.indexOf('var NevisApp;')), sandbox);
const { analyze, createReadableReport } = sandbox.NevisEngine;
const get = (report, id) => report.findings.find(f => f.id === id);

function exactSpans(text) {
  const report = analyze(text);
  for (const f of report.findings) for (const hit of f.hits) {
    assert.equal(hit.text, text.slice(hit.start, hit.end));
    assert.equal(Object.hasOwn(f, 'sourceUrl'), false, 'Commercial output does not expose source links');
    assert.ok(f.caveat.length > 30, `${f.id} must disclose false-positive context`);
  }
  return report;
}

test('Persian repetitive inflated language requires multiple observed instances', () => {
  assert.equal(get(analyze('این تحول، نقطه عطفی در تاریخ است.'), 'fa-significance-inflation'), undefined);
  const r = exactSpans('این نقطه عطفی در تاریخ است و دستاوردی چشمگیر به حساب می‌آید.');
  assert.ok(get(r, 'fa-significance-inflation'));
});

test('vague attributions are review targets, not high-severity authorship proof', () => {
  const r = exactSpans('بسیاری از کارشناسان معتقدند این روش مفید است. تحقیقات نشان داده است که موضوع جدی است.');
  assert.equal(get(r, 'fa-vague-attribution')?.severity, 'low');
  assert.equal(get(analyze('تحقیقات نشان داده است که وضعیت تغییر کرده.'), 'fa-vague-attribution'), undefined);
});

test('Persian rhetorical contrast counts recurrence, not one native expression', () => {
  assert.equal(get(analyze('این نه تنها سریع است بلکه دقیق هم هست.'), 'fa-repeated-contrast'), undefined);
  const r = exactSpans('نه‌تنها باید دقیق بود بلکه به‌موقع هم باید کار کرد. این برنامه نه تنها سریع است بلکه زیباست.');
  assert.ok(get(r, 'fa-repeated-contrast'));
});

test('English rhetorical patterns require repetition and report real spans', () => {
  const r = exactSpans('It is not just about time but about values. This is not only a tool but also an approach.');
  assert.ok(get(r, 'en-repeated-contrast'));
});

test('direct AI output artifacts receive higher inspection priority', () => {
  const r = exactSpans('نوشته آزمایشی citeturn0search2 و پاسخ دیگر contentReference[oaicite:1]');
  const f = get(r, 'citation-artifact');
  assert.ok(f);
  assert.equal(f.hits.length, 2);
  assert.equal(f.evidenceKind, 'artifact');
  assert.equal(f.severity, 'high');
});

test('unfinished templates are surfaced without claiming all templates are AI', () => {
  const r = exactSpans('سلام [insert your company name] و [your name]، ممنون.');
  assert.ok(get(r, 'unfinished-placeholders'));
});

test('normal Persian ZWNJ and curly quotation are not technical artifact evidence', () => {
  const r = exactSpans('می‌خواهم یک متن معمولی فارسی درباره کتاب‌ها و پژوهش‌ها بنویسم؛ گاهی «نقل قول» دارم.');
  assert.equal(get(r, 'citation-artifact'), undefined);
  assert.equal(get(r, 'unfinished-placeholders'), undefined);
  assert.equal(get(r, 'markdown-heavy'), undefined);
});

test('recurring em dashes are only a weak English style clue in long text', () => {
  const long = Array(20).fill('Our team worked on a customer issue and resolved the problem after careful testing.').join(' ');
  assert.equal(get(analyze(long + ' —'), 'em-dash-density'), undefined);
  const flagged = exactSpans(long + ' — early — careful — steady — verified — delivered —');
  assert.equal(get(flagged, 'em-dash-density')?.weight, 1);
});

test('commercial report contains no external source links and clarifies the index', () => {
  const r = exactSpans('در دنیای امروز باید درباره شرایط تصمیم بگیریم. در دنیای امروز به داده‌ها توجه می‌کنیم.');
  const text = createReadableReport(r);
  assert.ok(!text.includes('https://'));
  assert.ok(text.includes('پروفایل آماری متن')); 
  assert.ok(text.includes('کالیبره‌نشده'));
});

test('feature spam remains bounded, while extreme repetition is separately detectable', () => {
  const moderate = analyze('در دنیای امروز، نقش کلیدی ایفا می‌کند. نقش کلیدی ایفا می‌کند.'.repeat(8));
  const massive = analyze('در دنیای امروز، نقش کلیدی ایفا می‌کند. نقش کلیدی ایفا می‌کند.'.repeat(80));
  assert.ok(moderate.index < 100);
  assert.ok(massive.index < 100);
  assert.ok(massive.index < 50, `A single repeated template must not be treated as high-confidence proof: ${massive.index}`);
});
