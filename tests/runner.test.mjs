import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { prepareContext, answerQuestion, answerBatch } from '../src/runner.mjs';
import { createJsonProcessConnector } from '../src/connectors.mjs';
import { invokeProcess } from '../src/process-transport.mjs';
const fixture = fileURLToPath(new URL('./process-fixture.mjs', import.meta.url));
const connector = () => createJsonProcessConnector({ command: process.execPath, args: [fixture, 'turn'] });
const job = { pgn: '1. e4 e5 2. Nf3 *', question: 'What changed after this move?' };
test('PH7-01: exact occurrence retains pre-move history, SAN, FEN and main line', () => {
 const { context, mainLine } = prepareContext(job);
 assert.deepEqual(context.historyUci, ['e2e4', 'e7e5']); assert.equal(context.moveUci, 'g1f3'); assert.equal(context.moveSan, 'Nf3');
 assert.equal(mainLine.selectedIndex, 2); assert.equal(mainLine.totalPlies, 3);
 assert.equal(prepareContext({ ...job, ply: 0 }).context.kind, 'position');
 assert.throws(() => prepareContext({ ...job, ply: 4 }), /outside/);
 assert.throws(() => prepareContext({ ...job, fen: context.fenAfter }), /exactly one/);
 assert.throws(() => prepareContext({ ...job, pgn: '1. e5 *' }));
});
test('PH7-01: custom root with history remains distinct from final-FEN-only context', () => {
 const pgn = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 *';
 const { context } = prepareContext({ pgn, question: 'Explain e4' });
 assert.match(context.historyStartFen, /^4k3/); assert.equal(context.moveUci, 'e2e4'); assert.notEqual(context.fenBefore, context.fenAfter);
 const root = prepareContext({ fen: context.fenAfter, question: 'Assess this starting position' });
 assert.equal(root.context.kind, 'position'); assert.deepEqual(root.context.historyUci, []);
});
test('PH7-02/04: installed pipeline runs real mechanical tools across process turns', async () => {
 const result = await answerQuestion(job, { connector: connector() });
 assert.equal(result.mode, 'controlled'); assert.equal(result.result.status, 'diagnostic');
 assert.equal(result.result.toolRuns[0].status, 'completed'); assert.equal(result.result.toolRuns[0].tool, 'inspect_position');
 assert.match(result.result.answer, /inspected position/); assert.equal(result.result.usage.metering, 'partly-unavailable');
 assert.equal(result.qualification.answerQuality, 'not-equivalence-qualified');
});
test('PH7-06: batch cancellation stops dispatching the next job', async () => {
 const controller = new AbortController(), seen = [];
 const iterator = answerBatch([job, job], { connector: connector(), signal: controller.signal });
 seen.push((await iterator.next()).value); controller.abort(Error('stop-batch'));
 await assert.rejects(iterator.next(), /stop-batch/); assert.equal(seen.length, 1);
});
test('PH7-06: packed CLI processes two JSONL jobs through the installed pipeline', async () => {
 const directory = await mkdtemp(tmpdir() + '/ke-cli-batch-');
 try {
  const batch = directory + '/jobs.jsonl'; await writeFile(batch, JSON.stringify(job) + '\n' + JSON.stringify({ ...job, ply: 1 }) + '\n');
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const result = await invokeProcess({ command: process.execPath, args: [cli, '--batch', batch, '--connector', 'json', '--command', process.execPath, '--arg', fixture, '--arg', 'turn'], input: '', timeoutMs: 20000 });
  const lines = result.stdout.trim().split('\n').map(JSON.parse); assert.equal(lines.length, 2);
  assert.equal(lines[0].context.moveSan, 'Nf3'); assert.equal(lines[1].context.moveSan, 'e4');
 } finally { await rm(directory, { recursive: true, force: true }); }
});
