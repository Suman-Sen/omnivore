# Omnivae — Engineering and Agent Rules

> Status: Binding rules for AGY/coding agents  
> Version: 1.0  
> Last consolidated: 2026-09-08

## 0. Purpose

This document tells an implementation agent **how to work on Omnivae without corrupting the product intent, architecture, security model, or progress state**.

These rules are not suggestions. When a rule conflicts with convenience, convenience loses unless the product owner explicitly changes the rule.

---

## 1. Source-of-truth precedence

When information conflicts, use this precedence:

1. **Latest explicit instruction from the product owner in the active work session.**
2. **`rules.md`** for non-negotiable process/security/completion behavior.
3. **`prd.md`** for required product behavior.
4. **`architecture.md`** for technical boundaries and flows.
5. **`schema.md`** for data contracts.
6. **`testing.md`** for verification and completion gates.
7. **`phases.md`** for planned sequencing.
8. **`memory.md`** for current state, recent implementation decisions, blockers, and working context.

If a lower-priority document contains a newer implementation fact that legitimately supersedes a higher-level assumption, do not silently reconcile it. Record the conflict in `memory.md` and update the relevant source document or ADR.

---

## 2. Product identity rules

- The product name is **Omnivae**.
- Do not rename it in code, docs, UI, package metadata, or examples unless explicitly instructed.
- Old references such as LifeOS are historical context only and should be migrated when touching relevant files.
- Position Omnivae as a **personal intelligence / life orchestration system**, not only a planner or habit tracker.
- Job/Career is optional and must never be a mandatory onboarding assumption.

---

## 3. Core invariants

Never violate these invariants:

1. Local-first.
2. Privacy-first.
3. Offline-capable core workflows.
4. Multiple profiles are isolated.
5. Optional modules are truly optional.
6. User controls AI data access and consequential AI writes.
7. AI chat/memory are local by default.
8. BYOK secrets are securely stored and never logged.
9. Domain logic is independent of IndexedDB/SQLite/cloud vendors.
10. Daily/weekly/monthly/yearly progress derives from the same underlying records.
11. Health data is permissioned and handled more conservatively than ordinary UI metadata.
12. AI-generated claims do not become factual progress without evidence or user confirmation.
13. A feature is not complete until all required tests pass.

---

## 4. Completion rule — absolute

**NEVER mark a task, subtask, feature, issue, milestone, phase, migration, refactor, or bug fix as `complete`, `done`, `passed`, or equivalent until every test case required by `testing.md` for that scope has passed.**

This includes work that appears visually correct.

Allowed states before tests pass:

- `not_started`
- `in_progress`
- `implemented_unverified`
- `blocked`
- `failed_tests`
- `ready_for_verification`

Only after required test evidence exists:

- `completed`

If one required test fails, the scope remains incomplete.

If a test cannot run because infrastructure is missing, the scope remains incomplete and is marked `blocked` or `implemented_unverified`.

Do not weaken, skip, delete, quarantine, or rewrite a legitimate failing test merely to mark a feature complete.

---

## 5. Required work cycle for every implementation task

Use this cycle:

```text
1. Read relevant docs
2. Inspect current code/tests/schema
3. Restate task internally as acceptance criteria
4. Identify impacted modules/data/security/offline behavior
5. Add or update tests
6. Implement minimal correct change
7. Run focused tests
8. Run required regression suites
9. Fix failures
10. Update docs/memory/migrations
11. Record test evidence
12. Only then mark complete
```

For a bug:

```text
reproduce → failing regression test → fix → regression passes → broader required tests → complete
```

---

## 6. Before writing code

An agent must inspect:

- the relevant section of `prd.md`,
- relevant architecture boundaries,
- relevant schema entities/migrations,
- required tests,
- `memory.md` for active work/blockers.

Do not implement from a ticket title alone.

Before changing an architectural boundary, inspect `architecture.md` and create/update an ADR or explicit decision record.

