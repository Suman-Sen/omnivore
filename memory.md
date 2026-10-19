# Omnivae — Active Progress Memory

> Purpose: living engineering handoff and progress log for AGY/coding agents  
> Last consolidated: 2026-09-08  
> Rule: this file records **actual state**, not desired state. Never write `completed` without passing test evidence.

## 0. Read this first when resuming work

This file is the working memory of the Omnivae implementation. It should answer:

- What product are we building?
- What decisions are already locked?
- What phase are we in?
- What is actually implemented?
- What is implemented but not verified?
- What tests passed or failed?
- What remains open?
- What should the next agent do first?

Do not use this file to override `rules.md`, `prd.md`, or `architecture.md`. It is the **current-state log**.

---

# 1. Product identity

- Product name: **Omnivae**.
- Category: personal intelligence / life orchestration / personal operating system.
- Product principle: help the user plan, think, maintain wellbeing, reflect, and grow while preserving control of data and decisions.
- Health is a first-class pillar.
- AI is a controlled assistant, not an unrestricted autonomous owner of the user's life/data.

---

# 2. Locked product decisions

These decisions should be treated as active until explicitly changed:

- [LOCKED] Local-first core.
- [LOCKED] Privacy-first personal data model.
- [LOCKED] Core usage does not require a cloud account.
- [LOCKED] Multiple isolated profiles can exist on one device.
- [LOCKED] Optional modules; Job/Career is never mandatory.
- [LOCKED] Dashboard is configurable and reads from one underlying data model.
- [LOCKED] Daily/weekly/monthly/yearly progress is aggregated from source records.
- [LOCKED] Notes can become structured actions such as task/event/goal while preserving the source note.
- [LOCKED] Calendar must support powerful schedule copy/paste and templates.
- [LOCKED] AI can propose schedules/changes but controlled writes require approval.
- [LOCKED] Nightly reflection should understand the story/context of the day, not just checkbox completion.
- [LOCKED] Reflection/adaptive planning must avoid punitive behavior.
- [LOCKED] AI provider architecture is provider-agnostic.
- [LOCKED] BYOK API keys are stored securely and never logged/plaintext.
- [LOCKED] AI chats are local by default with delete/export/history controls.
- [LOCKED] AI memory is conceptually separate from raw chat history and is user-controlled.
- [LOCKED] Health data import is opt-in/permission-scoped.
- [LOCKED] Offline is a supported normal mode.
- [LOCKED] Optional future cloud sync must not destroy local-first architecture.
- [LOCKED] Every task/subtask/feature/phase must pass all required tests before it is marked completed.

---

# 3. Locked architecture baseline

The latest consolidated architecture baseline is:

```text
Next.js + React web/PWA
        +
Capacitor mobile wrappers
        +
Application/domain layer
        +
Storage abstraction
        ├── IndexedDB adapter (web)
        └── SQLite adapter (mobile)
        +
Secure credential abstraction
        +
Provider-agnostic AI layer
        +
Optional integrations/sync/cloud later
```

Additional locked architecture rules:

- modular monolith first,
- no Kubernetes/Kafka/microservices initially,
- no custom cryptography,
- stable UUID/ULID-class IDs,
- UTC/robust timestamps plus timezone-aware local semantics,
- domain logic does not import platform storage APIs,
- agents use controlled tools/proposals rather than raw database access.

Earlier Flutter exploration is not the active baseline. Reopening it requires an explicit architecture decision.

---

# 4. Current documentation set

Expected source-of-truth files:

```text
prd.md
architecture.md
rules.md
phases.md
schema.md
memory.md
testing.md
```

### Current documentation task status

| Artifact | Status | Verification |
|---|---|---|
| prd.md | completed | DOC-001..010 validation passed for current revision |
| architecture.md | completed | DOC-001..010 validation passed for current revision |
| rules.md | completed | DOC-001..010 validation passed for current revision |
| phases.md | completed | DOC-001..010 validation passed for current revision |
| schema.md | completed | DOC-001..010 validation passed for current revision |
| memory.md | completed (current revision; living) | DOC-001..010 validation passed; update after future work |
| testing.md | completed | DOC-001..010 validation passed for current revision |

