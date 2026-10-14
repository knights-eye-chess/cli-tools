# Knight's Eye CLI Tools

Ask questions about a chess game or position from your terminal or Node app.
CLI Tools connects a local model command to Knight's Eye's answer pipeline,
which controls the chess tools, preserves exact move history and returns an
answer with evidence, usage and qualification details.

Use it for local game review, automated JSONL jobs or a custom model connector.
An optional UCI engine adds search evidence. External model commands manage their
own authentication and configuration.

## Retirement after the application split

The answer CLI and its local runner are moving to the separate
[composition examples](https://github.com/knights-eye-chess/composition-examples)
repository. Existing `@knights-eye-chess/cli-tools` prereleases and their
`knights-eye-answer`, `/runner` and `/connectors` entry points remain available
until npm permits their removal. The owner asked to delete the npm package after
the app split is deployed and tested; no further compatibility release or npm
deprecation is planned. The source repository and historical archives remain.

Run the replacement CLI from a pinned examples checkout:

```sh
git clone https://github.com/knights-eye-chess/composition-examples.git
EXAMPLES_COMMIT='<reviewed-public-commit-sha>'
git -C composition-examples checkout --detach "$EXAMPLES_COMMIT"
cd composition-examples
node scripts/install-candidates.mjs /path/to/classifier.tgz /path/to/ai-analysis.tgz /path/to/uci-client.tgz
node ai-cli/cli.mjs --help
```

The candidate installer is needed until the final component versions are
published and the examples lockfile is updated; then a clean `npm ci` can replace
it. Follow the examples README for the reviewed archive coordinates.

Replace `--help` with the same `--input`, `--fen`, `--question`, connector and
engine options shown below. `ai-cli/runner.mjs` supplies the local
`prepareContext`, `answerQuestion` and `answerBatch` composition, while
`ai-cli/connectors.mjs` supplies the process connectors. Hosts needing only
engine evidence can combine `createProcessEngine` from
`@knights-eye-chess/uci-client/node` with `createEngineAnalysisProvider` from
`@knights-eye-chess/ai-analysis/engine`; that replaces the old
`createLocalAnalyzer` dependency path. Pin a reviewed checkout commit because
the examples are not an npm library. The npm removal gates are in
[npm publishing](NPM-PUBLISHING.md).

## Get started

Use Node 24 or newer and a configured Codex CLI, Claude CLI or your own JSON
process connector. Install the published prerelease in your app or an empty
consumer directory:

```sh
npm install @knights-eye-chess/cli-tools@next
```

Its exact component dependencies install automatically. The first reviewed
registry release is `0.1.0-dev.16`; pin that exact version for
reproducibility. For source development, use `npm ci` and `npm run pack:checked`
in this checkout. Historical archive provenance is in
[SOURCE-ORIGIN.json](SOURCE-ORIGIN.json).

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