---

## 7. Scope discipline

### Do

- make the smallest coherent change that fully satisfies acceptance criteria,
- preserve existing public contracts unless migration is intentional,
- refactor only where needed for correctness/maintainability,
- leave unrelated modules untouched,
- document unavoidable follow-up work.

### Do not

- rewrite the whole app because a local change is inconvenient,
- introduce a new framework for one feature without justification,
- add speculative infrastructure,
- broaden feature scope silently,
- implement future P3 behavior inside a P0 task unless it is a necessary seam/interface.

---

## 8. Architecture-change rule

An architectural change includes, but is not limited to:

- replacing Next.js/React,
- replacing Capacitor strategy,
- replacing the storage abstraction,
- making cloud mandatory,
- adding microservices,
- changing profile ownership model,
- changing sync identity/version semantics,
- changing encryption/key hierarchy,
- allowing autonomous agent writes,
- changing primary data store shape substantially.

For such changes:

1. Do not silently implement.
2. Add an ADR/decision note.
3. State motivation, alternatives, consequences, migration impact, testing impact.
4. Update `architecture.md`, `schema.md`, `phases.md`, and `memory.md` as applicable.

---

## 9. Data ownership and profile isolation rules

Every personal record must have an enforceable profile ownership path.

### Required

- repository calls are profile-scoped,
- queries include profile constraints,
- cross-profile IDs return not-found/forbidden safely,
- exports include only the active/selected profile,
- AI retrieval never crosses profiles,
- file attachments never cross profiles,
- caches/projections are profile-scoped,
- test fixtures include at least two profiles for isolation tests.

### Forbidden

- global `getAllTasks()` over every profile for ordinary product use,
- client-controlled owner reassignment without validation,
- using display name as ownership key,
- using only UI filtering as security.

---

## 10. Local-first rules

A feature belongs in the core only if its primary CRUD/read experience can function locally unless the feature is inherently external.

Examples:

- Task CRUD: local.
- Notes: local.
- Calendar local events: local.
- Journal: local.
- Dashboard: local.
- Health imported history after import: locally viewable.
- Hosted AI generation: network-dependent, but existing chat/history remains locally viewable.
- External calendar sync: network-dependent; local events still work.

When offline:

- never discard user input,
- do not show generic success for a network action that did not happen,
- label queued/pending/failed external actions,
- keep local data consistent.

---

## 11. Storage rules

- Domain/application code must depend on repository/storage ports.
- UI components must not own persistence logic.
- IndexedDB/SQLite details remain in adapters.
- Use stable IDs suitable for future sync.
- Every schema change requires a migration/version update.
- Migrations require tests.
- Avoid storing large blobs inline in relational/domain records when a file/blob abstraction is appropriate.
- Derived aggregates must be rebuildable.
- Deletions intended for future sync should have explicit tombstone semantics where required.

Do not use browser `localStorage` as the main structured database.

---

## 12. Time and date rules

- Store absolute instants robustly, normally UTC.
- Preserve IANA timezone for timezone-bound schedules.
- All-day/local-day records need explicit local-date semantics.
- Recurrence follows documented wall-clock/timezone behavior.
- Aggregations use profile timezone unless a record requires another domain timezone.
- Tests must cover DST/timezone boundaries where relevant.
- Never assume every day has exactly 24 local hours.

---

## 13. Secret handling rules

Secrets include:

- AI API keys,
- OAuth access/refresh tokens,
- encryption keys,
- passwords/PIN derivatives,
- service credentials.

### Never

- commit secrets to Git,
- place them in `.env.example` as real values,
- store them in normal database fields without approved encryption design,
- store them in browser localStorage,
- send them to analytics,
- print them in console/server logs,
- include them in error messages,
- put them in query-string URLs,
- include them in AI prompts.

### Required

- platform secure storage/keychain where available,
- encrypted fallback where web constraints require it,
- redaction in diagnostics,
- secret-scanning test/check in CI when available.