Current documentation revision passed the documentation validation gate. Future edits must rerun DOC-001..010 before the edited documentation task is marked completed.

---

# 5. Application implementation status

No application repository/code implementation is asserted by this consolidated memory entry.

Because no complete current codebase/test results were provided as part of this documentation task, all implementation phases remain unverified and should be treated as 
ot_started` unless a future agent inspects the actual repository and records evidence here.

| Phase | Status | Evidence |
|---|---|---|
| 0 Repository + quality foundation | not_started | no repository test evidence in this memory |
| 1 Profile + storage | not_started | none |
| 2 Core planning | not_started | none |
| 3 Dashboard + progress | not_started | none |
| 4 Life modules | not_started | none |
| 5 Calendar power features | not_started | none |
| 6 BYOK AI chat | not_started | none |
| 7 AI memory + controlled proposals | not_started | none |
| 8 Nightly reflection | not_started | none |
| 9 Health core | not_started | none |
| 10 Health integrations | not_started | none |
| 11 Calendar integration | not_started | none |
| 12 Voice/rich notes/stylus | not_started | none |
| 13 User-owned sync | not_started | none |
| 14 Managed cloud | not_started | none |
| 15 Progress intelligence | not_started | none |
| 16 Ecosystem expansion | not_started | none |

**Important:** A future agent must inspect the repository before trusting this table. If code already exists, update the statuses based on code + test evidence, not assumption.

---

# 6. Core product modules remembered

## Core

- Dashboard
- Calendar
- Tasks
- Goals
- Notes
- AI Chat
- Analytics / Progress
- Settings
- Files

## High-priority optional/first-class

- Journal / Reflection
- Health
- Study
- Gym / Workouts
- Habits / Routines
- Projects

## Future optional

- Diet / Nutrition
- Job/Career
- Finance
- Reading
- Travel
- Languages
- Relationships
- Custom modules/plugins

---

# 7. Important UX behaviors to preserve

## Calendar copy/paste

Required direction:

- copy an entire day,
- paste to another day,
- paste same schedule to multiple days,
- separate weekend schedule patterns,
- copy an entire week,
- paste to other weeks,
- apply forward across longer ranges/months,
- templates,
- conflict preview,
- atomic commit.

This must not regress into only "duplicate one event."

## Nightly reflection

Required direction:

- user tells what actually happened via text/voice when available,
- AI understands contextual reasons,
- AI may ask follow-ups,
- user narrative stays preserved,
- AI may propose progress/task/calendar updates,
- confirmed updates are applied,
- future schedule can adapt,
- missed tasks are not automatically treated as failure.

## Health

Required direction:

- smartwatch-like dashboard quality,
- normalized health metric model,
- manual/local data can work without a wearable,
- future platform health sources such as Health Connect/Apple Health,
- vendor/BLE integrations later as justified,
- data source attribution and permission scoping,
- AI health access off or explicit by default policy.

## AI

Required direction:

- local model and hosted model support through adapters,
- BYOK,
- local chat history,
- user deletion controls,
- user-controlled memory,
- controlled agent tools,
- proposal → preview → approval → domain write.

---

# 8. Open decisions

Do not silently close these.

| Decision | Status | Notes |
|---|---|---|
| Exact design system/component library | open | must fit premium responsive UI |
| Monorepo tooling | open | choose mature low-risk option if needed |
| IndexedDB wrapper | open | must satisfy repository/migration needs |
| SQLite library/plugin | open | must fit Capacitor/native targets |
| Secure storage implementation | open | production security review required |
| Local encryption/key hierarchy | open | never custom crypto |
| First hosted AI provider(s) | open | provider-neutral interface comes first |
| First local model runtime adapter | open | Ollama/LM Studio class support planned |
| Exact AI memory capture policy | open | user control is locked; algorithm is open |
| First health platform integration | open | Health Connect/Apple Health are expected candidates |
| First external calendar provider | open | adapter design comes first |
| Guest persistence default | open | UX must make retention behavior explicit |
| Voice transcription/TTS provider | open | manual flows cannot depend on it |
| User-owned sync target | open | phase 13 |
| Managed cloud provider stack | open | phase 14 |
| Monetization | open | not needed for foundation |

When an open decision is resolved:

1. record date and decision below,
2. update relevant spec,
3. add ADR if architectural,
4. add/update tests if behavior changes.

---

# 9. Architecture decision log

Use append-only entries; do not rewrite history without reason.

## ADR-MEM-001 — Product name Omnivae

- Status: accepted
- Decision: use **Omnivae** as product/project name.
- Consequence: migrate historical LifeOS labels when touching relevant code/docs.

## ADR-MEM-002 — Local-first modular monolith

- Status: accepted
- Decision: local-first modular monolith with ports/adapters; cloud optional.
- Consequence: no mandatory backend for core personal data.

## ADR-MEM-003 — Web + Capacitor baseline

- Status: accepted
- Decision: Next.js/React/PWA shared application with Capacitor mobile wrappers, storage adapters for IndexedDB/SQLite.
- Consequence: earlier Flutter idea is superseded unless explicitly reopened.

## ADR-MEM-004 — Controlled AI writes

- Status: accepted
- Decision: AI/agents propose changes; validated writes happen after required approval through domain commands.
- Consequence: no direct LLM database access.

---

# 10. Risks to watch

## R1 — Feature sprawl

Omnivae can easily become ten apps at once. Preserve phase order and modularity.

## R2 — AI before reliable data

Building advanced agents before tasks/calendar/reflection/history are reliable produces shallow intelligence. Capture trustworthy source data first.

## R3 — Cross-profile leakage

One unscoped repository/search/cache can violate the central privacy promise. Isolation tests are mandatory.

## R4 — Cloud-first drift

Adding auth/sync too early may make offline/local mode second-class. Prevent this through architecture and tests.

## R5 — Health integration complexity

Vendor integrations have different metric definitions/permissions. Normalize carefully and preserve source semantics.

## R6 — Calendar bulk-copy edge cases

DST, midnight boundaries, recurrence, conflicts, and partial failures can corrupt schedules. Use pure transform planning + atomic commit.

## R7 — AI approval bypass

UI convenience must never allow a model output to bypass domain validation/approval.

## R8 — Documentation status inflation

Agents may be tempted to mark checklists complete after implementation but before verification. `testing.md` forbids this.

---

# 11. Required agent session protocol

At the beginning of a coding session:

```text
1. Read memory.md
2. Read rules.md
3. Read relevant PRD/architecture/schema/testing sections
4. Inspect actual repository status and git diff
5. Run baseline tests for the affected area if practical
6. Update current work item to in_progress
```

At the end:

```text
1. Run all required test cases
2. Record commands and results
3. Update status accurately
4. Record migrations/schema changes
5. Record unresolved failures/blockers
6. State next safest action
```

---

# 12. Progress-entry template

Copy this block for every meaningful implementation session.

```markdown
## YYYY-MM-DD — <short session title>

