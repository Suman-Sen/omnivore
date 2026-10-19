# Omnivae tablet delivery contract

Status: accepted user requirements; implementation not yet verified.

## Session requirements — 2026-09-25

- Primary device: Redmi Pad 2 Pro, 8 GB RAM. Android version and free storage still need verification.
- Deliver an installable Android APK and the complete reproducible source project locally on this PC.
- Target delivery: October 7, 2026, before the expected October 8 renewal. This is a target, not evidence of completion or permission to drop scope.
- All seven root specifications remain authoritative. Summaries do not replace detailed requirements.
- Customizable glassmorphic UI with alternative solid/minimal and accessible themes; profile-scoped appearance preferences.
- AI generates day, week, and month schedules from user needs and constraints, with conversational revision, conflict detection, exact preview, approval and atomic application.
- Two-way voice conversation with spoken replies and follow-up context, including voice-driven schedule creation. Speech recognition, speech synthesis, and model inference are separate capabilities.
- Optional on-device AI, optional hosted AI, and AI-disabled manual use. PC-hosted inference must be labeled distinctly from standalone tablet inference.
- Pocket LLM reference: https://github.com/dineshsoudagar/local-llms-on-android/releases/tag/v1.5.0 . External-app API compatibility is unverified; inspect source before choosing integration. Do not assume installing its APK enables Omnivae access.
- Maintain working logs, crash/bug records, root causes, resolutions, test evidence, and agent handoffs.
- User authorizes autonomous implementation and routine decisions. Ask for missing tools, credentials, physical-device access, or material product decisions when necessary.
- Real-tablet testing is expected at early APK, local inference, and release stages. User can connect USB when needed.

## Scope preservation

The detailed specification and future/optional classifications remain intact. No requirement is silently deferred for the date target. An implementation phase is complete only after its applicable testing.md gates pass. New requirements must receive explicit test mappings before claiming completion.

## Proposed additional acceptance IDs

- TABLET-001: signed APK installs, launches, and restarts on the target tablet.
- TABLET-002: core workflows operate in airplane mode without a PC server.
- THEME-001: appearance controls persist independently per profile.
- THEME-002: glass, solid and high-contrast modes remain readable in portrait/landscape.
- PLAN-RANGE-001/002/003: AI produces validated day/week/month proposals respectively.
- PLAN-RANGE-004: follow-up constraints revise proposals and invalidate old approvals.
- VOICE-001: record/transcribe/respond/speak supports continued conversation.
- VOICE-002: denied microphone permission and interrupted speech preserve recoverable state.
- VOICE-003: spoken approval binds to the exact reviewed proposal; ambiguity performs no write.
- LOCAL-AI-001: selected model runs on target tablet after download with network disabled.
- LOCAL-AI-002: cancellation, low memory and inference failure leave domain data unchanged.
- LOCAL-AI-003: benchmark model load time, generation speed, RAM and thermal behavior on device.

These IDs supplement testing.md; they are planned tests, not pass claims.

## User direction — 2026-10-04

- Reconfirmed optional on-device local LLM and online chat with both Gemini and OpenAI.
- Chat must be able to create/update goals and complete day schedules through the existing exact proposal preview/approval/domain-write pipeline; conversational day/week/month planning remains required.
- Prioritize a daily calendar/timeline view with clickable tasks/events, task completion and direct editing.
- User authorizes routine UI/function improvements to maximize usability. This does not remove documented features, privacy/profile boundaries or exact AI proposal approval.
- CAL-UI-010: daily timeline displays scheduled tasks and events in profile timezone, opens edit by click, and completes tasks durably; phone/tablet and offline cases required.
- AI-PROV-005/006: real OpenAI and Gemini adapters, configuration/error handling/secret isolation, scoped structured planning proposals.
- Additional IDs are required verification targets, not pass claims.

## Task/goal time and notification direction — 2026-10-04