---

## 14. Authentication rules

Local profile authentication and cloud authentication are distinct concepts.

### Local

- email is not required,
- PIN/password/biometric may protect a profile,
- never store raw password/PIN,
- use approved password/KDF primitives,
- lock session according to product/platform behavior.

### Cloud — future

- identity is derived from authenticated server session/token,
- never trust client-supplied `user_id` as authorization,
- enforce authorization server-side,
- use row-level/user-level access controls where suitable.

---

## 15. AI provider rules

AI integration must go through the provider-neutral AI layer.

### Provider adapters own

- authentication format,
- provider request/response translation,
- streaming mechanics,
- provider error mapping,
- capability detection.

### Product logic owns

- permissions,
- context selection,
- proposal format,
- user approval,
- domain validation,
- persistence.

Never let provider-specific SDK objects leak into the domain model.

---

## 16. AI context rules

Before sending context to an external model:

- confirm active profile,
- gather only data relevant to the request,
- respect disabled history/memory/module settings,
- exclude credentials and secret metadata,
- treat health/journal content conservatively,
- disclose external processing in the UI,
- avoid sending an entire lifetime history when a narrow time window is enough.

Local model usage may permit broader private context, but still obeys profile and user permission rules.

---

## 17. AI memory rules

AI memory and conversation history are separate stores/semantics.

Required capabilities when memory is implemented:

- local by default,
- profile-scoped,
- disable capture,
- inspect user-facing memory or summary,
- delete individual user-facing memory entries where product supports it,
- clear all memory,
- clear chats independently where schema allows.

A model-generated memory candidate should not become durable blindly. Use validation/retention rules and preserve provenance.

---

## 18. Agent write rules

### Read-only operations

May run without a write approval prompt if the user asked for the analysis and the data is within granted scope.

### Proposed writes

AI/agents may generate a structured proposal.

### Consequential writes

Examples:

- creating many calendar events,
- rescheduling the week,
- changing a goal,
- deleting records,
- updating progress based on a reflection,
- writing to an external calendar.

These require preview/approval according to product policy.

### Destructive operations

Deletion, bulk destructive changes, irreversible external side effects, and credential/account changes require explicit confirmation.

### Forbidden

- LLM executes raw SQL,
- LLM receives unrestricted repository object,
- LLM-generated prose is reparsed after approval as a new action plan,
- hidden writes during a chat response.

---

## 19. AI proposal rules

A proposal should be structured, validated, and reviewable.

It must include enough information to test and safely apply:

- affected records or intended new records,
- dates/times,
- reason,
- conflicts,
- operations (`create`, `update`, `delete`),
- dependencies,
- warnings,
- provenance.

Approval applies to a specific proposal version. If the proposal materially changes, approval must be obtained again.

---

## 20. Reflection and wellbeing rules

Omnivae is not a punishment engine.

- Do not shame users for missed tasks.
- Do not automatically overload tomorrow because today was missed.
- Preserve user narrative separately from AI interpretation.
- Treat AI summaries as generated content, not the historical source of truth.
- Use actual evidence for progress.
- Present wellbeing patterns as observations with uncertainty.
- Do not present the app as diagnosing or treating medical conditions.
- Do not send health/reflection content to external AI without clear user-controlled scope.

---

## 21. Health data rules

Health data receives stricter handling.

- Import is opt-in.
- Request only required permissions/metric types.
- Preserve source attribution.
- Deduplicate imports using source identifiers and documented rules.
- Do not fabricate missing metrics.
- Do not convert incompatible units without tested conversion logic.
- Do not silently merge contradictory sources.
- Keep imported history locally accessible after successful import where allowed.
- Never claim a health insight is a medical diagnosis.
- Health-specific tests are mandatory before completing an integration.

---

## 22. Calendar rules

Bulk schedule operations must be planned before committing.