### Requested scope
- ...

### Status
- overall: in_progress | implemented_unverified | failed_tests | blocked | completed

### Changes made
- module/file: change
- ...

### Schema/migrations
- none | <migration id and summary>

### Tests added/updated
- <test id/name>: <purpose>

### Test commands run
- `<command>`

### Test results
- PASS: ...
- FAIL: ...
- SKIPPED/BLOCKED: ...

### Completion decision
- NOT COMPLETE because ...
  OR
- COMPLETED because all required tests <list/gate> passed.

### Open decisions/blockers
- ...

### Next action
- ...
```

---

# 13. Test-evidence format

For any completed feature, memory must contain something like:

```text
Feature: calendar day-copy
Status: completed
Required gate: P5-GATE-CALENDAR-BULK / day-copy subset
Evidence:
- unit: calendarCopyTransforms.test.ts — 18/18 passed
- integration: calendarBulkCommit.test.ts — 9/9 passed
- e2e: calendar-copy-day.spec.ts — 6/6 passed
- typecheck: passed
- lint: passed
- regression suite: passed
Commit/build: <hash if available>
```

If this evidence is absent, do not trust a `completed` label.

---

# 14. Current next recommended action

After this documentation consolidation is validated, the next implementation action is:

1. Inspect or create the Omnivae repository.
2. Compare actual code to Phase 0 requirements.
3. Run existing tests if any.
4. Update this memory with discovered real state.
5. Start the earliest incomplete phase rather than jumping directly to advanced AI.

If a codebase already exists, **do not initialize over it**. Audit it first.

---

# 15. Session log

## 2026-09-08 — Documentation consolidation

### Requested scope

Create agent-ready:

- `prd.md`
- `architecture.md`
- `rules.md`
- `phases.md`
- `schema.md`
- `memory.md`
- `testing.md`

based on the accumulated Omnivae discussions.

### Status

- overall: `completed`

### Changes made

- consolidated product requirements,
- consolidated architecture baseline,
- defined strict engineering/agent rules,
- defined staged implementation plan,
- defined logical data/backend schema,
- created active memory/handoff structure,
- created binding feature-testing/completion contract.

### Tests added/used

- `DOC-001` required files exist
- `DOC-002` non-empty valid UTF-8
- `DOC-003` Omnivae naming / historical-name check
- `DOC-004` completion-rule consistency
- `DOC-005` phase gate references resolve
- `DOC-006` core invariant coverage
- `DOC-007` schema coverage
- `DOC-008` memory status truthfulness
- `DOC-009` Markdown code-fence balance
- `DOC-010` basic embedded-secret scan

### Test command

- custom documentation validation script executed against `/mnt/data/omnivae-specs`

### Test results

- PASS: DOC-001
- PASS: DOC-002
- PASS: DOC-003
- PASS: DOC-004
- PASS: DOC-005
- PASS: DOC-006
- PASS: DOC-007
- PASS: DOC-008
- PASS: DOC-009
- PASS: DOC-010
- failing required documentation tests: 0
- skipped required documentation tests: 0

### Completion decision

- COMPLETED for the current documentation revision because all required documentation tests DOC-001..010 passed.
- This does **not** mean any application implementation phase is completed. Those remain 
ot_started` until repository inspection and phase test evidence prove otherwise.

