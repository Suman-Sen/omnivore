# Omnivae — Backend and Data Structure

> Status: Logical schema contract  
> Version: 1.0  
> Last consolidated: 2026-09-08  
> Applies to: local stores first; future cloud mappings second

## 0. Purpose

This document defines the **logical data model** for Omnivae. It is deliberately storage-engine-neutral so the same domain model can map to IndexedDB on web, SQLite on mobile, and a future PostgreSQL-backed sync service.

This is not permission to create all future tables on day one. Implement tables/stores by phase, but preserve the contracts and invariants below.

Any material schema change requires:

1. migration/version change,
2. migration tests,
3. update to this file,
4. update to `memory.md`,
5. passing tests before the related task is marked complete.

---

## 1. Global schema principles

### 1.1 Stable IDs

Use UUID/ULID-class stable IDs for user-domain records. IDs must not encode sensitive data.

Conceptual type:

```text
EntityId = opaque string, globally collision-resistant
```

### 1.2 Profile ownership

Every personal record must be directly or transitively owned by a `profile_id`.

Prefer direct `profile_id` on frequently queried personal tables even if ownership can be inferred through a parent. This improves isolation checks and indexing.

### 1.3 Common timestamps

Unless a table is immutable and clearly documented otherwise, use:

```text
created_at      UTC timestamp
updated_at      UTC timestamp
```

When deletion must synchronize or remain recoverable:

```text
deleted_at      nullable UTC timestamp
```

### 1.4 Sync-ready metadata

Do not require sync fields in every MVP table if sync is not yet implemented, but reserve the model for:

```text
revision             integer/string
origin_device_id     nullable ID
sync_state            local_only | pending | synced | conflict | error
remote_revision      nullable string
last_synced_at        nullable timestamp
```

### 1.5 Provenance

Where AI, import, conversion, or bulk operations can create records, preserve source/provenance:

```text
created_by_type      user | ai_approved | import | system | sync
created_by_ref       nullable ID/string
source_type          nullable enum
source_id            nullable ID/string
bulk_operation_id    nullable ID
```

### 1.6 Secrets

**Do not store plaintext credentials in this logical database.** Store only a reference to secure credential storage.

---

## 2. Value conventions

### IDs

```text
profile_id, task_id, etc. = opaque stable ID
```

### Timestamps

```text
UTC instant: 2026-09-08T12:34:56.789Z
```

### Local date

For date-only semantics:

```text
YYYY-MM-DD
```

### Timezone

Use IANA names:

```text
Asia/Kolkata
America/New_York
```

### JSON

Use structured JSON only for extensible metadata that is not heavily queried. Do not hide core query fields inside one JSON blob.

---

# 3. Identity and profile schema

## 3.1 `profiles`

Represents one isolated local profile.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | primary key |
| display_name | text | yes | local display name |
| avatar_file_id | ID | no | references file metadata |
| timezone | text | yes | IANA timezone |
| locale | text | no | UI locale |
| status | enum | yes | active, locked, archived, deleted |
| profile_type | enum | yes | standard, guest |
| created_at | timestamp | yes | UTC |
| updated_at | timestamp | yes | UTC |
| deleted_at | timestamp | no | soft-delete when needed |

Do not place raw password/PIN here.

### Indexes

- primary `id`
- `status`

---

## 3.2 `profile_auth`

Stores local authentication metadata, not raw credentials.

| Field | Type | Required | Notes |
|---|---|---:|---|
| profile_id | ID | yes | PK/FK to profile |
| auth_mode | enum | yes | password, pin, biometric_wrapped, none_guest |
| verifier | binary/text | conditional | password/PIN verifier or wrapped-key metadata; never plaintext |
| kdf_algorithm | text | conditional | approved KDF identifier |
| kdf_params_json | JSON | conditional | salt/parameters, no secret |
| biometric_key_ref | text | no | reference to secure platform storage |
| failed_attempts | integer | yes | local throttling support |
| locked_until | timestamp | no | optional lockout |
| updated_at | timestamp | yes | UTC |

Security implementation must be reviewed before production hardening.

---

## 3.3 `profile_settings`

One row/object per profile.

| Field | Type | Required | Notes |
|---|---|---:|---|
| profile_id | ID | yes | PK |
| theme | enum/text | no | appearance |
| week_starts_on | integer | yes | 0-6 convention documented |
| date_format | text | no | presentation preference |
| time_format | enum | no | 12h/24h |
| default_calendar_view | text | no | day/week/month |
| reflection_enabled | boolean | yes | default product choice |
| reflection_local_time | local time | no | if enabled |
| ai_memory_enabled | boolean | yes | default product choice |
| ai_history_enabled | boolean | yes | default product choice |
| health_ai_access | enum | yes | off, per_request, allowed_scope |
| updated_at | timestamp | yes | UTC |

