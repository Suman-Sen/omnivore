# Appearance and editable section acceptance map

Status: implemented with targeted evidence; full feature/release gates remain incomplete.

Sources: PRD 6/7.3/8/26/29; architecture profile/application/storage boundaries and section 21 asset abstraction; schema profile_settings/profile_modules and appended migration 0004/section payload contracts; testing PROF-007, STORE-003/005/006/007, SEC-ISOLATION, DASH-001..009 and universal/accessibility cases; delivery contract THEME-001..004 and SECTION-001..005.

| Acceptance | Implementation | Evidence |
|---|---|---|
| THEME-001/003 scoped durable appearance | local-profile.ts normalization, ProfileService, AppearanceSettings | profiles.test.ts and appearance.spec.ts; native appearance harness |
| THEME-002 readable/responsive styles | styles.css, app-workspace.tsx | browser phone/portrait/landscape; physical rotation dimensions/overflow and screenshot review |
| THEME-004 private raster background | background-image.ts adapter, ProfileService, profile_backgrounds stores | corrupted/type/size rejection and encrypted/isolation/restart tests; real Android picker selection; native SQLite/offline readback |
| SECTION-001 focused navigation | app-workspace.tsx, controlled planning/life views | all 18 browser flows; native custom-section screenshots |
| SECTION-002/003 names/order/visibility | SectionManager, sectionLabels/sectionOrder defaults, custom-section archive | sections.test.ts, sections.spec.ts; native hide/show/restart |
| SECTION-004/005 editable scoped entries | domain/sections.ts, application/section-service.ts, custom-section.tsx | failed/stale/foreign-write tests, browser edits/offline reload, native persistence/isolation |
| STORE-007 non-destructive upgrades | IndexedDB/SQLite v4; preference default upgrade on decrypt | populated older fixture tests; installed native data retained |

Limitations: full device accessibility/TalkBack/large-history performance not certified; custom checklists do not implement specialized habits/projects/finance logic. Native editable-section/appearance tests do not certify every original module gate.
| THEME-005 | Per-section hex accent/surface/transparency | profiles.test.ts, personalization.spec.ts, native personalization harness |
| CAL-SKIN-001 | Encrypted gallery selection/active/deleted states, default blossom, fonts and image-only opacity | profiles.test.ts, calendar-skin.spec.ts, native SQLite v5 harness |
| CAL-UI-011 | Seven-column month and chronological date table | calendar-view.test.ts, calendar-skin.spec.ts explicit seven-column geometry, native screenshots |
| CHART-001/HISTORY-001 | Persistent widget charts and visible activity history | personalization.spec.ts and native harness |
| PROF-DELETE-001 | Name-confirmed profile DB and vault removal | profiles.test.ts failure regression; browser/native disposable profile, original IDs retained |