### Next action

- inspect or initialize the actual Omnivae repository, run any existing tests, update this memory with discovered implementation state, and begin the earliest incomplete implementation phase.

## 2026-09-25 — Active foundation implementation

- Phase 0: in_progress. Historical September 8 tables above are the prior baseline.
- New user requirements are in docs/delivery-contract.md: Redmi Pad 2 Pro 8 GB, APK and local PC source, customizable glass/solid/high-contrast UI, AI day/week/month scheduling, conversational edits and approval, two-way voice, optional on-device inference, structured logs. Target October 7; no automatic deferral of original scope.
- Created isolated Git repository, Next.js static-export preview, Capacitor config, profile/storage/AI/voice ports, source inventory and foundation checks.
- npm install --no-audit --no-fund: PASS, 125 packages installed. Transitive uuid@7 deprecation warning to investigate.
- npm run typecheck: PASS. Production build started; outcome not yet recorded.
- node --test tests/foundation.test.mjs: PASS 3/3, zero skipped. Basic boundary/config checks only, not full Phase 0 gate.
- Source inventory: 910 sections initially indexed, semantic mappings pending. Regenerate after source changes. Inventory validation does not prove DOC-001..010 all pass.
- Actual Android SDK root: D:/Users/suman/AppData/Local/Android/Sdk/platform-tools. Nested platform-tools/adb.exe verified 37.0.1. Platform android-37.0 found.
- Java 17.0.20.1 verified at D:/Program Files/Java/jdk-17.0.20.1. Android Studio JBR 25.0.3 verified at D:/Program Files/Android/Android Studio/jbr. Wrapper and compile SDK compatibility still need checking.
- Environment issue: sandbox process helper fails with helper_unknown_error: setup refresh had errors. Required commands/edits run through explicit approved escalation; sandbox not claimed repaired.
- No actual profile persistence, AI, voice or APK verified. Lint/E2E/security/Android gates outstanding. Continue from source, package lock and logs; do not restart scaffold.