- TIME-001: tasks expose created/updated timestamps, optional due date/time and scheduled start/end in profile timezone; completion time remains durable.
- TIME-002: goals support date-only or exact date/time targets, persisted and editable, with explicit DST ambiguity handling.
- NOTIFY-010: user selects reminder-enabled tasks and priority rules manually or via an exactly approved AI proposal. Priority alone must not silently enable notifications.
- NOTIFY-011: selected reminders support completion check-ins and time-up prompts with an explicit extend-time action. Silence never implies completion or extension.
- NOTIFY-012: history durably records reminder delivery/interaction outcomes as observable by the OS, completion and time extensions including old/new times. Retry/restart must not duplicate actions.
- NOTIFY-013: phone delivery must be tested on the chosen phone and architecture. Tablet-local notifications alone do not satisfy phone delivery; permission denial, offline, timezone changes and profile privacy need coverage.
- Notifications are a later implementation slice requested by user, currently not implemented or verified. Cross-device transport/phone onboarding requires clarification before implementation.

## Custom appearance direction — 2026-10-04
- User requests editable hex UI colors and local background images while retaining all documented functions.
- THEME-003: six-digit accent/background hex validation, durable profile isolation, reset and accessible accent text.
- THEME-004: local PNG/JPEG/WebP selection, resize, encrypted profile-private persistence, replacement/removal, corrupt/oversize rejection, offline restart and lock clearing. High contrast hides customization without deleting it.

## Section organization direction — 2026-10-04
- User requests an organized layout with one section at a time, an Add section button, editable Study/Workouts/Health and other user-chosen sections.
- SECTION-001: focused responsive navigation to core/life/AI/settings/custom sections.
- SECTION-002: add/show/hide optional sections without deleting records; rename built-in/custom sections.
- SECTION-003: reorder navigation and retain labels/order across restart independently per profile.
- SECTION-004: custom sections support description plus editable local notes/checklist entries, durable explicit completion and confirmed deletion. Custom entries are not silently treated as scheduled Tasks or specialized future modules.
- SECTION-005: enforce section/entry ownership and stale-write protection below UI; offline create/edit/restart, invalid-input and failed-transaction coverage.
## 2026-10-05 — Calendar and personalization additions
- THEME-005: each section has private accent/surface hex and transparency, normalized below UI.
- CAL-SKIN-001: default bundled cherry blossom, bounded encrypted image gallery, selected versus active states, upload activates, explicit deletion restores default if active, offline persistence/isolation, image-only transparency and font/color controls.
- CAL-UI-011: visible month grid with selected-date chronological table, exact time ordering, timezone labels and edit/completion actions; week-start preference honored.
- CHART-001: per-dashboard-widget number/bar/pie/donut choices, explicit scope and no fabricated empty data.
- HISTORY-001: visible local activity view, task transitions, saved chat links/proposals and latest record activity; does not reconstruct unstored edits.
- PROF-DELETE-001: exact profile-name confirmation, atomic active-profile erasure including credentials, records, background and calendar gallery; other profiles retained.
## Start-page profile cleanup and calendar surface clarification — 2026-10-05
- PROF-FORGET-001: user requests removal of old test logins on the start page. Device-local erasure is available from the locked chooser without a profile password, with exact selected-profile name plus an explicit permanent-deletion checkbox. This does not reveal/decrypt records. Other profiles remain unchanged. This is intentionally distinct from unlocking protected data; anyone with access to the device's app chooser can erase a local profile after confirmation.
- CAL-SKIN-002: image fills the full calendar working panel below gallery controls: month grid, selected-date schedule and Add event area. Image transparency affects this background only; high contrast suppresses images.
- Notifications and two-way voice remain unimplemented. Hosted AI adapters/proposal approval pipeline have simulated test evidence, not verified real-provider scheduling. Exact proposal approval remains required; this status question does not waive approval requirements.

## 2026-10-06 — Standalone tablet priority
User requires AI and voice entirely on Redmi Pad 2 Pro (8 GB physical RAM, 8 GB storage expansion, stylus), alongside optional OpenAI/Gemini. No PC/server dependency. LOCAL-AI-001..003 and VOICE-001..003 remain mandatory. Initial voice interaction is explicit push-to-talk with reviewable transcription and offline spoken replies; wake-word/background assistant remains outside this slice, not claimed delivered.
