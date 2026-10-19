# Omnivae — Product Requirements Document (PRD)

> Status: Active product source of truth  
> Product name: **Omnivae**  
> Document version: 1.0  
> Last consolidated: 2026-09-08  
> Audience: Product owner, AGY/coding agents, designers, engineers, QA

## 0. How an implementation agent must use this document

This PRD defines **what Omnivae must do and why**. It does not grant permission to improvise architecture, security, or completion criteria.

Implementation agents must also read, in this order:

1. `rules.md` — non-negotiable implementation rules.
2. `prd.md` — product behavior and acceptance criteria.
3. `architecture.md` — system boundaries, flows, and technical architecture.
4. `schema.md` — data model and persistence contracts.
5. `phases.md` — implementation sequence and gates.
6. `testing.md` — required test matrix and definition of done.
7. `memory.md` — current implementation state, decisions, blockers, and next work.

If documents conflict, follow the precedence rules in `rules.md`. Do not silently choose a different interpretation.

---

## 1. Product summary

**Omnivae is a local-first personal intelligence and life-orchestration system.** It helps a person plan, think, track health and progress, reflect on what actually happened, and adapt future plans without taking control away from the user.

It is **not** merely:

- a task manager,
- a calendar,
- a habit tracker,
- a health dashboard,
- a journaling app,
- or an AI chatbot.

Its core differentiation is the connection between those systems. Omnivae should understand the user's goals, current plans, actual behavior, reflections, and wellbeing signals, then help the user make better next decisions.

### Product principle

> Omnivae helps a person become who they are trying to become while keeping control of their data, choices, and attention.

### Five product pillars

1. **Plan** — calendar, tasks, goals, routines, notes, projects.
2. **Think** — AI chat, memory, research support, decision support.
3. **Health** — sleep, activity, workouts, nutrition/water and wearable-derived signals when available.
4. **Reflect** — journal, daily story, nightly AI reflection, context-aware progress review.
5. **Grow** — study, skills, habits, projects, long-term progress and adaptive planning.

---

## 2. Product goals

### G1 — Local-first independence

The core product must remain useful without a cloud account and without a network connection.

A local-only user must be able to create a profile, unlock it locally, use core modules, store data, and revisit their history without creating a server account.

### G2 — One connected personal system

A user should be able to move information between modules rather than re-enter it. Examples:

- convert a note into a task,
- convert a note into a calendar event,
- connect a task to a goal,
- connect a study session to a skill or goal,
- connect a workout to health progress,
- reference a reflection when adapting a future plan.

### G3 — Adaptive rather than punitive planning

Omnivae must distinguish between planned behavior and actual life. Missed work should not automatically be framed as failure.

When circumstances change, the system should help the user understand what happened and adapt future plans.

### G4 — Health and wellbeing as a first-class pillar

Health is not an optional decorative chart. Omnivae should provide meaningful health visibility and, where possible, integrate with device/platform health sources.

The system may surface potential wellbeing concerns or patterns, but should do so supportively and with clear uncertainty rather than acting as a medical authority.

### G5 — User-owned AI

AI must be provider-agnostic. Users may bring their own cloud API keys or configure local models. Chat history and AI memory are local by default.

### G6 — Cross-platform product logic

The product should share domain logic across web/PWA and mobile wrappers, with responsive experiences for phone, tablet, and desktop-sized screens.

### G7 — Modular product

Not everyone needs every life domain. Users must be able to enable/disable optional modules and dashboard widgets. **Job/Career must never be mandatory.**

---

## 3. Non-goals for the initial product

The initial product must not be derailed by premature infrastructure or breadth.

Do not make these initial requirements:

- Kubernetes,
- Kafka,
- microservices,
- database sharding,
- multi-region infrastructure,
- a custom cryptographic algorithm,
- autonomous agents with unrestricted write access,
- mandatory managed cloud accounts,
- mandatory wearable ownership,
- a full financial platform,
- collaboration/social network features,
- a medical diagnosis product,
- a universal plugin marketplace before core workflows are stable.

These may be revisited through explicit architectural decisions later.

---

## 4. Target users

