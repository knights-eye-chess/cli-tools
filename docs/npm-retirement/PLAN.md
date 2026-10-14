# Read-only npm removal feasibility, 14 October 2026

The owner asked to delete the two old npm packages after the independently tested app split cutover, while keeping their GitHub repositories. The old migration/deprecation proposal is superseded. No unpublish or deprecation command has run.

Official npm policy: <https://docs.npmjs.com/policies/unpublish/>. Both packages were created 10 October, more than 72 hours ago. For an older package npm requires **all** of: no package in the public registry depends on it, fewer than 300 downloads in the last week, and one maintainer. `npm unpublish PACKAGE --force` removes every version; npm says a removed version cannot be reused and an entirely removed package name cannot be republished for 24 hours. The registry's response remains authoritative. Do not attempt a version-by-version workaround or switch to deprecation, since the owner explicitly requested deletion.

Current read-only registry evidence:

| Package | Versions | Last-week downloads (6–12 Oct) | Maintainers | Known blocker |
| --- | --- | ---: | ---: | --- |
| `@knights-eye-chess/cli-tools` | stage, dev.16, dev.19, dev.20 | **314** | 1 | Above npm's under-300 threshold. |
| `@knights-eye-chess/pgn-annotator` | stage, dev.13, dev.16, dev.17 | 291 | 1 | Published CLI dev.16/dev.19/dev.20 depend on its exact matching versions. |

The current app `package.json` and lockfile also directly pin both old packages; its offline replay script imports CLI Tools. The split app must remove those references, deploy, and pass relevant checks before package removal. Registry download counts are not proof of who uses the packages. An external reverse-dependency audit and npm's server-side rejection are still necessary.

The draft `npm-unpublish.yml` and `verify-unpublish-eligibility.mjs` in this directory are **not active workflows**. To make them reviewable after the cutover:

1. Verify the deployed app commit and tests, clean component graph, public examples replacement, and absence of the old packages in app/service package manifests and imports. Record the exact deployed commit. Do not alter the retained GitHub repositories.
2. Place both draft files in the CLI Tools repository at `.github/workflows/npm-unpublish.yml` and `scripts/verify-unpublish-eligibility.mjs`. Keep the script's hardcoded version sets current; any new version requires review. Configure an `npm-retirement` GitHub environment with required reviewers **before** merging the workflow. Confirm the org/repo `NPM_TOKEN` secret grants removal access to both packages; the draft exposes it only to the unpublish step.
3. Obtain exact-head review of the workflow, script, cutover evidence, registry eligibility and known external consumers. Root then explicitly authorizes dispatch. The workflow accepts only the two named packages, only on CLI Tools `dev`, and checks the reviewed workflow head SHA, deployed app SHA format and explicit cutover confirmation. It performs a read-only registry check before the destructive step.
4. Once weekly CLI downloads fall below 300 and no public package depends on it, dispatch **CLI Tools first**. `--force` is npm's documented syntax for all versions, not a bypass of registry policy. If npm rejects removal, stop and report its reason; do not delete PGN Annotator.
5. Confirm the CLI package has no published versions, recheck PGN's weekly downloads and external dependencies, then dispatch **PGN Annotator**. Verify both registry packages are absent. Keep source GitHub repositories and their historical release records.

No workflow is to be activated or dispatched before root confirms the app split is deployed and tested. Current blockers make both removals ineligible now.
