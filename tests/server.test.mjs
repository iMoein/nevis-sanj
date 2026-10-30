import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('self-contained server delivers built React files with no remote assets', async () => {
  const port = 4187;
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const ready = await Promise.race([
      new Promise((resolve, reject) => {
        child.stdout.on('data', data => { if (String(data).includes('آماده')) resolve(true); });
        child.on('error', reject);
        child.on('exit', code => reject(new Error('server stopped: ' + code)));
      }),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('server start timeout')), 4000))
    ]);
    assert.equal(ready, true);
    for (const p of ['/', '/app.js', '/style.css', '/vendor/react.production.min.js', '/vendor/react-dom.production.min.js', '/favicon.svg']) {
      const response = await fetch(`http://127.0.0.1:${port}${p}`);
      assert.equal(response.status, 200, p);
      assert.ok((await response.text()).length > 30, p);
    }
    const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert.ok(html.includes('dir="rtl"'));
    assert.ok(!html.includes('https://'));
  } finally {
    child.kill('SIGTERM');
  }
});