### 4.1 Primary user — self-directed individual

A person who wants one system to organize life domains while retaining privacy and control.

Typical needs:

- plan days and weeks,
- work toward long-term goals,
- study or build skills,
- exercise and track wellbeing,
- collect notes and thoughts,
- review progress,
- use AI for planning and reflection,
- avoid scattering personal context across many apps.

### 4.2 Privacy-sensitive user

A user who wants most personal records stored locally and wants explicit control over what leaves the device.

### 4.3 Multi-profile household/device user

A device may contain multiple isolated local profiles. Each profile must have independent settings, data, AI credentials, and history.

### 4.4 Optional domain users

Some users may use Study but not Career. Some may use Gym but not Diet. Some may use only core planning and notes. The product must not assume employment, gym attendance, wearable ownership, or a specific life path.

---

## 5. Product experience principles

### P1 — Calm, premium, information-dense when useful

The UI should feel polished and intentional. It should avoid the visual feeling of a spreadsheet-like tracker unless the user deliberately enters an analytics-heavy view.

### P2 — User controls automation

AI may recommend or prepare changes. It must not silently perform consequential writes that materially alter a user's schedule, goals, data, or external services.

### P3 — Context matters

A missed gym session because of a family situation should be treated differently from a repeated pattern the user wants to change. Reflection and progress logic should preserve context.

### P4 — One underlying truth

Daily, weekly, monthly, and yearly views must aggregate from the same underlying records. Do not maintain separate inconsistent progress systems.

### P5 — Offline is a normal state

Offline mode is not an error mode. Network-dependent features should degrade explicitly and preserve local work.

### P6 — Privacy is visible

The UI must make it understandable when data remains local and when a prompt, sync payload, or external integration leaves the device.

---

## 6. Core information architecture

### Core modules

- Dashboard
- Calendar
- Tasks
- Goals
- Notes
- AI Chat
- Analytics / Progress
- Settings
- Files

### First-class or high-priority optional modules

- Journal / Reflection
- Health
- Study
- Gym / Workouts
- Habits / Routines
- Projects

### Future/optional modules

- Diet / Nutrition
- Career / Job
- Reading
- Finance
- Travel
- Languages
- Relationships
- Custom modules / plugins

A disabled optional module must not block other modules.

---

## 7. Account, profile, and launch requirements

### 7.1 Launch flow

At launch, the app should support:

- existing local profile selection,
- local profile creation,
- guest/local temporary access where supported,
- optional cloud account sign-in when cloud functionality exists.

### 7.2 Local profile

A local profile must be usable without email.

Supported local protection modes may include:

- password,
- PIN,
- biometrics where the platform supports them.

### 7.3 Multi-profile isolation

Each profile has separate:

- module configuration,
- dashboard layout,
- tasks,
- calendar,
- goals,
- notes,
- journal/reflections,
- health/workout/study data,
- AI conversations,
- AI memory,
- AI provider configuration,
- encrypted credentials,
- sync settings.

A profile must never be able to read another profile's protected records through UI, application APIs, storage adapters, export, search, or AI context retrieval.

### 7.4 Guest behavior

Guest behavior must be explicit. If guest data is temporary, the UI must say so before data loss can occur. If guest data persists locally, it must be treated as its own isolated profile.

---

## 8. Dashboard requirements

### 8.1 Purpose

The dashboard is the user's high-level command center, not a fixed home screen.

### 8.2 Required behavior

Users can:

- enable/disable widgets,
- rearrange supported widgets,
- choose relevant modules,
- switch or filter progress by day/week/month/year where applicable,
- see current priorities and today's schedule,
- see progress summaries derived from underlying records,
- access AI assistance without losing the context of the dashboard.

### 8.3 Candidate widgets

- Today's tasks
- Calendar / next events
- Goals
- Habits / routines
- Study
- Gym / workout
- Health summary
- Reflection / journal prompt
- AI coach / assistant entry point
- Projects
- Career only if enabled

### 8.4 Profile identity

The user may set a profile picture/avatar and profile-level display preferences.

### Acceptance criteria

