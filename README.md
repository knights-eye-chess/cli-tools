# Local answer runner — Phase 7 private preview

First-party code: **AGPL-3.0-or-later**. See [LICENSING.md](LICENSING.md) for scope and third-party terms.

This host consumes the installed answer pipeline. It runs controlled model turns
through a JSON stdin/stdout process, Codex CLI or Claude CLI. Delegated execution
is a separate mode: it gives an external agent the question/context and returns
that agent's final answer, without claiming the Knight's Eye investigation loop
or equivalent answer quality. No accounts, database, browser or API credentials
are required by the host; an external CLI manages its own authentication.

| Requirement | Contract | Evidence |
|---|---|---|
| PH7-01 | Validate exact PGN/FEN context and selected occurrence; never replace history by a matching final FEN | host context tests, custom starts, illegal history |
| PH7-02 | Controlled connector returns model tool requests; the canonical pipeline alone executes chess tools, preserves ordered continuation and tool-free composition | packed consumer investigation tests |
| PH7-03 | Process transport uses argv without a shell, bounded input/output/time, signal cancellation and drains descendants before settlement; malformed output never becomes an answer | real subprocess fixture tests |
| PH7-04 | Expose connector capability limits; missing token/cost metadata is unknown, not certified zero usage | connector conformance tests |
| PH7-05 | Delegated result is explicitly attributed to delegated mode, with pipeline/reference validation unqualified | delegated fixture tests |
| PH7-06 | Sequential JSONL batch uses the same host per job; cancellation stops dispatch and does not persist late results | CLI batch and abort tests |

Private experimental code under the approved AGPL license; no public registry release has been performed. Protocol tests and
scripted connectors do not establish live model answer quality. Genuine local CLI
and real-engine checks are recorded separately after execution.

## Installing the private previews

Run `npm run pack:checked` in move-classifier, pgn-annotator, ai-analysis and
cli-tools, then install all
four archives together into an independent directory. The preview dependencies
are not in the public registry. Use the resulting `knights-eye-answer --help`.

```sh
npm install /absolute/artifacts/knights-eye-chess-move-classifier-0.1.0-dev.2.tgz \
  /absolute/artifacts/knights-eye-chess-pgn-annotator-0.1.0-dev.5.tgz \
  /absolute/artifacts/knights-eye-chess-ai-analysis-0.1.0-dev.6.tgz \
  /absolute/artifacts/knights-eye-chess-cli-tools-0.1.0-dev.8.tgz
```

For a JSON connector, pass `--connector json --command executable` with repeated
`--arg` values. Stdin is `{schema:"knights-eye/model-turn/1",request:...}`; stdout
is `{text,toolCalls:[{toolCallId,toolName,arguments:"JSON object string"}]}`.
Codex uses `exec` with schema output and native shell/multi-agent disabled; Claude
uses print mode with native tools disabled. CLI-managed authentication and
configuration remain host responsibilities. Codex configuration may expose extra
MCP tools; use a dedicated CLI profile with those disabled for strict controlled
qualification. This interface constrains proposals, not the provider's hidden
reasoning or execution guarantees.

`--engine executable --engine-arg ARG` optionally supplies a UCI engine. Searches
use the pipeline's current policies (depth18 before/hypothetical preparation, depth20 actual-after opponent preparation, and depth18 ordinary tools). Engine-reported
name and actual completed depth are retained; short PVs are never fabricated.
The local analyzer now emits `mateInMoves` (signed moves); versioned pipeline
trace outputs retain legacy `matePly`. This is a documented
pre-publication API cleanup. Without an engine, unavailable search evidence stays
unavailable; mechanical chess tools still work.

`--input game.pgn --ply 3 --question "What changed?"` retains the exact root and
pre-move history. `--fen` declares a starting position with no claimed history.
`--scope` is explicit host input, not a synthetic Jev classification. `--batch`
accepts JSONL jobs with pgn/fen, question, ply and scope, sequentially. Output is
JSONL, including pipeline status, evidence/usage and qualification limits.
The default policy is the exported canonical base builder; it is not a claim
that the current website-selected prompt or stochastic answer quality matches.
Programmatic hosts can inject their chosen policy and routing preparation.

Cancellation kills the spawned process group and waits for stdio closure before
settlement. This handles ordinary descendants, not a deliberately daemonized
external program. External process input/output defaults to 2MB and each turn
times out after 120 seconds; these limits are configurable programmatically.
Missing token reporting stays unknown and consumes a conservative output-budget
reservation. CLI output limits are requested, not enforced by the transport.
Delegated output is never presented as pipeline/reference-validated.

Process-group cancellation is qualified on Linux. Windows uses direct-child termination; ordinary-descendant drain is not claimed there. Actual Claude CLI is unavailable in this environment; its print protocol is fixture-qualified only. A live Codex protocol attempt failed with authentication/401 diagnostics despite CLI login status; no successful provider answer is claimed.

## Standalone repository build

Use Node 24 or newer. From a clean checkout:

```sh
npm ci
npm run check
npm run pack:checked
```

The source snapshot is recorded in `SOURCE-ORIGIN.json`. This private preview
uses version `0.1.0-dev.8`; earlier `0.1.0-dev.1`, `0.1.0-dev.2` and `0.1.0-dev.3` artifacts remain immutable.
Internal dependencies are pinned archives in `vendor/npm`. Update an existing
dependency with `node scripts/update-dependency.mjs @knights-eye-chess/name
/absolute/path/package.tgz`, then run `npm ci` and `npm run check`. Review the
manifest, lockfile, archive hash and tests together before committing.
No registry, automatic CI or website deployment is required for these commands.

`pack:artifact` packs a temporary copy and records exact package versions for
sibling dependencies. Use it instead of bare `npm pack`; repository-local file
pins belong to the source build and are not published as consumer dependencies.

Native analyzer hosts may opt into `reuseProcess`, `threads`, and `hashMb` through
`createLocalAnalyzer`'s process-engine options. Dedicated single-thread searches
remain the default. Optional warm reuse rejects overlapping calls, fences output
before reuse, and drains cancellation/failure before a fresh process. The analyzer
retains observed PV node counts and optional `native-engine-search/1` diagnostics
from the process host without changing chess evidence or classification policy.