Do not turn every setting into a column if it is truly feature-specific; module settings may live in module config records.

---

## 3.4 `modules`

Registry of known module definitions. This may be static code/config rather than a DB table.

Conceptual fields:

```text
module_key
name
is_core
availability_phase
version
```

---

## 3.5 `profile_modules`

| Field | Type | Required | Notes |
|---|---|---:|---|
| profile_id | ID | yes | composite key |
| module_key | text | yes | composite key |
| enabled | boolean | yes | optional module state |
| sort_order | integer | no | module launcher/navigation |
| config_json | JSON | no | small module-specific settings |
| updated_at | timestamp | yes | UTC |

Career/Job must be representable as disabled without affecting other modules.

---

# 4. Dashboard schema

## 4.1 `dashboard_layouts`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| name | text | yes | e.g. Main |
| is_default | boolean | yes | one per context as defined |
| view_context | enum | yes | home, daily, weekly, etc. |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 4.2 `dashboard_widgets`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| layout_id | ID | yes | parent |
| widget_key | text | yes | registered widget type |
| enabled | boolean | yes | |
| position | integer | yes | ordering |
| size | enum/text | no | responsive hint |
| config_json | JSON | no | widget-specific config |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

### Unique constraint

Recommended: `(layout_id, widget_key)` when only one instance per widget type is allowed. If duplicate widget instances are supported later, remove this assumption and add explicit instance semantics.

---

# 5. Tasks schema

## 5.1 `tasks`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| title | text | yes | |
| description | text | no | |
| status | enum | yes | pending, in_progress, completed, cancelled |
| priority | enum | yes | none, low, medium, high, urgent if chosen |
| due_at | timestamp | no | absolute due time |
| due_local_date | date | no | optional date-only due |
| scheduled_start_at | timestamp | no | |
| scheduled_end_at | timestamp | no | |
| timezone | text | no | schedule timezone when required |
| completed_at | timestamp | no | durable completion time |
| goal_id | ID | no | optional direct relationship |
| project_id | ID | no | optional future relationship |
| recurrence_rule_id | ID | no | optional recurrence definition |
| parent_task_id | ID | no | subtask hierarchy if enabled |
| order_key | text/number | no | manual sorting |
| created_by_type | enum | yes | provenance |
| created_by_ref | text/ID | no | |
| source_type | enum | no | note, reflection, import, ai_proposal, etc. |
| source_id | ID | no | |
| bulk_operation_id | ID | no | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| deleted_at | timestamp | no | |

### Indexes

- `(profile_id, status)`
- `(profile_id, due_at)`
- `(profile_id, due_local_date)`
- `(profile_id, scheduled_start_at)`
- `(profile_id, goal_id)`
- `(profile_id, updated_at)`

### Invariants

- `completed_at` should be set when status is `completed`.
- completion is not inferred merely because `due_at` passed.
- scheduled end must not precede scheduled start unless a clearly defined overnight/local-date representation handles it.

---

## 5.2 `task_events`

Recommended for durable state/history when progress analytics need transitions.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| task_id | ID | yes | |
| event_type | enum | yes | created, status_changed, completed, reopened, cancelled, rescheduled |
| occurred_at | timestamp | yes | |
| old_value_json | JSON | no | |
| new_value_json | JSON | no | |
| actor_type | enum | yes | user, ai_approved, import, sync, system |
| actor_ref | ID/text | no | |

This is optional early but useful for reliable history.

---

# 6. Goal schema

## 6.1 `goals`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| title | text | yes | |
| description | text | no | |
| status | enum | yes | active, paused, completed, abandoned, archived |
| parent_goal_id | ID | no | hierarchy |
| target_date | date | no | |
| progress_mode | enum | yes | evidence, milestone, manual, hybrid |
| manual_progress_value | decimal | no | only when allowed by progress mode |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| completed_at | timestamp | no | |
| deleted_at | timestamp | no | |

## 6.2 `goal_milestones`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| goal_id | ID | yes |
| title | text | yes |
| status | enum | yes |
| target_date | date | no |
| completed_at | timestamp | no |
| order_index | integer | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 6.3 `goal_progress_events`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | |
| profile_id | ID | yes | |
| goal_id | ID | yes | |
| event_type | enum | yes | evidence_added, manual_update, milestone_complete, reflection_confirmed, recalculated |
| value | decimal | no | only if meaningful |
| note | text | no | |
| source_entity_type | text | no | task/study/workout/etc. |
| source_entity_id | ID | no | |
| actor_type | enum | yes | |
| occurred_at | timestamp | yes | |

AI may propose such events but cannot fabricate source evidence.

---

# 7. Calendar schema

## 7.1 `calendars`