- Widget state survives app restart.
- Widget state is profile-scoped.
- Disabled modules do not leak into the dashboard.
- Progress values match source records.
- Time range changes do not create duplicate progress records.
- Dashboard works from local data when offline.

---

## 9. Calendar and scheduling requirements

### 9.1 Calendar fundamentals

The calendar must support local events and be designed so external calendars can later be integrated through adapters.

Events may be associated with:

- tasks,
- goals,
- projects,
- notes,
- study sessions,
- workouts,
- routines/templates.

### 9.2 Schedule copy/paste

This is a core productivity behavior and must not be reduced to duplicating one event at a time.

The user must eventually be able to:

- copy an entire day's schedule,
- paste the copied schedule to another day,
- paste the same day schedule to multiple selected days,
- create different weekday and weekend patterns,
- copy an entire week,
- paste a week to another week,
- repeat copied schedules forward across a range,
- support longer scheduling windows such as multiple months,
- preview conflicts before committing a bulk copy,
- undo or cancel a bulk operation when feasible.

Example behavior:

- Copy Monday's schedule.
- Paste to Tuesday and Friday.
- Keep a separate Saturday/Sunday pattern.
- Copy a whole completed week and apply it to selected future weeks.

### 9.3 Schedule templates

Templates should support reusable patterns such as:

- office routine,
- study routine,
- weekend routine,
- workout week,
- exam preparation,
- project sprint.

Templates must remain editable after application. Applying a template creates or links records according to the defined implementation contract; it must not make ordinary calendar data impossible to edit.

### 9.4 AI scheduling

The AI planner should be able to produce a **proposed** schedule based on:

- goals,
- tasks,
- deadlines,
- calendar availability,
- existing routines,
- user constraints,
- recent progress/reflection context when permission is granted.

The flow is:

`User intent → gather allowed context → generate proposal → show diff/preview → user approves → write schedule`

The AI must avoid obvious conflicts and should explain material trade-offs.

### 9.5 Adaptive rescheduling

When the user misses or changes planned work, Omnivae may offer to rebalance remaining work. The user should not be forced into a cascading punitive schedule.

### Acceptance criteria

- Bulk copy does not mutate the source schedule.
- Repeated paste honors timezone/date boundaries.
- Conflicts are detectable before commit.
- Cancellation or failure leaves the database consistent.
- AI writes are blocked until required approval occurs.
- Offline local scheduling remains available.

---

## 10. Tasks requirements

Tasks should support at minimum:

- title,
- description/details,
- status,
- priority,
- due date/time,
- optional scheduled start/end,
- optional goal/project relationship,
- optional note source,
- tags/labels if implemented,
- recurrence when recurrence engine is ready,
- completion history.

Task status should distinguish at least:

- pending/open,
- in progress where supported,
- completed,
- cancelled/skipped.

A missed due date must not equal completed or permanently failed.

### Acceptance criteria

- Completion is stored as a durable event/state transition.
- A task linked from another module maintains referential integrity.
- Deleting a linked source does not silently destroy unrelated records.
- Profile isolation is enforced.
- Offline task creation/edit/completion works.

---

## 11. Goals and progress requirements

Goals are longer-horizon outcomes that can connect to tasks, habits, projects, study, health, or other evidence.

A goal may include:

- title,
- description,
- target date,
- status,
- progress strategy,
- parent/child hierarchy,
- milestones,
- linked evidence,
- reflection/context.

### Progress model

Do not rely only on a manually entered percentage. Progress may be derived from evidence depending on goal type.

Examples:

- completed milestones,
- study time,
- project tasks,
- workout consistency,
- habit completions,
- user-confirmed qualitative progress.

AI may summarize progress but must not fabricate completion evidence.

---

## 12. Notes requirements

Notes are a capture surface and a source of structured actions.

### 12.1 Required baseline

- create/edit/delete notes,
- local search,
- timestamps,
- profile scope,
- optional pin/favorite/tag metadata,
- link to relevant entities.

### 12.2 Conversion flows

A user should be able to convert or extract a note into one or more of:

- task,
- calendar event,
- goal,
- project item,
- journal/reflection entry.