## 2026-10-02 — Redmi installation and cold launch

- User authorized retry after tablet-side installation restriction.
- Target serial 7f59b005f2af, Redmi model 25099RP13I: authorized ADB device.
- Existing debug APK SHA256: 93B3472BC710B74B327ECB652963541A304B45650B6DA205995F29F71FE64AB9.
- adb -s 7f59b005f2af install -r android/app/build/outputs/apk/debug/app-debug.apk: Success.
- adb -s 7f59b005f2af shell am start -W -n app.omnivae.personal/.MainActivity: Status ok, COLD, TotalTime 1108 ms; process 9076 present.
- Scoped logcat for process 9076 reports Capacitor/Console: Error injecting safe area CSS: TypeError: Cannot read properties of null (reading 'style'). Source located at node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java:270. Open defect; no fix or visual verification claimed.
- Initial installation failure INSTALL_FAILED_USER_RESTRICTED resolved by user-assisted retry. This was a device installation restriction, not an app crash.
- Installed APK contains the shell and appearance preview only. Profiles, planning, AI and voice are not delivered in this APK.
- Disabled profile prototype exists in packages/application/profile-service.ts, packages/crypto/web-crypto-profile.ts, packages/storage-indexeddb/profiles.ts and packages/storage-sqlite/profiles.ts. Earlier session reported 8 profile tests passing and TypeScript passing; native adapter, full logical schema reconciliation and migrations remain unverified.
- Phase 0 remains in_progress: offline launch, restart, rotation/appearance inspection, clean dependency replay and complete gate review remain pending. Next: diagnose SystemBars startup timing and verify on-device layout, then continue profile implementation.

## 2026-10-02 — ANDROID-001 regression verified

- Configured plugins.SystemBars.insetsHandling=native in capacitor.config.ts. Installed Capacitor code supports native padding while avoiding early document.documentElement.style injection. No vendor files modified.
- capacitor copy android: pass. Gradle assembleDebug: BUILD SUCCESSFUL in 1m13s. Updated APK installed successfully.
- APK SHA256: 03CAD1352236191AADF4A1BBC827F84E13976D2423129D7C89386D8634D9C97F.
- Node24 tsc --noEmit and eslint capacitor.config.ts scripts/check-tablet.mjs --max-warnings=0: exit0.
- Node24 scripts/check-tablet.mjs with explicit adb path and tablet serial: exit0; three bounded cold launches passed (830/738/689ms). Each checked glass/solid/high-contrast controls, no horizontal overflow at 1280x754, simulated WebView offline reload and process-scoped startup logs. Original safe-area exception absent in all three. Evidence: logs/device/2026-10-02-tablet.json.
- OEM MI-PreRender/FramePredict diagnostics remain; no fatal exception observed in sampled app logs. Do not claim all system diagnostics eliminated.
- ANDROID-001 targeted startup regression passed. Full device/phase gate remains incomplete: physical airplane-mode test, rotation, visual accessibility review and other foundation gates pending.
- A concurrent live-log write failed with EBUSY while Gradle Tee-Object held the file. No app failure; reran code checks directly after avoiding concurrent log writers, exit0. Serialize live-log writers until logging concurrency is improved.
- Next safe step: continue remaining foundation device gates and disabled profile implementation; AI/scheduling/voice remain outstanding scope.

## 2026-10-03 — Profiles and core planning implementation milestone