For day/week/range copy:

1. Read source schedule.
2. Transform into destination plan.
3. Detect invalid date/time/conflict conditions.
4. Present or validate preview.
5. Commit atomically.
6. Emit provenance/bulk-operation metadata.
7. Test source remains unchanged.

Do not perform a loop of independent writes that leaves half a week pasted if one middle write fails, unless the operation explicitly supports partial success and the UI communicates it.

---

## 23. Notes conversion rules

Converting a note to a task/event/goal:

- does not delete the source note,
- preserves a link/provenance reference,
- validates structured fields,
- lets the user review AI-extracted fields if AI is involved,
- does not silently schedule content based only on ambiguous prose.

---

## 24. Progress and analytics rules

- Raw completion/session/sample records are the source of truth.
- Percentages are derived or explicitly user-entered with provenance.
- AI cannot mark progress based on inference alone.
- Cached aggregates must be rebuildable.
- Changing dashboard filters never changes source data.
- Aggregation test cases must cover timezone boundaries and deleted/edited source records.

---

## 25. Dependency rules

Before adding a dependency:

- verify active maintenance and compatibility,
- prefer mature, narrowly scoped libraries,
- avoid duplicate libraries for the same purpose,
- inspect license suitability,
- avoid dependencies requiring unnecessary network/cloud coupling,
- document major architectural dependencies.

Do not implement custom cryptography, recurrence parsing, or security-sensitive primitives when a trusted standard implementation exists.

---

## 26. UI implementation rules

- Core actions must expose loading/success/error states.
- Network-dependent UI must show offline/pending state.
- Destructive operations must be distinguishable.
- Disabled modules must not appear as broken navigable screens.
- Responsive behavior is tested at mobile and desktop/tablet widths for relevant features.
- Do not encode business rules only in presentation components.
- Preserve keyboard/accessibility semantics for core controls.

---

## 27. Accessibility rules

New core UI must support where applicable:

- semantic labels,
- keyboard navigation,
- focus visibility/order,
- adequate touch targets,
- non-color-only status cues,
- screen-reader-compatible controls.

Accessibility failures block completion when covered by the feature's acceptance criteria/test suite.

---

## 28. Error handling rules

- Never swallow exceptions with an empty catch.
- Map technical errors to actionable user states.
- Keep raw provider errors out of user UI when they expose secrets/internal details.
- Preserve user-entered text when a save/network operation fails when possible.
- Log safely with redaction.
- Retry only when the operation is safe/idempotent.

---

## 29. Logging and telemetry rules

Never log raw:

- API keys/tokens,
- passwords/PINs,
- encryption keys,
- journal text,
- AI chat content by default,
- raw health data by default.

Remote analytics/telemetry, if introduced, must have a privacy review and must not become required for product functionality.

---

## 30. Migration rules

For every schema migration:

- increment schema version,
- document old → new shape,
- write migration code,
- write fixture-based upgrade tests,
- test empty DB and populated DB,
- test failed migration behavior,
- preserve user data unless explicit deletion is part of the requirement,
- update `schema.md`.

A migration is not complete merely because a fresh install works.

---

## 31. Sync rules — when implemented

- Local is not treated as a disposable cache.
- Every syncable entity has stable identity/version semantics.
- Deletions have tombstones or equivalent propagation semantics.
- Offline changes enter an outbox.
- Retries are idempotent.
- Conflicts follow an entity-specific documented policy.
- A user deletion must not be resurrected by an old remote copy.
- Authentication/authorization must not use a client-supplied owner ID.

---

## 32. Test rules

Read `testing.md` for the complete matrix. At minimum:

- new behavior gets tests,
- bug fixes get a regression test,
- repository adapters pass conformance tests,
- profile-sensitive features get isolation tests,
- offline-capable features get offline tests,
- migrations get upgrade tests,
- AI agent writes get approval/validation tests,
- health imports get dedupe/source/unit tests,
- calendar bulk operations get atomicity/conflict/date tests.