Supports local and future external calendars.

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| name | text | yes | |
| source_type | enum | yes | local, external |
| provider_key | text | no | google, apple adapter label, etc. |
| external_calendar_id | text | no | opaque provider ID |
| color_key | text | no | display token, not required |
| read_only | boolean | yes | |
| enabled | boolean | yes | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 7.2 `calendar_events`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | PK |
| profile_id | ID | yes | owner |
| calendar_id | ID | yes | |
| title | text | yes | |
| description | text | no | |
| location | text | no | |
| is_all_day | boolean | yes | |
| start_at | timestamp | conditional | timed event |
| end_at | timestamp | conditional | timed event |
| start_local_date | date | conditional | all-day/local-date |
| end_local_date | date | conditional | document inclusive/exclusive convention |
| timezone | text | no | IANA |
| recurrence_rule_id | ID | no | |
| external_event_id | text | no | provider source ID |
| external_etag/revision | text | no | provider change token |
| source_type | enum | yes | user, template, import, ai_approved, external |
| source_id | ID/text | no | |
| bulk_operation_id | ID | no | copy/template provenance |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| deleted_at | timestamp | no | |

### Indexes

- `(profile_id, start_at)`
- `(profile_id, start_local_date)`
- `(profile_id, calendar_id, start_at)`
- `(profile_id, external_event_id)` where applicable
- `(profile_id, bulk_operation_id)`

---

## 7.3 `recurrence_rules`

Use a standards-compatible representation where practical (e.g. RRULE semantics), wrapped by domain logic.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| rrule_text | text | yes |
| timezone | text | no |
| start_local_date | date | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

Do not hand-roll an incomplete recurrence grammar across multiple modules.

---

## 7.4 `schedule_templates`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | |
| profile_id | ID | yes | |
| name | text | yes | office routine, weekend, etc. |
| description | text | no | |
| template_type | enum | yes | day, week, range/pattern |
| timezone | text | no | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| deleted_at | timestamp | no | |

## 7.5 `schedule_template_items`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | |
| profile_id | ID | yes | |
| template_id | ID | yes | |
| day_offset | integer | yes | e.g. 0..6 for week |
| start_local_time | time | no | |
| end_local_time | time | no | |
| all_day | boolean | yes | |
| title | text | yes | |
| payload_json | JSON | no | validated template metadata |
| order_index | integer | yes | |

---

## 7.6 `bulk_operations`

Tracks bulk schedule/template/proposal application.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| operation_type | enum | yes |
| source_ref | ID/text | no |
| status | enum | yes | planned, approved, applying, committed, rolled_back, failed |
| plan_hash/version | text | no |
| created_at | timestamp | yes |
| committed_at | timestamp | no |
| rolled_back_at | timestamp | no |
| metadata_json | JSON | no |

---

# 8. Notes schema

## 8.1 `notes`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| title | text | no |
| content_format | enum | yes | plain, markdown, richtext, future |
| content | text/structured | yes |
| pinned | boolean | yes |
| favorite | boolean | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

### Search indexes

Storage-specific full-text/text indexing may be introduced, but must remain profile-scoped.

---

# 9. Entity links and tags

## 9.1 `entity_links`

Flexible cross-module relationships.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| from_type | text/enum | yes |
| from_id | ID | yes |
| relation_type | enum | yes |
| to_type | text/enum | yes |
| to_id | ID | yes |
| created_at | timestamp | yes |

Example relations:

- `derived_from`
- `supports_goal`
- `scheduled_as`
- `references`
- `evidence_for`

### Constraint

Both ends must belong to the same profile unless a future explicit cross-account sharing feature defines otherwise.

## 9.2 `tags`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | yes |
| created_at | timestamp | yes |

## 9.3 `entity_tags`

Composite relationship:

```text
profile_id
entity_type
entity_id
tag_id
```

---

# 10. Habits and routines schema

## 10.1 `habits`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | yes |
| description | text | no |
| status | enum | yes | active, paused, archived |
| recurrence_rule_id | ID | yes |
| target_count | decimal | no |
| target_unit | text | no |
| goal_id | ID | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

## 10.2 `habit_completions`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| habit_id | ID | yes |
| local_date | date | yes |
| occurred_at | timestamp | yes |
| value | decimal | no |
| note | text | no |
| source_type | enum | yes |
| source_id | ID/text | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

Streaks are derived from these records.

---

# 11. Study and skills schema

## 11.1 `study_topics`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | yes |
| description | text | no |
| goal_id | ID | no |
| status | enum | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 11.2 `study_sessions`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| topic_id | ID | no |
| goal_id | ID | no |
| planned_start_at | timestamp | no |
| planned_end_at | timestamp | no |
| actual_start_at | timestamp | no |
| actual_end_at | timestamp | no |
| duration_seconds | integer | no | derived/cached if actual times exist |
| notes | text | no |
| source_type | enum | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

