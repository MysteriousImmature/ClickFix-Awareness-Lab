'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createSession, buildTrainingMarker, sampleEvidence} = require('../lab-engine.js');
const id = 'CF-12ABCDEF';
const fixedTime = Date.parse('2026-09-07T09:00:00.000Z');
const complete = session => ['START','STAGE','OPEN_RUN','PASTE','EXECUTE'].forEach(action => assert.equal(session.dispatch(action),true));

test('a complete demonstration stages inert data, preserves evidence, and clears virtual clipboard', () => {
  const session = createSession(id, () => fixedTime);
  assert.equal(session.dispatch('START'),true);
  assert.equal(session.dispatch('STAGE'),true);
  assert.equal(session.snapshot().clipboard,buildTrainingMarker(id));
  session.dispatch('OPEN_RUN');
  session.dispatch('PASTE');
  assert.equal(session.snapshot().pasted,buildTrainingMarker(id));
  session.dispatch('EXECUTE');
  const state = session.snapshot();
  assert.equal(state.phase,'complete');
  assert.equal(state.clipboard,'');
  assert.equal(state.evidence.length,3);
  assert.ok(state.evidence.every(record => record.Synthetic === true));
  assert.equal(state.events.at(-1).type,'DETECTOR');
});

test('out-of-order and repeated actions cannot fabricate an execution', () => {
  const session = createSession(id);
  for (const action of ['EXECUTE','PASTE','OPEN_RUN','STAGE','RETRY','UNKNOWN']) assert.equal(session.dispatch(action),false);
  session.dispatch('START');
  const count = session.snapshot().events.length;
  assert.equal(session.dispatch('START'),false);
  assert.equal(session.snapshot().events.length,count);
  session.dispatch('STAGE');
  assert.equal(session.dispatch('EXECUTE'),false);
  assert.equal(session.snapshot().evidence.length,0);
});

test('clipboard fault never stages content and recovery is explicit', () => {
  const session = createSession(id);
  session.dispatch('TOGGLE_FAULT');
  session.dispatch('START');
  session.dispatch('STAGE');
  assert.equal(session.snapshot().phase,'blocked');
  assert.equal(session.snapshot().clipboard,'');
  assert.equal(session.dispatch('OPEN_RUN'),false);
  assert.equal(session.dispatch('RETRY'),true);
  assert.equal(session.snapshot().fault,false);
  assert.equal(session.dispatch('STAGE'),true);
  assert.equal(session.snapshot().phase,'staged');
});

test('session reset isolation: finishing an older model cannot affect a new model', () => {
  const oldSession = createSession(id);
  oldSession.dispatch('START');
  const newSession = createSession('CF-00000001');
  oldSession.dispatch('STAGE');
  assert.equal(newSession.snapshot().phase,'idle');
  assert.equal(newSession.snapshot().clipboard,'');
  assert.equal(newSession.snapshot().events.length,1);
});

test('snapshots cannot be used to alter state, evidence, or a pasted marker', () => {
  const session = createSession(id);
  const snapshot = session.snapshot();
  snapshot.phase = 'complete';
  snapshot.pasted = 'modified';
  snapshot.events[0].message = 'modified';
  assert.equal(session.snapshot().phase,'idle');
  assert.notEqual(session.snapshot().events[0].message,'modified');
  complete(session);
  session.snapshot().evidence[0].Synthetic = false;
  assert.equal(session.snapshot().evidence[0].Synthetic,true);
});

test('marker construction rejects injected or invalid identifiers', () => {
  for (const input of ['CF-INVALID','CF-00000000\nextra','CF-12345678\n','<script>','',null,'CF-12345678;extra']) assert.throws(() => buildTrainingMarker(input),TypeError);
  const marker = buildTrainingMarker(id);
  assert.ok(marker.startsWith('CLICKFIX_TRAINING\n'));
  assert.ok(marker.endsWith('action: simulate_only'));
  assert.doesNotMatch(marker,/https?:|javascript:|vbscript:|[;&|`]/i);
});

test('synthetic process and network samples correlate without a live destination', () => {
  const records = sampleEvidence(id,fixedTime);
  const process = records.find(record => record.EventID === 1);
  const network = records.find(record => record.EventID === 3);
  assert.equal(process.ProcessGuid,network.ProcessGuid);
  assert.equal(process.Computer,network.Computer);
  assert.equal(network.DestinationIp,'192.0.2.24');
  assert.ok(network.DestinationHostname.endsWith('.invalid'));
  assert.ok(process.CommandLine.includes('REDACTED'));
  assert.equal(process.IntegrityLevel,'Medium');
  assert.ok(new Date(network.UtcTime) > new Date(process.UtcTime));
  assert.throws(() => sampleEvidence(id,'bad time'),TypeError);
});

test('completed sessions reject replay without adding events', () => {
  const session = createSession(id);
  complete(session);
  const previous = session.snapshot();
  for (const action of ['START','STAGE','OPEN_RUN','PASTE','EXECUTE','RETRY','TOGGLE_FAULT']) assert.equal(session.dispatch(action),false);
  assert.deepEqual(session.snapshot(),previous);
});

test('runtime source has no executable clipboard, network, or process bridge', () => {
  const runtime = ['app.js','lab-engine.js'].map(file => fs.readFileSync(path.join(__dirname,'..',file),'utf8')).join('\n');
  assert.doesNotMatch(runtime,/navigator\s*\.\s*clipboard|execCommand\s*\(|\beval\s*\(|new\s+Function\s*\(|fetch\s*\(|new\s+(WebSocket|XMLHttpRequest|ActiveXObject)|require\(['"](?:node:)?child_process/);
  const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/object-src 'none'/);
  assert.doesNotMatch(html,/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/i);
  assert.match(html,/TRAINING SIMULATION/);
});
