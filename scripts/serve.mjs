#!/usr/bin/env node
/*
 * Minimal static file server for the built site (dist/), with no dependencies.
 * Unknown paths return dist/404.html with a real 404 status, like most hosts.
 *
 *   node scripts/serve.mjs            -> http://localhost:8080
 *   PORT=3000 node scripts/serve.mjs  -> http://localhost:3000
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.join(ROOT, pathname);

  // Never serve anything outside dist/
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  let status = 200;
  if (!(await exists(file))) {
    file = path.join(ROOT, '404.html');
    status = 404;
  }

  try {
    const body = await readFile(file);
    res.writeHead(status, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500).end('Run "node scripts/build.mjs --preview" first: dist/ was not found.');
  }
});

server.listen(PORT, () => {
  console.log(`Serving dist/ at http://localhost:${PORT}  (Ctrl+C to stop)`);
});