## 11.3 `skills`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | yes |
| description | text | no |
| status | enum | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 11.4 `skill_evidence`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| skill_id | ID | yes |
| evidence_type | enum | yes |
| source_entity_type | text | yes |
| source_entity_id | ID | yes |
| weight/value | decimal | no |
| note | text | no |
| created_at | timestamp | yes |

AI progress summaries must refer to real evidence records or explicit user confirmations.

---

# 12. Gym/workout schema

## 12.1 `workouts`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | no |
| started_at | timestamp | yes |
| ended_at | timestamp | no |
| notes | text | no |
| source_type | enum | yes | manual, health_import, etc. |
| source_id | text | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

## 12.2 `exercises`

Exercise catalog may have system/global templates, but user-specific entries must remain scoped.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | conditional | null only for vetted built-in catalog item |
| name | text | yes |
| category | text | no |
| metadata_json | JSON | no |

## 12.3 `workout_exercises`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| workout_id | ID | yes |
| exercise_id | ID | yes |
| order_index | integer | yes |
| notes | text | no |

## 12.4 `workout_sets`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| workout_exercise_id | ID | yes |
| set_index | integer | yes |
| reps | decimal | no |
| load_value | decimal | no |
| load_unit | enum | no | kg, lb |
| duration_seconds | integer | no |
| distance_value | decimal | no |
| distance_unit | enum | no |
| completed | boolean | yes |
| notes | text | no |

---

# 13. Journal and reflection schema

## 13.1 `journal_entries`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| entry_local_date | date | yes |
| title | text | no |
| user_narrative | text | yes |
| mood_value | text/number | no | only if product defines it |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

## 13.2 `reflection_sessions`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| local_date | date | yes |
| journal_entry_id | ID | no |
| status | enum | yes | draft, reviewing, completed, abandoned |
| started_at | timestamp | yes |
| completed_at | timestamp | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 13.3 `reflection_ai_outputs`

Stored separately from user narrative.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| reflection_session_id | ID | yes |
| output_type | enum | yes | summary, followup_question, insight, proposal |
| content | text/JSON | yes |
| provider_key | text | no |
| model_key | text | no |
| created_at | timestamp | yes |
| accepted_at | timestamp | no |
| rejected_at | timestamp | no |

---

# 14. AI configuration schema

## 14.1 `ai_provider_configs`

Stores non-secret configuration.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| provider_key | text | yes |
| display_name | text | no |
| base_url | text | no | validated; never include API key |
| credential_ref | text | no | pointer to secure storage |
| default_model | text | no |
| enabled | boolean | yes |
| config_json | JSON | no | safe non-secret provider options |
| last_validated_at | timestamp | no |
| validation_status | enum | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

Unique recommended: `(profile_id, provider_key, display_name/config instance key)`.

---

## 14.2 `ai_conversations`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| title | text | no |
| history_enabled_at_creation | boolean | yes |
| provider_config_id | ID | no |
| model_key | text | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

## 14.3 `ai_messages`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| conversation_id | ID | yes |
| role | enum | yes | user, assistant, system_internal, tool |
| content | text/structured | yes |
| provider_message_id | text | no |
| model_key | text | no |
| token_usage_json | JSON | no | optional/non-sensitive |
| created_at | timestamp | yes |
| deleted_at | timestamp | no |

Do not store provider keys/tokens in message metadata.

---

# 15. AI memory schema

## 15.1 `ai_memories`

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | ID | yes | |
| profile_id | ID | yes | strict scope |
| memory_type | enum/text | yes | preference, goal_context, routine, user_confirmed_fact, etc. |
| content | text/structured | yes | user-visible representation must be possible |
| status | enum | yes | active, archived, deleted, rejected_candidate |
| source_type | enum | yes | user_explicit, conversation, reflection, import |
| source_id | ID | no | provenance |
| confidence | decimal | no | if used, not a truth substitute |
| user_confirmed | boolean | yes | distinguishes inferred vs explicit |
| expires_at | timestamp | no | for temporary context |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| deleted_at | timestamp | no | |

### Required deletion semantics

- delete one memory → excluded from retrieval immediately,
- clear all → all active memory for profile becomes unavailable to retrieval,
- disable capture → no new durable memory candidate is persisted as active.

---

# 16. AI tools/proposal schema

## 16.1 `ai_proposals`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| conversation_id | ID | no |
| intent | text | yes |
| status | enum | yes | draft, pending_approval, approved, rejected, expired, applied, failed |
| proposal_version | integer | yes |
| operations_json | JSON | yes | validated structured operations |
| warnings_json | JSON | no |
| conflicts_json | JSON | no |
| provider_key | text | no |
| model_key | text | no |
| plan_hash | text | yes | binds approval to proposal content |
| expires_at | timestamp | no |
| approved_at | timestamp | no |
| rejected_at | timestamp | no |
| applied_at | timestamp | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 16.2 `ai_proposal_approvals`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| proposal_id | ID | yes |
| proposal_version | integer | yes |
| plan_hash | text | yes |
| approval_scope_json | JSON | yes | selected operations if partial approval allowed |
| confirmed_destructive | boolean | yes |
| approved_at | timestamp | yes |

