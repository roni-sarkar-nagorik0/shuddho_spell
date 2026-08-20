# 03 — Database, migrations and RLS

Supabase Postgres 15. **Plain SQL migrations only.** No ORM, no Prisma, no schema builder.

## Migration files

Numbered, idempotent, forward-only, in `supabase/migrations/`:

| File | Contents |
| --- | --- |
| `001_extensions.sql` | `uuid-ossp`, `pgcrypto`, `pg_cron` |
| `002_content_tables.sql` | `phonemes`, `rule_families`, `words`, `word_phonemes`, `sentence_items`, `program_days`, `program_day_items` |
| `003_learner_tables.sql` | `learner_profiles`, `lesson_sessions`, `attempts`, `review_items`, `mastery_records`, `streak_records` |
| `004_exam_tables.sql` | `exam_definitions`, `exam_sections`, `exam_attempts`, `exam_questions`, `exam_answers` |
| `005_notification_tables.sql` | `notifications`, `notification_preferences`, `push_subscriptions` |
| `006_certificates.sql` | `certificates` with a public verification code |
| `007_indexes.sql` | see below |
| `008_rls_policies.sql` | see below |
| `009_functions_triggers.sql` | `updated_at` triggers, profile-on-signup trigger, transactional session-completion function, exam auto-submit function |
| `010_seed_reference.sql` | the 44 phonemes and 24 rule families — real data, not placeholders |

Forward-only means: never edit a shipped migration. Add a new numbered one.

## Table conventions

Every table, without exception:

```sql
id          uuid primary key default gen_random_uuid(),
created_at  timestamptz not null default now(),
updated_at  timestamptz not null default now()
```

plus an `updated_at` trigger from `009`.

- Scores, percentages and any money-like value are `numeric`. **Never `float`** — a 79.999%
  that should be an 80% pass is a real bug.
- Timestamps are `timestamptz`, always. Learner-local time is derived from
  `learner_profiles.timezone`, never stored as naive local time.
- Every learner table carries `profile_id uuid not null references learner_profiles(id) on delete cascade`.
- Enumerated columns are `text` with a `check` constraint matching the TypeScript const union.
  Keep the two in sync; a mismatch is a phase-exit failure.

## Row Level Security

RLS is **on for every table holding user data**, and the policies are written **as if the
API did not exist**. The API using the service-role key is not an excuse for weak policies.

- Learner tables: a learner may `select` / `insert` / `update` only rows where
  `profile_id` resolves to `auth.uid()`. No `delete` from the client at all.
- Content tables (`phonemes`, `words`, `rule_families`, `sentence_items`, `program_days`):
  readable by any authenticated user, writable by **no one** (service role only).
- `exam_questions.correct_answer` must be unreachable from a client. Use a column-level
  policy or a dedicated view that excludes the column, and let the API read it only via the
  service role.

### The two-user proof

`008` ships with a policy test script that connects as two different real users and proves
user A cannot read user B's:

- `attempts`
- `review_items`
- `exam_attempts`
- `exam_answers`
- `notifications`

This script runs again in Phase 13. It is not optional and it is not replaceable by a unit test.

## Triggers and functions

- **On `auth.users` insert** → create the matching `learner_profiles` row. The API's
  `BootstrapProfileUseCase` is idempotent on top of this, not a substitute for it.
- **Session completion** → one Postgres function writing `attempts`, `review_items`,
  `mastery_records` and `streak_records` in a single transaction, invoked through `IUnitOfWork`.
- **Exam auto-submit** → a `pg_cron` job that submits attempts abandoned past
  `server_deadline_at`, so a stale attempt never blocks a retake. Because the app is
  serverless and has no long-running process, this job lives **in the database** and must work
  even when the app is completely down. `/api/cron/exam-autosubmit` is a backstop, not the
  primary path.
- **Rate limiting** → a `rate_limits` table plus a function implementing a fixed-window
  counter, behind `IRateLimiter`. Serverless invocations share no memory, so an in-process
  limiter would not limit anything.

## Indexes

Built for the queries that actually run:

```sql
review_items    (profile_id, due_at)
attempts        (session_id)
exam_answers    (question_id)
exam_questions  (attempt_id, section_code, order_index)
words           (rule_family_id, week_index)
notifications   (profile_id, read_at)
lesson_sessions (profile_id, day_index)
```

Add an index only with the query it serves named in a comment.

## Row interfaces

Row interfaces are **hand-written from the SQL** and live in `src/modules/*/infrastructure/`,
never in `domain/`. Use `supabase gen types` only to *verify* your hand-written interfaces, never as
the source of truth — generated types leak snake_case and nullable-everything into places
that must not know about the database.

```ts
export interface IReviewItemRow {
  readonly id: string;
  readonly profile_id: string;
  readonly item_id: string;
  readonly item_type: string;
  readonly interval_index: number;
  readonly due_at: string;
  readonly is_mastered: boolean;
}
```

A row interface never leaves `infrastructure/`. The mapper is the only file that knows
snake_case exists.