The original note should remain available unless the user deletes it.

### 12.3 Rich content direction

The architecture should not prevent future support for:

- markdown/rich text,
- images,
- attached files/PDFs,
- voice capture/transcription,
- drawing/stylus input.

These are staged features, not all MVP requirements.

---

## 13. Files requirements

The Files module is a user-visible inventory for local attachments and future synced assets.

It should support a metadata layer that can associate a file with notes, journal entries, projects, AI conversations, or other entities without duplicating the binary unnecessarily.

Requirements:

- profile-scoped metadata,
- clear local vs synced state,
- MIME/type and size metadata,
- safe deletion semantics,
- no exposing another profile's attachments,
- future content indexing through opt-in processing.

---

## 14. Journal and nightly reflection requirements

### 14.1 Journal

Users must be able to create text-based journal/reflection entries. Voice can be added when the platform capability is implemented.

### 14.2 Nightly reflection concept

Omnivae should support a nightly reflection flow that helps the user tell the story of the day rather than merely checking boxes.

The user may say, for example:

- what they completed,
- what they skipped,
- what unexpected events occurred,
- how they felt,
- what mattered,
- what should change tomorrow.

### 14.3 AI behavior

The reflection assistant may:

- summarize the day,
- ask relevant follow-up questions,
- identify likely updates to tasks/progress,
- propose journal highlights,
- propose schedule adaptations,
- identify repeated patterns,
- preserve meaningful context.

It must distinguish **proposals** from **confirmed updates**. User-authored narrative must not be overwritten by an AI summary.

### 14.4 Tone and wellbeing

Reflection must not shame the user. The system should prioritize sustainable improvement and wellbeing over perfect schedule adherence.

### Acceptance criteria

- Reflection can be saved locally.
- AI is optional; manual journaling still works.
- AI-derived updates indicate their source.
- Consequential changes require confirmation according to `rules.md`.
- User can edit/delete the reflection and AI summary according to retention rules.

---

## 15. AI chat requirements

### 15.1 Provider-agnostic AI

The AI layer must support adapters so providers can be added without hard-coding product logic to one vendor.

Target provider classes include:

- hosted API providers,
- OpenAI-compatible endpoints,
- local model runtimes such as Ollama/LM Studio class integrations.

Concrete provider support is phase-dependent.

### 15.2 BYOK

Users may enter their own provider credentials.

Credentials must:

- be validated when feasible,
- be stored with platform secure storage or encrypted fallback,
- never be logged,
- never be committed to source,
- never appear in analytics,
- never be placed in URLs.

### 15.3 Local-by-default conversation storage

Users can:

- delete one conversation,
- delete all conversations,
- export chats,
- disable chat history,
- control whether chat data is eligible for sync.

### 15.4 AI memory

AI memory is separate from raw chat history.

Users must be able to:

- see memory entries or a meaningful memory summary,
- delete individual user-facing memories where supported by the product model,
- clear all Omnivae AI memory,
- disable memory capture,
- keep chats while clearing memory or clear chats while keeping explicitly retained memory, if the schema supports this separation.

AI memory must be profile-scoped and local by default.

### 15.5 External data disclosure

Before or during use of an external AI provider, the UI must make clear that the submitted prompt/context is processed by that provider.

---

## 16. AI agent requirements

### 16.1 Controlled tools

Agents must operate through explicit tool contracts, not arbitrary database access.

Tool categories may include:

- read goals,
- read tasks,
- read calendar,
- read selected notes/reflections,
- propose schedule,
- create/update tasks after approval,
- create/update events after approval,
- summarize progress.

### 16.2 Approval model

Default rule:

- read-only analysis may proceed if the user granted access to that data,
- proposed writes must be previewed,
- significant writes require user approval,
- destructive actions require explicit confirmation,
- external side effects require explicit permission and integration-specific safeguards.

### 16.3 Progress intelligence

The long-term AI differentiator is not generic conversation. It is a loop such as:

`Goal → current state → gap → plan → schedule → action/evidence → reflection → progress review → next plan`

The AI must rely on actual stored evidence and user-confirmed context rather than inventing accomplishments.

