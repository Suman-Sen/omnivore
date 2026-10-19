# Omnivae issue and crash register

No application runtime exists yet; there are no captured application crash reports.

## ENV-001 — npm registry denied inside sandbox

- Status: workaround verified for metadata lookup; installation not yet verified.
- Reproduction: npm.cmd view next version --fetch-retries=0 --fetch-timeout=15000.
- Actual: EACCES connecting to registry.npmjs.org:443; default npm log folder also unwritable.
- Cause: environment access restrictions.
- Resolution: same registry lookup with approved require_escalated execution returned 16.3.6.
- Prevention: use required network escalation for registry operations; record dependency/install results separately.

## ENV-002 — Git discovers drive-root repository

- Status: open.
- Reproduction: git status --short from project folder.
- Actual: unsafe repository D:/ owned by someone else.
- Resolution plan: initialize isolated .git in project. Do not add D:/ to safe.directory.

## ENV-003 — Android SDK path does not resolve

- Status: investigating.
- User supplied D:/Users/suman/AppData/Local/Android/Sdk.
- Actual: platform-tools/adb.exe, platforms and build-tools absent at supplied paths.
- Java 17 path works; Gradle bin exists.
- Resolution plan: locate actual SDK; verify compile platform, build tools, platform tools and wrapper compatibility.

## DEV-001 — PowerShell inventory syntax

- Status: resolved.
- Actual: piping directly after foreach statement caused ParserError (empty pipe element).
- Fix: assign loop output to a task-specific variable, then pipe the variable.
- Verification: corrected command successfully enumerated saved User/Machine environment entries.

## Future incident format

ID, date/build, severity, reproduction, expected/actual, sanitized error, root cause, affected requirements, fix files/commit, regression tests and evidence, remaining risk, status.
Never store journal/chat/health contents, credentials, signing keys or raw private payloads here.

## DEV-002 — Compiler tooling incompatibility

Resolved: TypeScript 7 removed an API expected by lint tooling. Pin TypeScript 6.0.3; strict lint/type/build checks now pass. Node 24.19.0 is the verified runtime.

## DEP-001 — Capacitor CLI transitive UUID advisory

Resolved for current dependency graph: xcode -> uuid upgraded through scoped override to 11.1.1. Its CommonJS v4 usage inspected; scripts/check-build-dependencies.mjs confirms ID generation. npm audit reports zero vulnerabilities. No runtime user data involved.

## DEV-003 — Lint navigation violation

Resolved: root anchor replaced with Next Link in apps/web/app/page.tsx. Strict lint and browser checks passed afterward.

## ENV-004 — Sandbox helper failure

Open environment problem: helper_unknown_error / setup refresh had errors prevents ordinary shell/file helpers. Approved escalated commands work. Image verification also affected.

## ENV-005 — Slow lint and build setup

First native build downloaded Gradle/dependencies/SDK packages and succeeded in 12m. Lint narrowed to first-party paths to avoid caches; separate debug trace showed ~69s rule/config startup and 367ms source checking. No unsupported claim of permanent performance fix.

## ENV-003 update — SDK resolved

Actual SDK root D:/Users/suman/AppData/Local/Android/Sdk/platform-tools. Platform 36 and Build-Tools 35 automatically installed by Gradle under existing accepted licenses. Native assembleDebug passed using JDK 21.0.12. No need to reinstall SDK.

## ANDROID-001 — Safe area CSS initialization
Status: open. Redmi cold launch succeeded, but Capacitor SystemBars injected CSS before its target element existed. Exact log: Cannot read properties of null (reading 'style'). Investigate timing before marking device shell gate passed.


ANDROID-001 update: native padding configured; three on-device cold-launch regressions pass, original exception absent. Evidence logs/device/2026-10-02-tablet.json. Typecheck/lint/build pass. Broader device gate remains incomplete.


## 2026-10-03 — Profile UI feedback timing

First browser E2E run: three viewport failures, radio click did not change state. Cause: controlled radio state was updated only after asynchronous encryption/database persistence; immediate click semantics reverted the selection. Fix: display selection synchronously, disable controls while saving, and restore the last persisted preferences if the save fails. Persistence and reload assertions remain unchanged. Reverification pending next web build.

## 2026-10-03 — Native profile initialization failure

- Device test failed waiting for Profile name; actual app safely showed Local storage could not open.
- Process-scoped error: SQLiteLog no such table: profiles in ALTER TABLE profiles ADD COLUMN status.
- Root cause: native upgrade version 1 supplied the entire multi-statement schema as one array entry. The native upgrade executor treats each entry as one SQLite statement, so initial table definitions were not all executed before version 2.
- Fix: split the static first-party schema into individual nonempty statements before registering the upgrade. No dynamic/user SQL is split or interpolated. Native migrations already use plugin backup/restore.
- Reference: https://github.com/capacitor-community/sqlite/blob/master/docs/UpgradeDatabaseVersion.md and installed Android UtilsUpgrade/Database source.
- Do not clear tablet app data. Re-run upgrade against the preserved failed-start database to verify recovery.

## 2026-10-05 — Appearance/section verification findings
- Sandbox helper still fails before process creation; approved escalation permits project work. Environment issue, not an Omnivae crash.
- Gradle wrapper attempted remote download without project-local GRADLE_USER_HOME and timed out. Reused existing ignored .local/gradle cache with wrapper/JDK21/SDK36 and --offline; build/install passed.
- Appearance browser selector matched both app error and Next route announcer. Scoped to expected image error; 12 then 18 browser flows passed.
- Study topic exact label included nested option text. Used accessible combobox name; all life-module browser flows passed without changing expected behavior.
- Tablet visual review found raw calendar text over arbitrary backgrounds. Added readable workspace surfaces; final browser/device checks passed for targeted coverage.
- Sidebar Add section could fall below fold. Moved Add above a separately scrolling nav, preserving Settings/Lock access; final replay in progress.
- Earlier airplane-mode run relied on an old synthetic completed-task fixture and failed its Reopen assertion; original cause not established. Replaced the scenario with a newly created/completed fixture and explicit persistence readback. The rerun passed with real airplane mode, rotation and settings restoration. Do not infer this alone proves all data-loss or offline cases absent.