- Full requested scope remains active; no full-product or phase completion claim.
- Implemented password profile creation/chooser/unlock/lock, encrypted persistent settings, browser IndexedDB and native SQLite composition root. Backgrounding locks the UI and invalidates the session.
- Added version 2 profile migration and version 3 encrypted per-record storage, atomic snapshot/revision checks, task/goal/note/event/milestone/journal application services and usable UI. Source notes survive reviewed conversions. Task transitions are durable. Goal progress is derived from source tasks/milestones. Dates include explicit DST gap/fold handling and exclusive all-day end dates.
- Browser offline static-shell caching and offline CRUD/reload workflows added.
- 20 unit/integration tests passed at core milestone; 6/6 browser flows passed at three viewport sizes. Two SQLite migration tests additionally pass after native failure fix. Typecheck and lint passed before subsequent dashboard additions; rerun current revision.
- Native first launch failed because migration version 1 passed multiple SQL commands as one statement. Fixed statement registration after inspecting installed source and upstream docs. Added regression tests using real SQLite. No tablet data cleared.
- Native harness then failed on an overly exact getByLabel profile selector (label includes option text); replaced with accessible combobox name. This was a harness selector defect, not data loss. Removed attempted reload workaround.
- Device verification now passes on Redmi 7f59b005f2af: two profiles, wrong password rejection, settings isolation, cold process restart, encrypted settings, schema v3, real SQLite task creation/completion/reload. Evidence logs/device/2026-10-03-profiles.json. These are targeted cases, not full STORE-002 conformance or full P1/P2 gates.
- Dashboard widget ordering/visibility, Journal module toggle and source-based day/week/month/year progress added next; current revision verification in progress.
- Required remaining scope includes fuller profiles/security/accessibility/migration gates; files/attachments, life modules/health, calendar bulk/templates, AI chat/memory/proposals/reflection, two-way voice, on-device inference, integrations and later optional phases. Do not present the installed development APK as finished.

## 2026-10-04 — Current source checkpoint
- Dashboard milestone full verify passed before life additions: 25 tests plus 6 browser flows, type/lint/build. See session logs.
- Study/workout/manual health code exists; only typecheck verified, incomplete.
- Latest task/goal time slice: exact dueAt UI, goal targetAt/timezone, date-only fallback and visible created/updated/scheduled times. Planning tests 8/8 and typecheck passed. Browser/tablet verification pending; installed APK does not include latest source.
- Daily clickable calendar, online Gemini/OpenAI and on-device LLM remain unfinished scope. User also requests later user-defined phone notifications, completion/time-up/extend interactions and automatic history; NOTIFY-010..013 recorded, not implemented.
## 2026-10-05 latest active checkpoint
Earlier shell-only and pending native entries are historical. Organized layout, hex/background settings and custom sections were installed and verified (38 unit/integration, 18 browser cases, native section restart/isolation; APK SHA256 00384871C62F38C94E2C0D600967E53AE4D80BB05613C3E414570600FF8AD490).
User then requested per-section colors/transparency, profile deletion, History, dashboard chart choices, cherry blossom calendar gallery, image-only transparency, font/color controls and chronological selected-date tables. These are implemented in source; latest verification is running in logs/sessions/2026-10-05-personalization-verify.log. 41 unit/integration passed before production build failed on misplaced use-client directive; fixed directive ordering and rerunning. No completion claim before final browser/native result. Schema v5 adds encrypted gallery and profile deletion covers it. Offline LLM/Pocket LLM/Ollama is not integrated; no external model installation was performed. Full original scope remains open.
## 2026-10-05 verified personalization milestone
42 unit/integration checks passed; full lint/type/build passed separately after documented harness/directive fixes. 24/24 browser workflows passed. Native SQLite v5 calendar gallery, image-only transparency/font settings, History, chart/section persistence and profile+vault erasure passed, preserving every pre-existing profile ID. See logs/sessions/2026-10-05-personalization.md and associated evidence. Visual review triggered compact calendar spacing; final focused browser/reinstall checks are pending at this entry. Full app/phase completion remains unclaimed; offline LLM and voice not implemented.