Approval is invalid if version/hash no longer matches.

---

# 17. Health schema

## 17.1 `health_sources`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| source_type | enum | yes | manual, health_connect, apple_health, vendor, ble |
| provider_key | text | no |
| display_name | text | yes |
| credential_ref | text | no | secure store ref if needed |
| permission_state_json | JSON | no | scopes only, no secret token |
| sync_cursor_ref | text | no | safe cursor metadata if applicable |
| connected_at | timestamp | no |
| disconnected_at | timestamp | no |
| last_import_at | timestamp | no |
| status | enum | yes |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

## 17.2 `health_samples`

Normalized metric records.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| source_id | ID | yes |
| metric_type | enum/text | yes |
| value_num | decimal | conditional |
| value_text | text | conditional |
| value_json | JSON | conditional | structured metrics only |
| unit | text | no |
| start_at | timestamp | yes |
| end_at | timestamp | no |
| timezone | text | no |
| source_record_id | text | no | external stable source ID |
| device_name/model | text | no | if permitted |
| metadata_json | JSON | no | source quality/context |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

### Unique/dedupe recommendation

For imported records, unique where feasible on:

```text
(profile_id, source_id, source_record_id, metric_type)
```

If source lacks stable IDs, use documented deterministic fingerprint rules and test them.

### Indexes

- `(profile_id, metric_type, start_at)`
- `(profile_id, source_id, start_at)`

---

## 17.3 `health_daily_summaries`

Optional cached projection, not source of truth.

| Field | Type | Required |
|---|---|---:|
| profile_id | ID | yes |
| local_date | date | yes |
| metric_type | text | yes |
| summary_json | JSON | yes |
| projection_version | integer | yes |
| source_updated_through | timestamp | no |
| computed_at | timestamp | yes |

Composite primary/unique key: `(profile_id, local_date, metric_type, projection_version)` or implementation equivalent.

---

# 18. Files and attachments schema

## 18.1 `files`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| file_name | text | yes |
| mime_type | text | no |
| size_bytes | integer | yes |
| storage_provider | enum | yes | browser_local, mobile_private, cloud_future |
| storage_locator | text | yes | opaque local/provider locator |
| checksum | text | no |
| encryption_state | enum | yes | according to platform design |
| sync_state | enum | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

`storage_locator` is not assumed to be a URL.

## 18.2 `file_links`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| file_id | ID | yes |
| entity_type | text | yes |
| entity_id | ID | yes |
| relation_type | enum | yes | attachment, avatar, source_document, etc. |
| created_at | timestamp | yes |

---

# 19. Projects schema — planned optional module

## 19.1 `projects`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| name | text | yes |
| description | text | no |
| status | enum | yes |
| goal_id | ID | no |
| start_date | date | no |
| target_date | date | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| deleted_at | timestamp | no |

Project tasks should use the shared `tasks` table through `project_id`, not a completely separate task engine unless requirements later demand it.

---

# 20. Optional Career/Job schema

Career is optional and must remain isolated from core onboarding.

Potential entities:

- `career_profiles`
- `job_applications`
- `job_contacts`
- `career_goals`

Do not implement until the corresponding phase/feature is authorized.

---

# 21. Notifications schema

## 21.1 `reminders`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| entity_type | text | no |
| entity_id | ID | no |
| reminder_type | enum | yes |
| scheduled_at | timestamp | no |
| local_time | time | no |
| timezone | text | no |
| recurrence_rule_id | ID | no |
| enabled | boolean | yes |
| platform_notification_id | text | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |

Nightly reflection reminders can use this structure.

---

# 22. Integration schema

## 22.1 `integration_accounts`

Non-secret metadata for external integrations.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| integration_type | enum | yes | calendar, health, storage, etc. |
| provider_key | text | yes |
| external_account_label | text | no |
| credential_ref | text | no | secure store reference |
| status | enum | yes |
| scopes_json | JSON | no |
| created_at | timestamp | yes |
| updated_at | timestamp | yes |
| disconnected_at | timestamp | no |

---

# 23. Import/export schema

## 23.1 `data_exports`

Optional local audit metadata:

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| format_version | text | yes |
| scope_json | JSON | yes |
| created_at | timestamp | yes |
| file_id | ID | no |
| encryption_state | enum | yes |

## 23.2 Export format requirements

A future canonical export should include:

```text
manifest
schema_version
profile-scoped domain records
attachment manifest
provenance
optional encrypted payload metadata
```