---

## 17. Health requirements

### 17.1 Product importance

Health is a first-class pillar of Omnivae and should receive product quality comparable to planning and AI.

### 17.2 Health dashboard direction

The system should be designed to represent data such as:

- steps/activity,
- heart rate,
- sleep,
- workouts,
- calories/energy where available,
- water,
- weight/BMI where user-entered or supplied,
- SpO2 where available,
- stress/readiness-style signals where a source provides them,
- temperature where a source provides it,
- nutrition summaries.

Not every source supplies every metric. Missing metrics must not be fabricated.

### 17.3 Data sources and integrations

Future integration targets may include platform and vendor health ecosystems, for example:

- Android Health Connect,
- Apple Health,
- Fitbit,
- Garmin,
- Samsung Health,
- Xiaomi/Mi Fitness ecosystems,
- Amazfit/Zepp,
- Polar,
- direct BLE devices where technically and legally appropriate.

The system should prefer platform health aggregation APIs where appropriate rather than building a bespoke integration for every device in the first release.

### 17.4 Consent and privacy

Health import must be opt-in and permission-scoped. Omnivae must not silently send health data to a cloud AI model.

### 17.5 Wellbeing insights

Omnivae may detect patterns such as:

- repeated short sleep,
- sustained overwork,
- skipped meals if tracked,
- declining activity,
- repeated missed workouts.

The product should frame these as observations and choices, not diagnoses.

---

## 18. Study and skill growth requirements

The Study module may include:

- topics,
- study sessions,
- planned vs actual study time,
- resources,
- linked goals/projects,
- skill tracking.

A future skill graph can model:

`Goal → required skills → resources → projects/evidence → skill progress`

Study progress must be grounded in recorded sessions/evidence or explicit user confirmation.

---

## 19. Gym/workout requirements

The Gym module should support structured workout tracking without requiring a wearable.

Baseline model:

- workout session,
- exercise,
- sets,
- repetitions,
- load/weight,
- duration when applicable,
- notes,
- timestamps.

Future health imports may complement manual workout records but must avoid uncontrolled duplicate creation.

---

## 20. Habits and routines requirements

Habits/routines are recurring behaviors distinct from one-off tasks.

The system should support:

- recurrence definition,
- completion records,
- streak/statistics derived from completions,
- pausing/archiving,
- optional relationship to goals.

Do not store a streak as the only source of truth; derive it from completion records.

---

## 21. Analytics and progress requirements

The system should aggregate from source records into:

- daily,
- weekly,
- monthly,
- yearly views.

Examples:

- study duration,
- task completion,
- habit adherence,
- workout frequency/volume,
- goal evidence,
- health trends.

Rules:

- aggregation must be reproducible,
- raw/source records remain the source of truth,
- computed summaries may be cached but must be rebuildable,
- timezone boundaries must be respected,
- a UI filter must not mutate history.

---

## 22. Search requirements

The product should evolve toward cross-module search while preserving profile boundaries.

Search may cover:

- notes,
- tasks,
- goals,
- calendar events,
- journal entries,
- projects,
- AI conversation titles/messages according to history settings,
- files metadata.

AI semantic retrieval is a later layer. Core exact/text search must not require a remote model.

---

## 23. Notifications and reminders

Notifications are phase-dependent, but the domain model must allow:

- task reminders,
- calendar reminders,
- habit/routine reminders,
- nightly reflection prompt,
- schedule change notifications,
- future sync/integration status alerts.

Local notifications should be preferred where a cloud service is not necessary.

---

## 24. Offline requirements

When offline, a local profile should still be able to:

- unlock the app,
- view dashboards,
- create/edit/complete tasks,
- create/edit calendar events,
- track habits,
- create/edit notes,
- create journal entries,
- log workouts/study,
- view locally stored health history,
- review local AI chats,
- use a local model if configured,
- queue future sync changes when sync exists.

Network-only actions must show a clear unavailable/pending state rather than failing silently.

---

## 25. Sync and cloud requirements

### 25.1 Local-first default

Managed cloud sync is not required for the earliest product phase.

