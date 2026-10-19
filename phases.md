# Omnivae — Implementation Phases

> Status: Active implementation roadmap  
> Version: 1.0  
> Last consolidated: 2026-09-08  
> Governing rule: **A phase/task/subtask is not complete until all required tests pass.**

## 0. How to use this plan

This document defines implementation sequence and gates. It is written for AGY/coding agents so work can continue across sessions without losing architectural intent.

For each phase:

1. Read the relevant PRD sections.
2. Read architecture/schema constraints.
3. Implement only the phase scope plus necessary seams.
4. Add tests as defined in `testing.md`.
5. Run the phase gate.
6. Update `memory.md` with exact test evidence.
7. Mark the phase complete only if every required gate passes.

Status vocabulary:

- `not_started`
- `in_progress`
- `implemented_unverified`
- `blocked`
- `failed_tests`
- `completed`

Do not use `completed` without passing evidence.

---

## Phase 0 — Repository, quality gates, and product shell

### Objective

Create a stable workspace that can support local-first web/mobile development without premature feature work.

### Deliverables

- monorepo/workspace scaffold,
- Next.js + React web app,
- Capacitor mobile shell/configuration,
- shared package structure,
- TypeScript strict configuration,
- lint/format/typecheck scripts,
- unit/integration/E2E test runners,
- CI pipeline or reproducible local quality command,
- environment/config strategy with no real secrets committed,
- basic route/navigation shell,
- feature flag mechanism,
- error boundary/global error handling baseline,
- docs folder containing the seven source-of-truth docs.

### Required architectural seams

- `domain` package has no framework/vendor dependency,
- `application` layer can call repositories through interfaces,
- storage adapter interface exists even if minimal,
- secure-secret abstraction/interface exists even if production adapter is deferred,
- AI provider interface placeholder may exist but no provider coupling.

### Exit tests

- clean install/build,
- typecheck,
- lint,
- unit test smoke,
- app boots in browser,
- mobile shell can be generated/built to the extent supported by the environment,
- no committed test secret detected,
- route smoke test passes.

### Gate

`P0-GATE-FOUNDATION` in `testing.md` must pass.

---

## Phase 1 — Local profile, session, and storage foundation

### Objective

Make local-only Omnivae real: a user can create/unlock an isolated profile and persist data through the storage abstraction.

### Deliverables

- local profile entity,
- profile settings,
- local profile chooser,
- local profile creation,
- password/PIN protection baseline,
- biometric adapter seam for supported platforms,
- local session/context,
- profile lock/logout,
- IndexedDB adapter,
- SQLite adapter or mobile-compatible storage adapter skeleton moving toward SQLite,
- repository conformance test suite,
- schema migration/version framework,
- secure credential store interface + platform adapters as available,
- multiple-profile isolation rules enforced at repository/application level.

### Important rules

- Email/cloud account is not required.
- Raw PIN/password is never persisted.
- Profile ID is not accepted blindly from UI for privileged data operations.
- Business logic cannot import IndexedDB/SQLite APIs.

### Exit tests

- create Profile A and Profile B,
- data written in A cannot be queried in B,
- wrong unlock credential fails,
- lock clears active profile access,
- storage survives reload/app restart,
- migration from empty v0 to current works,
- repository conformance passes on implemented adapters,
- secrets are not present in primary app tables/logs.

### Gate

`P1-GATE-PROFILE-STORAGE` must pass.

---

## Phase 2 — Core planning domain: tasks, goals, notes, basic calendar

### Objective

Deliver a useful local-first planning system before AI.

### Deliverables

#### Tasks

- create/read/update/delete/archive semantics,
- status and completion,
- priority,
- due/scheduled time,
- optional links to goals/projects/notes.

#### Goals

- CRUD,
- status,
- target date,
- optional parent/child hierarchy,
- evidence/link model baseline.

#### Notes

