import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { invokeProcess } from '../src/process-transport.mjs';
import { createJsonProcessConnector, createCodexConnector, createClaudeConnector, createResumableConnector, runDelegated } from '../src/connectors.mjs';
const fixture = fileURLToPath(new URL('./process-fixture.mjs', import.meta.url));
const config = mode => ({ command: process.execPath, args: [fixture, mode], timeoutMs: 2000 });
const request = { tools: [{ name: 'inspect_position', inputSchema: {} }], messages: [], toolChoice: 'auto', maxOutputTokens: 100, effort: 'low' };
test('PH7-02/04: process returns proposals with actual unknown usage and no execution', async () => {
 const value = await createJsonProcessConnector(config('turn')).invoke(request);
 assert.equal(value.toolCalls[0].toolName, 'inspect_position'); assert.deepEqual(value.usage, {});
 assert.equal(value.response.messages[0].role, 'assistant');
});
test('PH7-03: argv transport rejects malformed, oversized, failed and timed-out children', async () => {
 await assert.rejects(createJsonProcessConnector(config('bad')).invoke(request));
 await assert.rejects(invokeProcess({ ...config('flood'), input: '', maxOutputBytes: 100 }), /byte limit/);
 await assert.rejects(invokeProcess({ ...config('fail'), input: '' }), /status 2/);
 await assert.rejects(invokeProcess({ ...config('wait'), input: '', timeoutMs: 80 }), /timed out/);
 assert.throws(() => invokeProcess({ ...config('turn'), input: 'abc', maxInputBytes: 1 }), /byte limit/);
});
test('PH7-03: cancellation drains the running child before rejecting', async () => {
 const controller = new AbortController();
 const pending = invokeProcess({ ...config('wait'), input: '', signal: controller.signal });
 setTimeout(() => controller.abort(Error('stop-test')), 60);
 await assert.rejects(pending, /stop-test/);
});
test('PH7-02: resumable turn rejects late replies after cancellation and composition tools', async () => {
 let id; const connector = createResumableConnector(value => { id = value.id; });
 const controller = new AbortController(); const pending = connector.invoke({ ...request, signal: controller.signal });
 controller.abort(Error('stop-resumable')); await assert.rejects(pending, /stop-resumable/);
 assert.equal(connector.pendingCount(), 0); assert.throws(() => connector.resume(id, {}), /cancelled/);
 const next = connector.invoke({ ...request, toolChoice: 'none' });
 connector.resume(id, { text: '', toolCalls: [{ toolCallId: 'x', toolName: 'inspect_position', input: {} }] });
 await assert.rejects(next, /unavailable/);
});
test('PH7-02: Codex and Claude print protocols preserve final JSON and reported token metadata', async () => {
 // Node acts as each CLI executable, retaining the exact argv protocol adapter.
 // Real adapters are separately qualified through executable fixture wrappers.
 const wrapper = (await import('node:fs/promises'));
 const directory = await wrapper.mkdtemp('/tmp/ke-cli-fixture-');
 try {
  for (const kind of ['codex', 'claude']) {
   const command = directory + '/' + kind;
   await wrapper.writeFile(command, '#!/bin/sh\nexec '+process.execPath+' '+fixture+' '+kind+' "$@"\n', { mode: 0o755 });
   const connector = kind === 'codex' ? createCodexConnector({ command }) : createClaudeConnector({ command });
   const result = await connector.invoke(request); assert.match(result.text, /Fixture/); assert.ok(result.usage.outputTokens > 0);
  }
 } finally { await wrapper.rm(directory, { recursive: true, force: true }); }
});
test('PH7-05: delegated mode carries explicit non-equivalence attribution', async () => {
 const result = await runDelegated({ ...config('delegate'), kind: 'json', context: {}, question: 'Question' });
 assert.equal(result.mode, 'delegated'); assert.equal(result.qualification.referenceValidation, 'not-run');
 assert.equal(result.text, 'External agent answer.');
});

test('PH7-03: process-group cancellation terminates ordinary descendants before settlement', {skip:process.platform !== 'linux'}, async () => {
 const controller = new AbortController(); let childPid;
 const started = new Promise(resolve => { childPid = resolve; });
 const pending = invokeProcess({ ...config('descendant'), input: '', signal: controller.signal, spawnProcess(...args) {
  const child = spawn(...args); child.stdout.once('data', data => childPid(Number(data.toString().trim()))); return child;
 } });
 const pid = await started; assert.ok(Number.isSafeInteger(pid) && pid > 0);
 controller.abort(Error('stop-descendants')); await assert.rejects(pending, /stop-descendants/);
 let terminated;
 try { process.kill(pid, 0); const stat = await readFile('/proc/' + pid + '/stat', 'utf8'); terminated = /\) Z /.test(stat); }
 catch (error) { if (['ESRCH', 'ENOENT'].includes(error.code)) terminated = true; else throw error; }
 assert.equal(terminated, true);
});