### 25.2 Future sync modes

The architecture should permit:

1. local only,
2. user-owned cloud/backup,
3. optional managed Omnivae cloud.

### 25.3 Sync correctness

When sync is implemented it must include:

- stable identifiers,
- versioning,
- outbox/change log,
- retry behavior,
- deletion tombstones,
- conflict detection,
- explicit conflict strategy,
- profile/account authorization,
- encrypted transport.

Sync must not make the local database a disposable cache. Local remains a first-class data store.

---

## 26. Settings requirements

Settings should include clear categories such as:

- profile and local security,
- modules,
- dashboard layout,
- appearance/preferences,
- AI providers/models,
- AI memory/history,
- data export/deletion,
- privacy and permissions,
- health/device integrations,
- calendar integrations,
- sync/account,
- notifications,
- storage,
- about/system status,
- developer/debug options only when appropriate.

### System status direction

A system status view may show:

- local database state,
- selected AI provider/model,
- calendar integration state,
- health integration state,
- cloud sync state,
- notification permission/state,
- storage usage,
- Bluetooth/integration availability when relevant.

---

## 27. Data portability and deletion

The user must have meaningful control over their records.

Design for:

- export of user data,
- deletion of one record,
- deletion of module data where appropriate,
- chat deletion,
- AI memory deletion,
- profile deletion,
- eventual cloud account deletion if managed cloud exists.

Deletion behavior must be explicit when sync/backup exists. Tombstones or remote propagation must not resurrect deliberately deleted data.

---

## 28. Security and privacy requirements

Minimum requirements:

- profile isolation,
- encrypted sensitive local data,
- secure credential storage,
- no plaintext API keys in logs/source/analytics/URLs,
- no trusting client-supplied cloud user IDs,
- server-side authorization for cloud mode,
- TLS for network transport,
- explicit user permission for external integrations,
- least-privilege access where possible,
- safe export/deletion behavior,
- no hidden external transmission of personal context.

See `rules.md` and `architecture.md` for binding implementation constraints.

---

## 29. Accessibility and responsive UX

The UI should support:

- keyboard navigation on web/desktop-sized layouts,
- readable contrast and scalable text,
- touch targets suitable for mobile/tablet,
- responsive navigation,
- screen-reader semantics for core controls,
- stylus-friendly future note/drawing interaction on supported tablets.

Accessibility regressions count as product defects.

---

## 30. Performance expectations

Exact budgets should be benchmarked by phase, but the product should follow these qualitative requirements:

- local CRUD feels immediate,
- dashboard does not trigger unnecessary AI/network calls,
- large histories use pagination/virtualization where needed,
- indexes support common profile/time/status queries,
- analytics use incremental/rebuildable aggregation rather than scanning the entire database on every render,
- offline startup remains functional after the app shell is installed/cached.

---

## 31. Primary user journeys

### Journey A — First local use

1. Open Omnivae.
2. Create local profile.
3. Choose PIN/password; optionally configure biometrics where available.
4. Select modules or accept defaults.
5. Land on dashboard.
6. Create first task/note/event without creating a cloud account.

### Journey B — Plan a week

1. Open Calendar.
2. Review existing commitments.
3. Create or apply routines/templates.
4. Copy a day or week pattern if needed.
5. Resolve conflicts.
6. Save.
7. Dashboard reflects planned work.

### Journey C — AI plan proposal

1. Tell AI a goal/deadline.
2. AI reads only allowed context.
3. AI prepares schedule/task proposal.
4. User reviews changes.
5. User approves selected changes.
6. Approved records are written atomically.
7. Audit/provenance indicates AI-assisted origin where appropriate.

### Journey D — Nightly reflection

1. User opens or receives a local reminder for reflection.
2. User tells the story of the day in text/voice when available.
3. AI summarizes and asks relevant follow-up questions.
4. AI proposes progress/task/calendar updates.
5. User confirms changes.
6. Reflection and confirmed updates are saved.
7. Future planning may use confirmed context.

### Journey E — Health review

1. User opens Health.
2. View local/manual/imported metrics.
3. See trends and source attribution.
4. Optionally ask AI about selected health context.
5. App clearly indicates what data will be shared with the selected provider.

