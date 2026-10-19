# Profile implementation acceptance map

Status: in_progress. Sources: prd.md sections 7/8, architecture.md sections 5/9/11, schema.md section 3, testing.md section 7, delivery-contract THEME-001/002.

| Acceptance item | Required evidence |
|---|---|
| Create and unlock without email; two independent profiles | PROF-001/002/003, browser and real SQLite device |
| Wrong password and stale token rejected; lock clears displayed private state | PROF-004/005, SEC-ISOLATION-005, background/reload cases |
| Persistent appearance and time/privacy preferences | PROF-007, THEME-001, restart and switching |
| Explicit guest availability/retention | PROF-006: no guest data entry advertised until implemented |
| Atomic creation and scoped adapter operations | STORE-001/002/003, duplicate insertion rollback |
| Stable IDs and v1 to v2 preservation | STORE-004/005/006/007, populated migration and failure recovery |
| Validated preferences and safe failure UI | U-007/010, invalid values and storage error |
| Tablet and phone layout, keyboard controls | THEME-002, accessibility regression |

Full phase gate remains incomplete until all applicable cases pass. PIN, biometrics and production security review remain open; do not equate a targeted password-profile test with full product completion.
