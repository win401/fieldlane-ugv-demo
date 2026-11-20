import assert from 'node:assert/strict';
import test from 'node:test';
import { addMission, moveMission, loadMissions, sampleHistory } from '../public/model.mjs';

const form = { plot: 'A1', rover: 'L01', minutes: '8' };
const params = { id: 'demo-test', now: new Date('2026-05-19T01:00:00Z') };
function make() { return addMission([], form, params).records; }

test('queues an order with independent sample identifiers and valid minutes', () => {
  const created = make();
  assert.deepEqual(created, [{ id: 'demo-test', plot: 'A1', rover: 'L01', minutes: 8, stage: 'queued', timestamp: '2026-05-19T01:00:00.000Z' }]);
});
test('rejects unknown equipment and plot, nonintegers and out-of-range values', () => {
  for (const patch of [{ rover: 'bad' }, { plot: 'bad' }, { minutes: '1.5' }, { minutes: '0' }, { minutes: '31' }, { minutes: '' }])
    assert.ok(addMission([], { ...form, ...patch }, params).error);
});
test('charging and duplicate open orders are rejected, completed rovers can be reassigned', () => {
  assert.ok(addMission([], { ...form, rover: 'K02' }, params).error);
  const first = make();
  assert.ok(addMission(first, form, { ...params, id: 'next' }).error);
  const active = moveMission(first, 'demo-test', 'active').records;
  assert.ok(addMission(active, form, { ...params, id: 'next' }).error);
  const complete = moveMission(active, 'demo-test', 'done').records;
  assert.equal(addMission(complete, form, { ...params, id: 'next' }).records[0].id, 'next');
});
test('simulated transitions allow start, finish and cancel, not repeat or skip', () => {
  const first = make();
  assert.ok(moveMission(first, 'demo-test', 'done').error);
  const active = moveMission(first, 'demo-test', 'active').records;
  assert.ok(moveMission(active, 'demo-test', 'active').error);
  assert.equal(moveMission(active, 'demo-test', 'done').records[0].stage, 'done');
  const cancelled = moveMission(active, 'demo-test', 'cancelled').records;
  assert.equal(cancelled[0].stage, 'cancelled');
  assert.ok(moveMission(cancelled, 'demo-test', 'active').error);
  assert.equal(first[0].stage, 'queued');
});
test('storage restores valid records and drops corrupt or duplicate records', () => {
  const first = make();
  assert.deepEqual(loadMissions(null), sampleHistory);
  assert.deepEqual(loadMissions('bad json'), sampleHistory);
  assert.deepEqual(loadMissions('[]'), []);
  assert.deepEqual(loadMissions(JSON.stringify([first[0], first[0], null, { ...first[0], id: 'bad', stage: 'toString' }])), first);
});