### Journey F — Note to action

1. User writes note.
2. Selects text or note action.
3. Converts to task/event/goal.
4. Reviews structured fields.
5. Saves.
6. New entity links back to source note.

---

## 32. Functional priority map

Priority definitions:

- **P0** — required for a usable local-first foundation.
- **P1** — required for the first strong product release.
- **P2** — differentiating intelligence/integration layer.
- **P3** — future scale/ecosystem.

### P0

- product shell/navigation
- local profile
- local unlock
- storage abstraction
- profile isolation
- tasks
- calendar basic CRUD
- notes basic CRUD
- goals basic CRUD
- dashboard baseline
- settings baseline
- offline persistence
- import/export foundation
- test infrastructure

### P1

- multi-profile
- encryption/secure secrets
- modular dashboard
- habits/routines
- study
- gym
- journal/reflection manual mode
- files metadata/attachments
- daily/weekly/monthly/yearly analytics
- schedule copy/paste day/week
- schedule templates
- BYOK AI chat
- AI history controls
- AI memory controls baseline
- PWA/mobile packaging

### P2

- AI planning proposal engine
- nightly AI reflection
- adaptive rescheduling
- progress intelligence
- richer goal/skill graph
- health platform integrations
- external calendar adapters
- local model integrations
- user-owned sync/backup
- voice workflows
- richer notes/stylus

### P3

- managed Omnivae cloud
- automatic cross-device sync
- collaboration where appropriate
- plugin ecosystem
- broader vendor integrations
- paid cloud tier if product strategy chooses it

---

## 33. Release-level acceptance gates

A release cannot be declared complete because screens exist.

It must satisfy all of the following:

1. Required feature behavior matches this PRD.
2. Architecture rules are not violated.
3. Schema migrations are valid.
4. Required tests in `testing.md` pass.
5. No P0 security/privacy defects remain open.
6. Offline behavior for the phase is verified.
7. Multi-profile isolation is verified for any multi-profile release.
8. No secrets are leaked into logs/build artifacts.
9. Accessibility smoke tests pass for new core flows.
10. `memory.md` is updated with what is actually complete, what failed, and what is next.

**Never mark a task, subtask, phase, feature, or release as completed unless its required test cases pass.**

---

## 34. Open product decisions

These are intentionally not invented. An agent must not silently lock them without an explicit decision or ADR.

- Exact visual design system and component library.
- Exact database implementation details per platform beyond the storage abstraction baseline.
- Exact encryption library/key hierarchy.
- First external AI providers to ship.
- First health integration to ship.
- First calendar integration to ship.
- Whether guest profiles persist by default.
- Exact sync provider for user-owned backup.
- Managed cloud vendor stack, if/when P3 begins.
- Exact voice transcription and TTS providers.
- Monetization/pricing.

When one is decided, update `memory.md`, relevant specification files, and an ADR if architectural.

---

## 35. Product terminology

Use these terms consistently:

- **Profile** — local isolated user identity/data boundary on a device.
- **Cloud account** — optional remote authentication identity; not the same as a local profile.
- **Module** — functional life domain such as Study or Gym.
- **Widget** — dashboard component.
- **Source record** — original stored evidence such as a task completion or study session.
- **Aggregation** — derived daily/weekly/monthly/yearly summary.
- **AI conversation** — ordered AI/user messages.
- **AI memory** — durable structured context distinct from raw chat history.
- **Proposal** — AI-generated suggested changes not yet committed.
- **Approval** — explicit user authorization to commit a proposal.
- **Local-first** — local data and workflows remain first-class even when optional cloud exists.

---

## 36. Final product statement for agents

When choosing between a shortcut and the product philosophy, preserve these invariants:

- local-first,
- privacy-first,
- profile isolation,
- modularity,
- user control over AI,
- health/wellbeing treated seriously,
- actual evidence over fabricated progress,
- adaptive planning over punishment,
- one connected data model,
- tests before completion.

If an implementation decision undermines one of these, stop and document the conflict instead of silently shipping it.
