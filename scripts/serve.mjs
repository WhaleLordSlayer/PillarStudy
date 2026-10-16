#!/usr/bin/env node
// Minimal static preview server for dist/ (directory index, 404 page,
// _redirects). Production is served by Cloudflare Workers static assets.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const port = Number(process.env.PORT || 4321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const redirects = existsSync(join(root, '_redirects'))
  ? readFileSync(join(root, '_redirects'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => l.trim().split(/\s+/))
  : [];

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const hit = redirects.find(([from]) => from === url.pathname);
  if (hit) { res.writeHead(Number(hit[2] || 301), { location: hit[1] }); return res.end(); }
  let file = join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { location: `${url.pathname}/${url.search}` }); return res.end(); }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(existsSync(join(root, '404.html')) ? readFileSync(join(root, '404.html')) : 'Not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