Do not export secure-storage secrets unless a separate explicit secure credential export design exists.

---

# 24. Sync schema — future

## 24.1 `devices`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile/account scope | ID | yes |
| device_label | text | no |
| created_at | timestamp | yes |
| last_seen_at | timestamp | no |
| revoked_at | timestamp | no |

## 24.2 `sync_outbox`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| entity_type | text | yes |
| entity_id | ID | yes |
| operation | enum | yes | upsert, delete |
| local_revision | text/int | yes |
| payload_json | JSON | conditional |
| created_at | timestamp | yes |
| attempt_count | integer | yes |
| next_attempt_at | timestamp | no |
| state | enum | yes |
| last_error_code | text | no |

## 24.3 `sync_conflicts`

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id | ID | yes |
| entity_type | text | yes |
| entity_id | ID | yes |
| local_revision | text | yes |
| remote_revision | text | yes |
| local_payload_json | JSON | yes |
| remote_payload_json | JSON | yes |
| resolution_state | enum | yes |
| resolution_json | JSON | no |
| created_at | timestamp | yes |
| resolved_at | timestamp | no |

Conflict rules are per entity and must be documented before sync ships.

---

# 25. Audit/provenance schema

## 25.1 `audit_events`

Local audit is optional; cloud security audit becomes more important later.

| Field | Type | Required |
|---|---|---:|
| id | ID | yes |
| profile_id/account_id | ID | conditional |
| actor_type | enum | yes |
| actor_ref | ID/text | no |
| action | text | yes |
| entity_type | text | no |
| entity_id | ID | no |
| occurred_at | timestamp | yes |
| metadata_json | JSON | no |

Never put secrets or raw private content in audit metadata.

---

# 26. Search/index schema

Core local search should operate without an external AI model.

Possible implementation layers:

1. ordinary indexed fields,
2. storage-specific full-text index,
3. optional semantic embedding index in a later phase.

If semantic embeddings are introduced:

- profile-scope them,
- preserve source entity references,
- honor deletion immediately,
- document whether embedding generation is local or external,
- never send data externally without permission.

---

# 27. Derived analytics schema

Avoid one table per UI chart. Use projection families.

Conceptual generic projection:

```text
progress_projection
- profile_id
- domain_key
- period_type        day|week|month|year
- period_start_local
- metric_key
- value_num/value_json
- timezone
- projection_version
- computed_at
```

This is a cache. Source records remain canonical.

For high-volume health data, specialized summaries may be more efficient.

---

# 28. Deletion semantics

Every entity must declare one of:

### Hard delete

Use only when safe and no sync/audit/recovery semantics require retention.

### Soft delete

Set `deleted_at`, hide from ordinary queries, allow purge later.

### Tombstone

For sync, retain minimal deletion identity/version until remote peers acknowledge deletion.

### Cascade rules

Do not cascade-delete meaningful independent records merely because a link is deleted.

Examples:

- deleting a note does not automatically delete a task created from it,
- deleting an entity link never deletes either endpoint,
- deleting a dashboard widget does not delete source module data,
- deleting a calendar template does not necessarily delete already created events.

Each implementation must test its chosen behavior.

---

# 29. Referential integrity rules

Even when IndexedDB cannot enforce SQL foreign keys directly, application/repository logic must enforce equivalent invariants.

Required checks:

- linked entities exist,
- linked entities share profile ownership,
- parent IDs cannot create cycles where hierarchy forbids them,
- deleted parents follow documented orphan behavior,
- external source IDs remain unique within appropriate provider/profile scope.

SQLite/PostgreSQL implementations should use foreign keys where practical in addition to application checks.

---

# 30. Indexing plan

At minimum, index common query dimensions:

- `profile_id`,
- status,
- local date/time range,
- `updated_at`,
- foreign relationship IDs,
- external source IDs,
- sync state,
- proposal status,
- AI conversation ID.

Do not add indexes speculatively to every field. Use query patterns and profiling.

---

# 31. Data encryption classification

Classify data at least conceptually:

### Class S — secrets

- API keys,
- OAuth tokens,
- encryption keys,
- password/PIN credential material.

Storage: secure credential store / protected keychain; not ordinary app DB.

### Class H — highly private

- journal/reflections,
- AI conversations/memory,
- health data,
- potentially sensitive notes/files.

Storage: local protected/encrypted strategy; external sharing is opt-in/contextual.

### Class P — personal operational

- tasks,
- calendar,
- goals,
- study/gym/habits.

Storage: profile-scoped local DB, protected according to app security design.

### Class C — configuration/non-sensitive

- widget positions,
- module enabled flags,
- safe UI preferences.

Still profile-scoped if user-specific.

---

# 32. Schema migration model

Maintain a monotonically increasing local schema version.

Conceptual migration directory:

