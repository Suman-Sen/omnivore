# Omnivae

Local-first personal intelligence for Android tablets and web. Primary device: Redmi Pad 2 Pro (8 GB).

## Status

Active development: encrypted local profiles, core planning, manual life modules, appearance and editable sections exist with targeted test evidence. Hosted AI/proposals have simulated-provider coverage; voice, local inference and many documented features remain unfinished. No full phase or release gate is complete. See [implementation status](docs/implementation-status.md) for the current feature-by-feature report.

The seven root specification files are authoritative. Read docs/delivery-contract.md and docs/handoff.md before continuing.

## Development

Node 24+, npm. Run npm install, npm run dev. Production: npm run build (static assets in apps/web/out). Android: npm run android:add once, then npm run android:sync. Use the generated android/gradlew.bat for native builds, with the compatible JDK and SDK configured locally.

## Checks

npm test, npm run typecheck, npm run verify:docs. npm run verify runs docs/unit/type/lint/build/browser checks; native device gates are separate. Offline PWA caching and Android bundled assets are implemented. Passing the selected suite does not certify all specification gates.

## Layout

- apps/web: Next.js static-export presentation.
- packages/domain: framework-independent domain contracts.
- packages/storage: profile-scoped persistence and secret ports.
- packages/ai: provider-neutral inference/voice contracts.
- docs: requirements and architectural decisions.
- logs: session evidence and sanitized issue resolutions.
- tests: verification.

No signing credentials, personal exports, or real API secrets belong in Git.