- CRUD,
- search baseline,
- pin/favorite metadata if chosen,
- entity links,
- conversion to task/event/goal through review flow.

#### Calendar

- local event CRUD,
- timed/all-day behavior,
- timezone semantics,
- entity linking,
- no external sync yet.

### Exit tests

- module CRUD unit/integration tests,
- profile isolation tests for every module,
- offline E2E CRUD flows,
- note conversion preserves source note,
- task completion is durable after reload,
- all-day and timezone-aware calendar cases,
- linked entity deletion follows documented behavior.

### Gate

`P2-GATE-CORE-PLANNING` must pass.

---

## Phase 3 — Dashboard, module configuration, and progress foundation

### Objective

Create the configurable command center and one consistent aggregation model.

### Deliverables

- dashboard layout persistence,
- widget enable/disable/reorder,
- profile picture/avatar metadata,
- core widget set,
- module registry,
- optional module enable/disable,
- day/week/month/year progress filter,
- progress projection/aggregation service,
- source-record-based analytics foundation,
- dashboard offline behavior.

### Rules

- Career/Job disabled by default unless product owner changes onboarding default.
- Disabled module widgets do not render.
- No separate mutable weekly/monthly/yearly truth tables.

### Exit tests

- widget layout persists per profile,
- profile layouts remain isolated,
- module toggles affect navigation/dashboard correctly,
- aggregates equal source records,
- changing range does not mutate data,
- timezone boundary tests pass,
- dashboard renders offline from local data.

### Gate

`P3-GATE-DASHBOARD-PROGRESS` must pass.

---

## Phase 4 — Habits, Study, Gym, Journal, Files

### Objective

Add the first set of life-domain modules while preserving modularity.

### Deliverables

#### Habits/Routines

- habit definition,
- recurrence baseline,
- completion records,
- pause/archive,
- streak derived from completion history.

#### Study

- topics,
- sessions,
- planned/actual duration,
- goal/skill links.

#### Gym

- workout sessions,
- exercises,
- sets/reps/load/duration,
- notes.

#### Journal

- text entries,
- manual daily reflection,
- separate user narrative fields suitable for later AI summaries.

#### Files

- profile-scoped attachment metadata,
- local file/blob abstraction,
- links to notes/journal/projects/etc.,
- safe deletion semantics.

### Exit tests

- recurrence/completion correctness,
- streak recalculation after edit/delete,
- study duration aggregation,
- workout totals/retrieval,
- journal persistence/offline flow,
- file metadata isolation,
- attachment deletion does not delete unrelated entities,
- all module data remains local and profile-scoped.

### Gate

`P4-GATE-LIFE-MODULES` must pass.

---

## Phase 5 — Calendar power features: copy/paste, templates, bulk scheduling

### Objective

Implement the schedule-copy behavior that makes Omnivae materially more powerful than a simple calendar.

### Deliverables

- copy one day's schedule,
- paste to one destination day,
- paste to multiple selected days,
- copy whole week,
- paste week to another week,
- apply across selected future ranges,
- weekday/weekend template patterns,
- schedule templates,
- conflict detection,
- preview/diff UI,
- atomic bulk commit,
- `bulk_operation_id` or equivalent provenance,
- undo/revert for a bulk operation when feasible and specified,
- safe cancellation.

### Implementation order

1. Pure date transformation engine.
2. Conflict model.
3. Bulk plan object.
4. Repository/application transaction.
5. Preview UI.
6. Day copy.
7. Multi-day copy.
8. Week copy.
9. Range/template apply.
10. Undo/provenance if included in phase scope.

### Required edge cases

- source and destination same date,
- overlapping destination ranges,
- end-of-month/year,
- leap day,
- DST changes,
- all-day events,
- events crossing midnight,
- destination conflicts,
- failure during bulk commit,
- cancelled preview,
- source schedule remains unchanged.

### Gate

