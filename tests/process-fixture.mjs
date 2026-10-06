import { readFile } from 'node:fs/promises';
const input = await readFile(0, 'utf8').catch(async () => { let value = ''; for await (const c of process.stdin) value += c; return value; });
const mode = process.argv[2];
if (mode === 'descendant') {
 const {spawn}=await import('node:child_process');
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});
 console.log(child.pid); setInterval(()=>{},1000);
}
else if (mode === 'wait') setInterval(() => {}, 1000);
else if (mode === 'flood') process.stdout.write('x'.repeat(20000));
else if (mode === 'fail') process.exitCode = 2;
else if (mode === 'bad') console.log('not-json');
else if (mode === 'delegate') console.log('External agent answer.');
else if (mode === 'codex') {
 const args = process.argv, output = args[args.indexOf('--output-last-message') + 1];
 const { writeFile } = await import('node:fs/promises');
 await writeFile(output, JSON.stringify({ text: 'Fixture Codex response.', toolCalls: [] }));
 console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 3, output_tokens: 5 } }));
} else if (mode === 'claude') console.log(JSON.stringify({ structured_output: { text: 'Fixture Claude response.', toolCalls: [] }, usage: { input_tokens: 2, output_tokens: 4 } }));
else {
 const payload = JSON.parse(input), request = payload.request;
 if (payload.schema !== 'knights-eye/model-turn/1') throw Error('Wrong protocol.');
 const hasResult = JSON.stringify(request.messages).includes('cli-inspect');
 const calls = request.toolChoice !== 'none' && !hasResult ? [{ toolCallId: 'cli-inspect', toolName: 'inspect_position', arguments: JSON.stringify({ phase: 'before', squares: ['e2'] }) }] : [];
 console.log(JSON.stringify({ text: calls.length ? '' : 'The inspected position contains the recorded pieces.', toolCalls: calls }));
}
