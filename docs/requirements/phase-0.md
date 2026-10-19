# Phase 0 verification map

Status: in_progress. Historical baseline table below is superseded by docs/implementation-status.md and latest memory/handoff entries. This map does not certify the full foundation or product.

| Requirement | Implementation | Evidence / remaining gate |
|---|---|---|
| FND-001 reproducible dependencies | npm workspaces, package-lock.json | install passed; clean npm ci replay still required |
| FND-002 production web build | apps/web/next.config.ts, static export | September 25 passed; current revision rebuilding |
| FND-003 strict typecheck | tsconfig.json, workspace config | current verification passed |
| FND-004 lint | ESLint with Next rules, explicit first-party paths | current verification passed after Link fix |
| FND-005 unit runner | tests/foundation.test.mjs | 3/3 passed |
| FND-006/007 browser shell/navigation | tests/e2e/shell.spec.ts | prior 3 viewport checks passed; current build replay pending |
| FND-008 pure domain boundary | packages/domain, import check | initial boundary test passed; expand checks as imports grow |
| FND-009 secret detection | scripts/verify-docs.mjs | baseline key/token pattern scan passed; scope is documented, not full audit |
| FND-010 installed offline shell | Android bundled static assets; PWA caching not yet implemented | native build/device launch pending; no offline pass claim |
| Mobile shell | capacitor.config.ts, android project | add/sync passed; assembleDebug running |
| Layer seams | packages/domain/application/storage/ai/config | contracts only; adapters and security implementation are Phase 1 |
| Appearance direction | apps/web/app/page.tsx and styles.css | preview only; profile persistence not implemented |
| Reproducible quality command | scripts/verify.mjs | runs fail-fast; native/device gates remain separate |
| Visible working logs | scripts/run-visible.mjs, logs/live-work.txt | user requested visible log window; subsequent commands stream output |

All original specs and delivery-contract acceptance criteria remain indexed in source-inventory.json. Most semantic mappings remain pending; this map makes no claim of full requirements decomposition.
