/** Zero-dependency static server for the prebuilt React frontend. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const host = '127.0.0.1'; // Loopback only: never expose pasted text to your network.
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8', '.onnx': 'application/octet-stream' };

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url || '/', `http://${host}:${port}`).pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const filePath = path.resolve(root, '.' + pathname.replace(/\\/g, '/'));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  let file = filePath;
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); }
  catch { res.writeHead(404); res.end('Not found'); return; }
  const stream = fs.createReadStream(file);
  stream.on('error', () => { if (!res.headersSent) res.writeHead(404); res.end('Not found'); });
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  stream.pipe(res);
});

server.on('error', error => { console.error('امکان اجرای سرور نبود:', error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`\n✅ نویس‌سنج آماده است: http://${host}:${port}\nبرای توقف، Ctrl+C رو بزنید.\n`));
