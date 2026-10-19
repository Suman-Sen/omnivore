# Omnivae agent entry point

Read memory.md (including latest entries), rules.md, docs/delivery-contract.md and docs/handoff.md before changing code. The seven root specs are authoritative; source-inventory.json is an index, not a substitute.

Preserve full user scope: Android tablet APK and local source, customizable UI, optional local LLM, two-way voice and AI day/week/month scheduling. Do not silently reduce scope to a demo or deadline subset.

Use source requirements and test IDs for each implementation slice. Keep framework/storage/provider details out of pure domain code. Profile isolation must be enforced below UI. No AI writes without the required exact proposal approval.

Record commands, failures, root causes, fixes and evidence under logs; update memory/handoff at milestones. A required blocked/unrun test means incomplete, never completed. Historical baseline tables do not override newer verified session entries.

Use the project Android Gradle wrapper, JDK 21 and SDK Platform 36. Node 24 is the supported runtime. Machine-specific paths and signing material stay untracked. Never add the drive root to Git safe.directory.
