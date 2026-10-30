import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const start = bundle.indexOf('var NevisApp;');
assert.ok(start > 0, 'Engine must precede the UI bundle');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(bundle.slice(0, start), sandbox);
const { analyze, createReadableReport } = sandbox.NevisEngine;

test('empty input is handled without NaN or false AI claims', () => {
  const result = analyze('');
  assert.equal(result.wordCount, 0);
  assert.equal(result.index, 0);
  assert.equal(result.level, 'insufficient');
  assert.equal(result.findings.length, 0);
});

test('Persian normalization respects Arabic characters and zero-width joiners', () => {
  const text = 'در دنياي امروز، فناوری نقش كليدي ايفا مي‌كند.';
  const result = analyze(text);
  assert.ok(result.findings.some(f => f.id === 'fa-generic-intro'));
  assert.ok(result.findings.some(f => f.id === 'fa-boilerplate'));
  for (const finding of result.findings) {
    for (const hit of finding.hits) assert.equal(text.slice(hit.start, hit.end), hit.text);
  }
});

test('detects exact AI model self-reference with a quotation caveat', () => {
  const result = analyze('به عنوان یک مدل زبانی تلاش می‌کنم پاسخ مناسب بدهم.');
  const f = result.findings.find(x => x.id === 'fa-model-reference');
  assert.ok(f);
  assert.equal(f.severity, 'high');
  assert.ok(f.caveat.includes('نقل‌قول'));
  assert.equal(result.level, 'insufficient');
});

test('repeated transitions are only flagged when recurring', () => {
  const single = analyze('همچنین این یک نمونه ساده است.');
  assert.ok(!single.findings.some(f => f.id === 'fa-transitions'));
  const repeated = analyze('همچنین روز اول. علاوه بر این روز دوم. در نتیجه روز سوم. همچنین روز چهارم.');
  assert.ok(repeated.findings.some(f => f.id === 'fa-transitions'));
});

test('English detection and phrase matching', () => {
  const text = "In today's fast-paced world, technology plays a crucial role in society. Furthermore, people collaborate.";
  const result = analyze(text);
  assert.equal(result.language, 'en');
  assert.ok(result.findings.some(f => f.id === 'en-generic-intro'));
  assert.ok(result.findings.some(f => f.id === 'en-boilerplate'));
});

test('detects repeated paragraph starts independent of preset phrases', () => {
  const p = 'این نمونه برای بررسی عملکرد تیم تهیه شده است و بهتر است به خروجی آن دقت کنیم.';
  const result = analyze([p, p, p, 'موضوع جداگانه مربوط به زمان‌بندی پروژه است.'].join('\n\n'));
  assert.ok(result.findings.some(f => f.id === 'repeated-openings'));
});

test('report text explicitly avoids an authorship probability claim', () => {
  const text = 'در دنیای امروز، متن نمونه است.';
  const report = createReadableReport(analyze(text));
  assert.ok(report.includes('منشأ نگارش را اثبات نمی‌کنند'));
});

test('source spans always match original source, including mixed text', () => {
  const text = 'در دنیای امروز، همچنین فناوری مهم است.\n\nIn conclusion, results matter. علاوه بر این، \u200cدر عصر دیجیتال نکات بسیار است.';
  const result = analyze(text);
  result.findings.forEach(f => f.hits.forEach(h => {
    assert.equal(h.text, text.slice(h.start, h.end));
    assert.ok(h.start >= 0 && h.end <= text.length);
  }));
});

test('runtime UI tree initializes without relying on React.Fragment or remote services', () => {
  const attrs = {};
  class Component { constructor(props) { this.props = props; } setState(update) { this.state = { ...this.state, ...update }; } }
  const virtual = {
    React: {
      Component,
      createElement(type, props, ...children) { return { type, props: { ...props, children } }; }
    },
    ReactDOM: { render(element) { virtual.app = new element.type({}); virtual.tree = virtual.app.render(); } },
    document: { documentElement: { setAttribute(k,v) { attrs[k] = v; } }, getElementById() { return {}; } },
    localStorage: { getItem() { return null; } },
    console, setTimeout
  };
  vm.createContext(virtual);
  vm.runInContext(bundle, virtual);
  assert.equal(virtual.tree.type, 'div');
  assert.equal(virtual.tree.props.className, 'public-shell');
  assert.equal(virtual.app.state.report, null);
  assert.equal(virtual.app.state.models.fa, null);
  assert.equal(virtual.app.state.models.en, null);
});
