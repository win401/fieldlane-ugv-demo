import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { makeServer } from '../server.mjs';

test('serves the local demo, modules, CSS, schematic and health route over HTTP', async (ctx) => {
  const server = makeServer().listen(0, '127.0.0.1');
  ctx.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const start = 'http://127.0.0.1:' + server.address().port;
  for (const [path, type, content] of [
    ['/', 'text/html', '관수 운영 보드'], ['/ui.mjs', 'text/javascript', 'renderAll'],
    ['/model.mjs', 'text/javascript', 'addMission'], ['/style.css', 'text/css', '@media'],
    ['/orchard.svg', 'image/svg+xml', '가상 과수원']
  ]) {
    const result = await fetch(start + path);
    assert.equal(result.status, 200);
    assert.ok(result.headers.get('content-type').startsWith(type));
    assert.ok((await result.text()).includes(content));
  }
  assert.deepEqual(await (await fetch(start + '/health')).json(), { status: 'ok', mode: 'simulation' });
  assert.equal((await fetch(start + '/package.json')).status, 404);
  assert.equal((await fetch(start + '/health', { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(start + '/', { method: 'HEAD' })).text(), '');
});