```text
migrations/
  0001_profiles.ts
  0002_tasks_goals_notes.ts
  0003_calendar.ts
  0004_dashboard.ts
  ...
```

Each migration includes:

- `from_version`,
- `to_version`,
- migration operation,
- data transformation,
- validation,
- test fixtures.

### Required migration tests

- fresh install,
- previous version with empty tables,
- previous version with representative data,
- multiple profiles,
- deleted records where applicable,
- failed/interrupted migration recovery behavior.

---

# 33. Cloud schema mapping — future

When PostgreSQL exists, do not simply copy every local implementation detail blindly.

Cloud tables should preserve domain semantics while adding:

- authenticated account ownership,
- device/sync metadata,
- authorization policies/RLS,
- audit fields,
- remote revision/version,
- server timestamps where required.

### Critical authorization rule

The server derives account identity from the authenticated session. The client cannot choose another owner's identity by supplying `user_id`.

---

# 34. Example logical object — Task

```json
{
  "id": "01J...",
  "profile_id": "01P...",
  "title": "Finish project draft",
  "description": null,
  "status": "pending",
  "priority": "high",
  "due_at": "2026-09-12T18:30:00Z",
  "due_local_date": "2026-09-13",
  "timezone": "Asia/Kolkata",
  "goal_id": "01G...",
  "created_by_type": "user",
  "source_type": null,
  "source_id": null,
  "created_at": "2026-09-08T03:20:00Z",
  "updated_at": "2026-09-08T03:20:00Z",
  "deleted_at": null
}
```

Example only; exact serializer may differ.

---

# 35. Example logical object — AI proposal

```json
{
  "id": "01PROP...",
  "profile_id": "01P...",
  "intent": "plan_week",
  "status": "pending_approval",
  "proposal_version": 1,
  "operations_json": [
    {
      "op": "create_calendar_event",
      "temp_id": "op-1",
      "title": "Project work",
      "start_at": "2026-09-09T13:30:00Z",
      "end_at": "2026-09-09T15:30:00Z"
    }
  ],
  "warnings_json": [],
  "conflicts_json": [],
  "plan_hash": "sha256:...",
  "created_at": "2026-09-08T03:30:00Z"
}
```

An approval must bind to this exact version/hash.

---

# 36. Schema acceptance checklist for new entities

Before adding a new entity/table/store, answer:

- [ ] What is the owner/profile boundary?
- [ ] Is the ID stable enough for future sync?
- [ ] What are create/update/delete semantics?
- [ ] What timestamps are required?
- [ ] Does it contain secrets? If yes, why is it not in secure storage?
- [ ] Is it source data or derived data?
- [ ] What indexes support real queries?
- [ ] What links/foreign keys are required?
- [ ] What happens when linked records are deleted?
- [ ] What is offline behavior?
- [ ] What migration introduces it?
- [ ] What tests verify it?
- [ ] Are AI/import provenance fields needed?
- [ ] Will future sync need tombstones/versioning?

Do not mark schema work complete until all required schema and migration tests pass.

## Implementation draft — local profiles, schema version 1 (2026-09-28)

Status: prototype, disabled in shipped UI; no migration or feature completion claim.

The initial adapters implement profiles, profile_auth and encrypted profile_settings. TypeScript serialization uses camelCase for the fields implemented so far; SQLite maps these to snake_case columns. Remaining logical fields (including full profile lifecycle and complete settings) must be reconciled before the phase gate; these prototypes do not replace the logical contract above.

IndexedDB migration 0001 creates three stores atomically. The current test verifies fresh initialization and populated reopen; it does NOT prove an older populated schema upgrade. SQLite initializes its version-1 tables with parameterized queries and an atomic multi-insert for profile creation. Native conformance and interrupted-migration cases remain pending.

Authentication stores a random salt, PBKDF2 iteration count, wrapped profile data key and throttling state. AES-GCM encrypted preferences are bound to profile identity through authenticated additional data. Neither passwords nor unwrapped keys are stored. Native chooser metadata remains unencrypted; the preference payload is encrypted at the application boundary. See docs/adr-002-profile-security.md.

## Implementation migrations 0002/0003 — profiles and core planning (2026-10-03)

Status: in_progress; full logical schema and phase gates are not yet complete.

