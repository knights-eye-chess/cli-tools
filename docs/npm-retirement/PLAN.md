# Manual npm removal after app cutover

The owner asked to delete the two old npm packages after the independently tested app split is deployed, while keeping their GitHub repositories. No migration release or deprecation is needed. This plan records the current feasibility and the exact manual removal path; no unpublish command has run.

Official npm policy: <https://docs.npmjs.com/policies/unpublish/>. Both packages were created 10 October 2026, more than 72 hours ago. For an older package npm requires no public-registry dependents, fewer than 300 downloads in the last week, and one maintainer. `npm unpublish PACKAGE --force` requests removal of every version; npm's server is authoritative. A removed version cannot be reused, and an entirely removed package name cannot be republished for 24 hours.

Current read-only registry evidence:

| Package | Versions | Last-week downloads (6–12 Oct) | Maintainers | Known blocker |
| --- | --- | ---: | ---: | --- |
| `@knights-eye-chess/cli-tools` | stage, dev.16, dev.19, dev.20 | **314** | 1 | Above npm's under-300 threshold. |
| `@knights-eye-chess/pgn-annotator` | stage, dev.13, dev.16, dev.17 | 291 | 1 | Published CLI dev.16/dev.19/dev.20 depend on its exact matching versions. |

The current app `package.json` and lockfile also directly pin both old packages; its offline replay script imports CLI Tools. The split app must remove those references, deploy, and pass relevant checks before dispatch. Download counts do not identify users. The workflow reports a count above npm's policy threshold but allows one server-authoritative attempt after cutover; if npm rejects it, stop and report the response. Do not attempt version-by-version removal or switch to deprecation.

The manual-only [workflow](../../.github/workflows/npm-unpublish.yml) runs on CLI Tools `dev`. It accepts only the two named packages. Dispatch requires the exact reviewed workflow commit SHA, verified deployed app SHA, and an operator-verified cutover receipt URL in the private app repository. The guard checks the input formats and repository/ref; the operator verifies the receipt and deployed, tested app before dispatch. The [read-only preflight](../../scripts/verify-unpublish-eligibility.mjs) checks the hardcoded version inventory and maintainer count. PGN removal also requires CLI Tools to have no published versions. Only the final unpublish step receives the repository or organization `NPM_TOKEN` secret. The workflow never runs automatically.

After the app split is deployed and tested:

1. Record the app deployment commit, an operator-verifiable cutover receipt in the private app repository, and the exact reviewed CLI Tools `dev` workflow commit. Verify the deployed app no longer installs or imports either old package and that the public composition examples work.
2. Ensure `NPM_TOKEN` has npm removal access. If any package version changed, revise the hardcoded inventory and review the new workflow head before dispatch.
3. Dispatch the workflow for **CLI Tools first**. If npm rejects the request, stop and record its reason. Do not dispatch PGN Annotator while CLI Tools versions remain published.
4. After confirming CLI Tools is absent from the registry, dispatch the same workflow for **PGN Annotator**. Verify both packages are absent. Keep their source repositories and historical release records.

This workflow is reviewable now. Dispatch waits for the actual deployed and tested split app; no additional owner approval is being requested.