`P5-GATE-CALENDAR-BULK` must pass with **all** listed edge cases.

---

## Phase 6 — BYOK AI chat and provider abstraction

### Objective

Introduce AI without compromising local-first data control.

### Deliverables

- provider-neutral AI interface,
- at least one hosted adapter selected for initial implementation,
- OpenAI-compatible adapter strategy where practical,
- local runtime adapter seam,
- provider/model settings UI,
- API key validation,
- secure credential storage,
- streaming chat where supported,
- local conversation/message storage,
- delete one chat,
- delete all chats,
- export chats,
- disable history,
- disclosure for external processing,
- offline view of existing local chats.

### Not yet

- autonomous agent writes,
- health-aware AI by default,
- full memory engine unless separately scoped.

### Exit tests

- fake-provider conformance,
- successful hosted request via adapter in integration environment where available,
- invalid key error mapping,
- secret never stored in normal DB/logs,
- chat history settings work,
- delete one/all behavior,
- provider failure preserves user message/draft appropriately,
- cross-profile AI history isolation.

### Gate

`P6-GATE-AI-CHAT` must pass.

---

## Phase 7 — AI memory, controlled tools, and proposal engine

### Objective

Turn generic AI chat into a safe foundation for personal intelligence.

### Deliverables

- AI memory data model,
- memory capture policy,
- memory user controls,
- memory delete-one/clear-all/disable behavior,
- context builder,
- permission/scope policy,
- read-only domain tools,
- structured proposal schema,
- proposal validator,
- approval state machine,
- approved write executor,
- model/provider provenance,
- proposal expiry/versioning.

### Required rule

The LLM does not directly mutate repositories. It returns structured proposals that are validated and then applied through normal domain commands after required approval.

### Exit tests

- no cross-profile context leakage,
- disabled memory is not captured/retrieved,
- cleared memory is absent from retrieval,
- model cannot write without approval,
- stale/modified proposal approval is rejected,
- malformed operation rejected,
- destructive operation requires explicit confirmation,
- approved proposal commits exactly approved operations,
- partial failure rolls back atomic proposals.

### Gate

`P7-GATE-AI-CONTROL` must pass.

---

## Phase 8 — Nightly reflection and adaptive planning

### Objective

Implement the core Omnivae reflection loop: understand what happened, preserve context, and help adapt the plan.

### Deliverables

- configurable nightly reflection prompt/reminder,
- manual start anytime,
- text reflection flow,
- voice capture seam or implementation if selected,
- user narrative stored separately,
- AI summary,
- follow-up questions,
- suggested updates to tasks/goals/progress/calendar,
- approval UI,
- schedule adaptation proposal,
- reflection-to-journal linkage,
- provenance for AI-derived updates.

### Behavior rules

- missed tasks are not automatically treated as personal failure,
- AI does not invent completed work,
- contextual explanations remain preserved,
- schedule changes require confirmation,
- user can keep reflection without using AI.

### Required scenario tests

Scenario example:

- planned: gym + coding + reading,
- actual: family situation, gym skipped, reading completed for one hour,
- expected: reflection preserved; gym not marked complete; reading may be updated only when the user confirms; AI may propose rescheduling coding/gym without overloading tomorrow.

### Gate

`P8-GATE-REFLECTION` must pass.

---

## Phase 9 — Health dashboard and manual health data

### Objective

Build a first-class health domain before external wearable complexity.

### Deliverables

- normalized health metric model,
- manual health input where appropriate,
- health dashboard,
- day/week/month/year trends,
- source attribution,
- workout integration with health dashboard,
- privacy settings for AI access to health context,
- unit conversion utilities with tests,
- system status for health data sources.

### Possible initial metrics

Only implement those with clear source/input semantics. Candidates:

- weight,
- water,
- steps/manual or imported later,
- sleep duration/manual or imported later,
- resting/observed heart rate when imported,
- workouts.

### Gate