## Final spacing build — installation blocked by disconnect
Final production build and six affected browser cases passed. APK SHA256 533AFF69F0186C25177E4BD8749536C3F8BB81A7ED83EA68057D18D25EC3B960. Gradle succeeded after unusually long 18m12s; adb install then failed: device 7f59b005f2af not found. The existing personalization-device.log is from the PREVIOUS installed build, whose native checks passed. Final compact-spacing native installation/visual review remains unrun. Asked user to reconnect; never clear existing app data. On reconnect install -r final APK, then run scripts/check-personalization-tablet.mjs with known adb/serial and inspect calendar/month table images. Full 24 browser cases passed before CSS compact adjustment; six affected cases passed after. 42 unit/integration checks passed; type/lint/build/docs checks passed separately. User requested done/not-done report: docs/implementation-status.md now tracks this state. Offline local model/voice, integration and broader original gates remain open.

## Final installed checkpoint — supersedes preceding disconnect/pending entries
Tablet reconnected. Final seven-column calendar APK installed successfully; SHA256 2F13D5B4BC6ACF3D6E1AF8AAE9EAA690579AA51BB453157E1C798753D1B7C008. Native harness passed on final artifact; month and chronological table screenshots visually inspected. Final grid geometry browser cases 3/3 passed, earlier compact calendar/planning 6/6 passed, full functionality browser suite 24/24 passed before final CSS-only adjustments. Unit/integration42 passed; lint/type/build/docs checks passed separately. All original profiles retained, temporary verification profile deleted with native provider vault entries. No required whole-phase/release certification implied. See docs/implementation-status.md for the complete working/partial/missing comparison. Next major work remains fuller core/life gates, bulk calendar/templates, real hosted provider checks, offline inference/voice and preserved original scope.

## 2026-10-05 — Start-page forgetting and full calendar skin installed
Implemented PROF-FORGET-001 and CAL-SKIN-002. Start-page Forget profile erases selected local profile without password only after exact name and explicit checkbox; protected contents are never decrypted. Guard rejects active sessions/changed selection. Separate provider-vault cleanup and atomic database erasure preserve all other profiles. This explicit device-local erasure policy is recorded in delivery-contract.md.
Calendar image now covers the main panel (month through daily table/Add event), not merely the border. Verified visually on Redmi. APK installed SHA256 4EC976239DAF9AA00E762D0DAF4090FEAED41FB7FED0A3B699220C29ACB447FB. Native script passed, including synthetic locked-chooser erasure, provider vault cleanup, restart and prior-profile-ID retention. Evidence logs/sessions/2026-10-05-forget-device.log; screenshots logs/device/2026-10-05-calendar.png and calendar-table.png.
43 unit/integration checks, typecheck/lint/build passed. Browser run 24/27 passed initially: three appearance assertions incorrectly expected active-calendar transparency while Settings was selected. Restored the correct inactive Settings expectation; all three rerun passed (forget-appearance.log). The active-calendar test separately asserts transparent content plus full-area background pseudo-element. No production code changed after build to fix tests.
User then asked AI to auto-create schedules. Existing structured day/week/month proposals and exact approval remain; real provider/model not verified. Asked provider choice and existing-vs-new key question under openai-platform-api-key skill; no environment key found (presence only checked). Awaiting user answer before further API work. Notifications, two-way voice and local Pocket LLM/Ollama remain unimplemented. Full scope retained.

## 2026-10-06 — Offline implementation in progress
Hosted Gemini project denied generation; new-key tablet diagnostics later hit absent credential/model and harness selector timeouts, not proof of working new project. User prioritizes standalone AI plus voice. Added native LiteRT-LM 0.17.1 model import/inference, offline provider selection, on-device-only recognition, offline English TTS and push-to-talk controls. Model import/license download pending; native/model/voice gates unverified. See docs/offline-ai.md. First verification caught Windows CP1252 UI output; corrected to UTF-8. Offline transport/cancellation tests added; 48 unit/integration tests pass, remaining checks running. Native Gradle dependency build running. No completion or installation claim.
