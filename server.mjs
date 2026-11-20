import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/ui.mjs', ['ui.mjs', 'text/javascript; charset=utf-8']],
  ['/model.mjs', ['model.mjs', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/orchard.svg', ['orchard.svg', 'image/svg+xml']]
]);

export function makeServer() {
  return createServer(async (req, res) => {
    const respond = (status, body, contentType = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return respond(405, 'Method not allowed');
    const path = (req.url ?? '').split('?')[0];
    if (path === '/health') return respond(200, '{"status":"ok","mode":"simulation"}', 'application/json');
    const route = routes.get(path);
    if (!route) return respond(404, 'Not found');
    try { return respond(200, await readFile(new URL('public/' + route[0], import.meta.url)), route[1]); }
    catch { return respond(500, 'Unable to load demo asset'); }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.env.PORT ?? '4173');
  const host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be from 1 to 65535');
  const server = makeServer();
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log('FIELDLANE · http://' + host + ':' + port));
}