`P9-GATE-HEALTH-CORE` must pass.

---

## Phase 10 — Platform health integration(s)

### Objective

Import high-value health data safely from platform health aggregators.

### Preferred order

Choose based on platform priority and implementation readiness. Architecture anticipates:

- Android Health Connect,
- Apple Health,
- then vendor-specific integrations only where needed.

### Deliverables per integration

- permission request UX,
- granular metric scopes,
- source adapter,
- cursor/range import,
- normalization,
- unit handling,
- source ID preservation,
- deduplication,
- disconnect/revocation,
- import status/system status,
- background refresh only if platform rules and phase scope permit.

### Gate

`P10-GATE-HEALTH-INTEGRATION` plus provider-specific suite must pass.

No integration is complete if deduplication, permission denial, or revocation tests fail.

---

## Phase 11 — External calendar integration

### Objective

Connect external calendars without breaking local calendar behavior.

### Deliverables

- calendar integration port finalized,
- authorization adapter,
- list/select calendars,
- read/import mapping,
- source IDs and sync metadata,
- optional approved outbound writes,
- conflict/source-of-truth behavior,
- disconnect/revoke,
- offline cached display.

### Rules

- local calendar remains usable without connection,
- external events preserve source attribution,
- agent writes to external calendar require explicit user approval,
- no duplicate import loop.

### Gate

`P11-GATE-CALENDAR-INTEGRATION` must pass.

---

## Phase 12 — Voice, rich notes, stylus, richer files

### Objective

Improve natural capture and tablet usability.

### Candidate deliverables

- voice notes/reflection transcription,
- optional AI voice conversation,
- rich text/markdown editor,
- images/attachments in notes,
- PDF/file linking,
- drawing/stylus canvas on supported devices,
- export/interoperability.

### Rule

Do not make a remote transcription provider mandatory for manual note/journal use.

### Gate

Feature-specific suites in `testing.md` must pass.

---

## Phase 13 — User-owned encrypted backup/sync

### Objective

Provide portability and multi-device preparation without requiring Omnivae Cloud.

### Deliverables

- versioned export/backup format,
- encryption design,
- user-owned target adapter(s),
- outbox/change log,
- incoming change application,
- tombstones,
- retry/idempotency,
- conflict policies,
- restore flow,
- recovery from interrupted sync.

### Gate

`P13-GATE-USER-SYNC` must pass, including deletion-resurrection and conflict tests.

---

## Phase 14 — Managed Omnivae cloud

### Objective

Add optional account-based managed sync only after local-first product quality is strong.

### Deliverables

- cloud authentication,
- account/profile mapping,
- authorized API,
- PostgreSQL/object storage as selected,
- secure sync protocol,
- backups/restore,
- rate limits,
- audit/security logging,
- account export/deletion,
- automatic cross-device sync,
- notification services only where needed.

### Security gate

A managed cloud release cannot ship until:

- authorization tests pass,
- row/user isolation tests pass,
- backup restore is tested,
- deletion behavior is tested,
- secret handling review passes,
- penetration/security review appropriate to the release is completed.

### Gate

`P14-GATE-MANAGED-CLOUD` must pass.

---

## Phase 15 — Progress intelligence and advanced agents

### Objective

Develop the long-term differentiator after reliable data capture exists.

### Deliverables may include

- goal decomposition,
- skill graph,
- evidence-based skill progress,
- project/study plan generation,
- weekly plan proposals,
- progress review,
- adaptive next-plan generation,
- specialized controlled agents (planner, learning, fitness, projects, reflection, career if enabled),
- model selection/routing,
- local-vs-cloud model policy.

### Required guardrails

- actual source records remain authoritative,
- user-approved goals drive planning,
- no cross-module access without permission,
- no autonomous destructive actions,
- proposals remain inspectable,
- explain uncertainty/conflicts.

### Gate

`P15-GATE-PROGRESS-INTELLIGENCE` must pass.