Do not mock away the exact behavior the test is supposed to validate.

---

## 33. Test-failure rules

When a test fails:

1. Record the failure.
2. Determine whether implementation or test expectation is wrong.
3. Compare expectation to PRD/architecture.
4. Fix the wrong layer.
5. Re-run the failing test.
6. Re-run the required suite.
7. Keep status incomplete until all required tests pass.

Never:

- comment out the test,
- change expected output to the broken output without product justification,
- mark it flaky without evidence,
- skip it in CI to meet a deadline.

---

## 34. `memory.md` update rules

At the end of a meaningful implementation session, update `memory.md` with:

- date/time or session label,
- scope worked on,
- files/modules changed,
- migrations created,
- tests added/updated,
- exact test commands run,
- pass/fail summary,
- current task statuses,
- blockers/open questions,
- next recommended action.

Do not write vague entries such as “worked on dashboard.”

Do not mark something completed in memory without test evidence.

---

## 35. Phase rules

Follow `phases.md` unless an explicit product decision changes sequencing.

A later phase may be prototyped behind a feature flag, but it cannot silently become a dependency of an earlier phase.

A phase gate passes only when:

- its required features meet acceptance criteria,
- its required tests pass,
- migration/security/offline gates pass,
- `memory.md` reflects actual status.

---

## 36. Documentation rules

Code changes must update docs when they change:

- product behavior,
- architecture,
- schema,
- test requirements,
- implementation phase status,
- locked/open decisions.

Do not let docs become fictional future state while code behaves differently. Use labels such as `planned`, `implemented_unverified`, and `completed`.

---

## 37. Git/commit rules for agents

When the environment supports Git:

- inspect diff before completion,
- do not commit secrets/generated credentials,
- keep commits scoped where practical,
- include migrations and tests with the feature they support,
- do not rewrite unrelated history,
- do not force-push unless explicitly instructed.

Suggested commit style:

```text
feat(calendar): add atomic day schedule copy
fix(storage): enforce profile scope in note lookup
test(ai): cover approval rejection for planner proposals
docs(schema): add AI memory provenance fields
```

---

## 38. Definition of ready

A task is ready for implementation when the agent can identify:

- desired behavior,
- acceptance criteria,
- affected module(s),
- data impact,
- security/profile impact,
- offline impact,
- required test categories.

If one is truly unspecified and blocks a safe implementation, record it in `memory.md` as an open decision. For non-critical implementation details, choose the lowest-risk solution consistent with the existing architecture and document it.

---

## 39. Definition of done

A task is **done only when all are true**:

- [ ] Acceptance criteria satisfied.
- [ ] Code follows architecture boundaries.
- [ ] Profile isolation preserved.
- [ ] Offline behavior handled where applicable.
- [ ] Security/privacy rules satisfied.
- [ ] Schema/migrations updated if needed.
- [ ] Unit tests pass.
- [ ] Integration tests required by scope pass.
- [ ] E2E tests required by scope pass.
- [ ] Regression tests pass.
- [ ] Static/type/lint checks pass according to project CI.
- [ ] No required test is skipped/quarantined.
- [ ] Documentation is updated.
- [ ] `memory.md` contains test evidence and accurate status.

If any checkbox is false, status is not `completed`.

---

## 40. Agent handoff rule

When stopping work, leave the next agent enough context to continue without re-deriving state.

The handoff must state:

- what was requested,
- what is implemented,
- what is only partially implemented,
- what tests pass/fail,
- exact failing test names/errors if relevant,
- data migration state,
- open decisions,
- next safe step.

Never claim a cleaner state than reality.

---

## 41. Final rule

When uncertain whether to optimize for speed or preserve a core Omnivae invariant, preserve the invariant and document the trade-off.

When uncertain whether a feature is complete, it is **not complete until the required tests prove it**.
