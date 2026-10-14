#!/usr/bin/env node
// Read-only registry preflight. The npm registry remains authoritative on unpublish.
import { execFileSync } from 'node:child_process';

const readJson = url => JSON.parse(execFileSync('curl', ['-fLsS', url], { encoding: 'utf8' }));
const status = url => Number(execFileSync('curl', ['-LsS', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8' }));
const expected = new Map([
  ['@knights-eye-chess/cli-tools', ['0.0.0-stage', '0.1.0-dev.16', '0.1.0-dev.19', '0.1.0-dev.20']],
  ['@knights-eye-chess/pgn-annotator', ['0.0.0-stage', '0.1.0-dev.13', '0.1.0-dev.16', '0.1.0-dev.17']],
]);
const name = process.argv[2];
if (!expected.has(name)) throw Error('Unapproved package name.');
const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
const metadata = readJson(registryUrl);
const actual = Object.keys(metadata.versions ?? {}).sort();
if (JSON.stringify(actual) !== JSON.stringify([...expected.get(name)].sort()))
  throw Error(`Published version set changed; review again: ${actual.join(', ')}`);
if (!Array.isArray(metadata.maintainers) || metadata.maintainers.length !== 1)
  throw Error('Package does not have exactly one maintainer.');
const downloads = readJson(`https://api.npmjs.org/downloads/point/last-week/${name}`);
if (!Number.isSafeInteger(downloads.downloads) || downloads.downloads >= 300)
  throw Error(`Weekly downloads ${downloads.downloads} do not satisfy npm's under-300 policy.`);
if (name === '@knights-eye-chess/pgn-annotator') {
  const cliUrl = 'https://registry.npmjs.org/%40knights-eye-chess%2Fcli-tools';
  const cliStatus = status(cliUrl);
  if (cliStatus === 200 && Object.keys(readJson(cliUrl).versions ?? {}).length)
    throw Error('CLI Tools still has published versions depending on PGN Annotator.');
  if (cliStatus !== 200 && cliStatus !== 404) throw Error(`CLI registry dependency check unavailable: ${cliStatus}`);
}
console.log(`${name}: version set and single maintainer verified; ${downloads.downloads} downloads ${downloads.start}..${downloads.end}.`);