---

## Phase 16 — Ecosystem and optional expansion

### Candidate scope

- finance,
- travel,
- reading,
- languages,
- relationships,
- custom modules,
- plugin ecosystem,
- collaboration,
- advanced cloud features,
- monetization.

These are explicitly downstream of core product quality. They must not destabilize local-first planning, health, reflection, or AI control.

---

# Cross-phase workstreams

## A. Security hardening

Runs continuously:

- secret scanning,
- dependency auditing,
- crypto review,
- permission minimization,
- injection/XSS/CSRF/web hardening as applicable,
- mobile secure storage review,
- export/deletion privacy tests.

## B. Accessibility

Runs continuously:

- semantic UI,
- keyboard navigation,
- screen reader checks,
- focus behavior,
- touch target review,
- responsive layouts.

## C. Performance

Runs continuously:

- DB indexes,
- virtualized long lists,
- pagination,
- render performance,
- startup/offline boot,
- aggregation profiling.

## D. Migration reliability

Every schema-bearing phase adds migration fixtures and upgrade tests.

## E. Documentation/memory

Every meaningful work session updates `memory.md`.

---

# Recommended first execution sequence for an AGY agent

If starting from an empty or early repository, execute in this order:

```text
Phase 0  Foundation
   ↓
Phase 1  Profile + Storage
   ↓
Phase 2  Tasks/Goals/Notes/Calendar
   ↓
Phase 3  Dashboard + Progress
   ↓
Phase 4  Habits/Study/Gym/Journal/Files
   ↓
Phase 5  Calendar Power Features
   ↓
Phase 6  BYOK AI Chat
   ↓
Phase 7  AI Memory + Controlled Proposals
   ↓
Phase 8  Nightly Reflection + Adaptation
   ↓
Phase 9/10 Health Core + Integrations
```

This sequence intentionally captures reliable local user data before asking AI to make sophisticated plans from it.

---

# Phase tracking table

Do not mark statuses here without corresponding evidence in `memory.md`.

| Phase | Name | Status | Gate |
|---|---|---|---|
| 0 | Repository + quality foundation | not_started | P0-GATE-FOUNDATION |
| 1 | Local profile + storage | not_started | P1-GATE-PROFILE-STORAGE |
| 2 | Core planning modules | not_started | P2-GATE-CORE-PLANNING |
| 3 | Dashboard + progress | not_started | P3-GATE-DASHBOARD-PROGRESS |
| 4 | Life modules | not_started | P4-GATE-LIFE-MODULES |
| 5 | Calendar power features | not_started | P5-GATE-CALENDAR-BULK |
| 6 | BYOK AI chat | not_started | P6-GATE-AI-CHAT |
| 7 | AI memory + control | not_started | P7-GATE-AI-CONTROL |
| 8 | Nightly reflection | not_started | P8-GATE-REFLECTION |
| 9 | Health core | not_started | P9-GATE-HEALTH-CORE |
| 10 | Health integration(s) | not_started | P10-GATE-HEALTH-INTEGRATION |
| 11 | Calendar integration | not_started | P11-GATE-CALENDAR-INTEGRATION |
| 12 | Voice/rich notes/stylus | not_started | feature-specific |
| 13 | User-owned sync | not_started | P13-GATE-USER-SYNC |
| 14 | Managed cloud | not_started | P14-GATE-MANAGED-CLOUD |
| 15 | Progress intelligence | not_started | P15-GATE-PROGRESS-INTELLIGENCE |
| 16 | Ecosystem expansion | not_started | feature-specific |

---

# Final implementation instruction

The roadmap is intentionally staged so that Omnivae becomes a reliable local personal system before it becomes an AI-heavy cloud product.

An agent must not skip foundational correctness because a later AI feature is more exciting. Data integrity, profile isolation, offline behavior, and tests are prerequisites for trustworthy intelligence.
