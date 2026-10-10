# Knight's Eye CLI Tools

Ask questions about a chess game or position from your terminal or Node app.
CLI Tools connects a local model command to Knight's Eye's answer pipeline,
which controls the chess tools, preserves exact move history and returns an
answer with evidence, usage and qualification details.

Use it for local game review, automated JSONL jobs or a custom model connector.
An optional UCI engine adds search evidence. External model commands manage their
own authentication and configuration.

## Get started

Use Node 24 or newer and a configured Codex CLI, Claude CLI or your own JSON
process connector. This preview has not been published to npm.

Run the following in source checkouts of [Move Classifier](https://github.com/knights-eye-chess/move-classifier),
[PGN Annotator](https://github.com/knights-eye-chess/pgn-annotator),
[AI Analysis](https://github.com/knights-eye-chess/ai-analysis) and
[this repository](https://github.com/knights-eye-chess/cli-tools):

```sh
npm ci
npm run pack:checked
```

Install their resulting archives together in your app or an empty consumer directory:

```sh
npm install /absolute/path/to/move-classifier/artifacts/knights-eye-chess-move-classifier-0.1.0-dev.5.tgz \
  /absolute/path/to/pgn-annotator/artifacts/knights-eye-chess-pgn-annotator-0.1.0-dev.9.tgz \
  /absolute/path/to/ai-analysis/artifacts/knights-eye-chess-ai-analysis-0.1.0-dev.10.tgz \
  /absolute/path/to/cli-tools/artifacts/knights-eye-chess-cli-tools-0.1.0-dev.12.tgz
```

With an authenticated Codex CLI and `stockfish` on PATH:

```sh
npx --no-install knights-eye-answer --input game.pgn --ply 3 \
  --question "What changed after this move?" --connector codex --engine stockfish
```

`--ply 3` selects the third half-move and retains its exact pre-move history.
`--ply 0` selects the root position; omitting `--ply` selects the final move.
For a position without recorded history, use `--fen FEN` instead of `--input`.
Output is JSONL. Engine evidence stays unavailable when no engine is supplied.

## Use it in your app

```js
import { answerQuestion } from '@knights-eye-chess/cli-tools/runner';
import { createCodexConnector } from '@knights-eye-chess/cli-tools/connectors';

const answer = await answerQuestion({
  pgn: '1. e4 e5 2. Nf3 *',
  ply: 3,
  question: 'What changed after this move?'
}, { connector: createCodexConnector() });
console.log(answer.mode === 'controlled' ? answer.result.answer : answer.text);
```

This example needs a working Codex CLI. Add an analyzer created with
`createLocalAnalyzer({ command: 'stockfish' })` for engine evidence, and close it
in a `finally` block. `answerBatch` runs jobs sequentially and stops dispatching
when cancelled.

## Connect your own model

Use `--connector json --command executable`, with repeated `--arg ARG` values.
Each process reads a JSON turn request from stdin and returns one JSON object:

```json
{"text":"The available evidence is limited.","toolCalls":[]}
```

Input has `{schema: "knights-eye/model-turn/1", request: ...}`. Proposed tool calls
use `{toolCallId, toolName, arguments}` with `arguments` as a JSON object string.
The pipeline validates and executes chess tools, then invokes the connector again
with continuation messages. Programmatic connectors include a resumable option.
See [connector declarations](src/connectors.d.mts) and [protocol tests](tests/runner.test.mjs).

Codex and Claude adapters request structured turns with native tools disabled.
For Codex, use a dedicated CLI profile with extra MCP tools disabled if you need
strict controlled execution. Provider configuration remains your responsibility.

## Batch jobs and execution modes

`--batch jobs.jsonl` accepts one object per line with `pgn` or `fen`, `question`,
and optional `ply` and `scope`. The explicit scope can be `move`, `position`,
`game`, `mixed` or `general`; the host does not infer website question routing.
Run `knights-eye-answer --help` for flags.

The default **controlled** mode uses the answer pipeline. **Delegated** mode,
selected with `--mode delegated`, gives an external agent the question and context
and returns its final answer. Delegated output is explicitly attributed and has
no pipeline reference validation or qualified answer quality.

The package's tests verify context, tool protocols and cancellation. They do not
establish live model answer quality or equivalence to the website. Missing token
or cost reporting stays unknown. Linux cancellation terminates ordinary process
descendants and drains output; Windows only claims direct-child termination.

## Documentation and development

See [runner declarations](src/runner.d.mts), [connector declarations](src/connectors.d.mts)
and [process transport](src/process-transport.mjs) for options and limits.
Model turns default to a 120-second timeout and 2 MB input/output limits;
programmatic hosts can configure them.

```sh
npm ci
npm run check
npm run pack:checked
```

[SOURCE-ORIGIN.json](SOURCE-ORIGIN.json) records the historical extraction. Current
source belongs here. [npm publishing](NPM-PUBLISHING.md) documents release preparation
and the separate publication step.

## License

First-party code is **[AGPL-3.0-or-later](LICENSE)**. See [licensing details](LICENSING.md)
and [third-party notices](THIRD_PARTY_NOTICES.md). External model CLIs and engines
have their own terms.
