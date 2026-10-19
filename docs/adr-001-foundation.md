# ADR-001 — Static Android bundle and foundation tooling

Date: 2026-09-25. Status: accepted implementation choice; production gates pending.

The original Next.js/React + Capacitor architecture is retained. Next.js exports static assets bundled into the Android APK; server actions and server-only runtime routes cannot be dependencies of core local workflows.

The project uses npm workspaces and a lockfile. TypeScript 7 initially built successfully but the selected Next ESLint tooling rejects its removed compiler API. TypeScript 6 is selected for compatibility rather than weakening lint checks. Node 24 is the supported development runtime (the installed Codex bundled Node 24.19.0 is available); system Node 22.12 triggered a transitive engine warning. Do not change machine PATH without need; a session PATH can select the bundled runtime.

Capacitor 8.5.2 generated Android compile/target SDK 36, Java 21 source compatibility, AGP 8.13.0 and Gradle wrapper 8.14.3. Use the wrapper; globally installed Gradle 9.8 is not the project toolchain. JDK 17 is too old for Java 21 source; bundled JBR 25 is not selected for this older wrapper. User is installing JDK 21 and SDK Platform 36.

No schema migrations introduced. Production verification must include Android packaging, installation, offline launch and device behavior; web build alone is insufficient.