- Version 2 adds standard profile type and active lifecycle metadata to version-1 profiles. Public chooser identity remains unencrypted. Existing wrapped keys and preferences ciphertext are preserved. New preference defaults are applied after decryption (memory capture and health AI access remain off). Runtime lock is a session condition, not a persistent lifecycle value.
- Version 3 creates an encrypted per-record `records` store/table keyed by (profile_id, id), with profile index (and native kind index), revision, kind and ciphertext envelope. Logical task/goal/note/calendar/milestone/task-event/journal fields are serialized in authenticated encrypted payloads; application services enforce their invariants. This physical mapping preserves the logical entities above; it does not claim the remaining entities are implemented.
- AES-GCM authenticated context includes profile, record ID and revision. Search currently decrypts only the active profile's records locally; future performance work must preserve this boundary.
- Multi-record writes compare the read snapshot and changed-record revisions inside the transaction, then commit atomically. A concurrent edit causes a recoverable conflict instead of lost updates or dangling cross-record links.
- Deletion writes a tombstone and atomically clears optional links; deleting a goal tombstones its owned milestones but preserves independent tasks/child goals. Task transition history remains; derived progress excludes deleted records.
- All-day event end dates are exclusive. Timed event instants are stored as UTC ISO strings with an IANA timezone. Nonexistent wall times are rejected; repeated times require an explicit earlier/later choice.
- IndexedDB version-change transactions and native plugin upgrade statements preserve existing data. Native upgrade tests and crash/failure recovery remain mandatory before migration completion.

- Dashboard preferences now include ordered visible widget keys and Journal module visibility in encrypted settings; old preference payloads receive non-destructive defaults on read. Source-based task/calendar/journal range summaries use profile timezone and configurable week start. This is the initial implemented dashboard subset, not all P3 widgets/modules.

### Timed goal targets — 2026-10-04 additive payload extension

Encrypted goal payloads may include targetAt (UTC instant) and timezone (IANA zone); targetDate remains date-only. targetDate and targetAt are mutually exclusive. Timed targets require timezone. Old records without either new field remain valid; no table migration is needed because the version 3 record envelope is unchanged. UI interprets edits in active profile timezone and shows that timezone explicitly. Task dueAt and scheduled start/end retain existing semantics. Common createdAt/updatedAt values are service-managed and now visible in task/goal cards.

### AI proposal record payloads — 2026-10-04

Version 3 encrypted record envelopes now carry ai_proposal and ai_approval kinds, mapping logical ai_proposals/ai_proposal_approvals. Proposal payload stores typed before/after operations, derived task events, provider/model, intent, warnings, scoped base revisions, expiry, content SHA-256, monotonically increasing proposalVersion and state. Approval stores exact version/hash and all selected record IDs. Full-plan approval is supported; partial approval and destructive AI operations are not yet supported and are rejected. Plan application and durable task events/approval/proposal state are one atomic snapshot-checked transaction. Profile isolation applies below presentation; these payloads never contain provider credentials. Existing records need no table rewrite.

## Appearance persistence migration 0004 — 2026-10-04
- IndexedDB version 4 adds profile_backgrounds keyed by profileId. SQLite version 4 adds profile_backgrounds(profile_id PK/FK profiles, encrypted_value). Each holds one bounded encrypted raster asset per profile; preferences and planning records never embed image bytes. Replacement/removal is a single atomic storage operation. No prior data is rewritten.
- Encrypted preference payload appearanceVersion 2 adds accentColor/backgroundColor, validated #RRGGBB. Older payloads receive version 2 defaults after decryption without overwriting existing settings.
- Backgrounds use the existing AES-GCM adapter with profile-specific :background authenticated context. UI reads through token-authorized ProfileService methods. Browser platform adapter decodes/re-encodes raster content, strips metadata, bounds input at 12 MB/40 MP and output at 1920 pixels/1.4 million data-URL characters. This is an appearance asset implementation, not completion of the general Files module.

## Section navigation payloads — 2026-10-04
- Existing v4 generic encrypted records support new discriminants custom_section and section_entry, payloadVersion 1. A section has title, description and archived; an entry has sectionId, title, content and completed. Both preserve profileId, id, revision, timestamps and deletion tombstones. SectionService enforces scope, same-profile live section links and compare-and-swap writes. Hiding uses archived and preserves entries; entry deletion is tombstoned only after user confirmation. No physical schema change beyond migration 0004.
- Preference navigationVersion 1 adds sectionLabels (built-in key to name) and sectionOrder (built-in keys/custom:<UUID>). Legacy ciphertext receives non-destructive defaults after unlock. enabledModules/journalEnabled remain visibility controls for built-ins.
## Calendar gallery and preference additions — 2026-10-05
Storage migration 0005 adds calendar_gallery, one encrypted bounded snapshot per profile, containing version 1, selectedId, activeId, and up to six validated resized raster assets. Ciphertext binds to profile-id:calendar-gallery. Writes compare previous IV transactionally to reject stale updates. Profile deletion transaction removes all five child stores/tables then identity. Original device image files remain untouched.
Preferences add sectionStyles keyed by stable built-in/custom section identity, dashboardCharts keyed by widget, and calendarDisplay (imageTransparency 0..100, font enum, fontColor #RRGGBB). Legacy decrypted preferences receive defaults; no credentials or image data are placed in preferences.
