-- 006_certificates.sql
--
-- A certificate is issued by passing the final exam. It is the one piece of
-- learner data with a public face: `GET /certificates/:id/verify` is the only
-- public business route in the API, because a certificate an employer needs an
-- account to check is worth nothing (11-api-surface.md).
--
-- That public face is exactly why the fields are split the way they are. The
-- verification code resolves to the issue date, the score and the display name
-- the learner had when it was issued — and to nothing else. The day-1 vs day-28
-- comparison lives in its own column so a public verification policy in 008 can
-- expose the proof of authenticity without exposing the learner's progress
-- history to anyone holding the code.

create table if not exists public.certificates (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references public.learner_profiles (id) on delete cascade,
  -- The attempt that earned it. Restricted, not cascaded: deleting the attempt
  -- behind an issued certificate would leave a verifiable claim with nothing
  -- backing it.
  exam_attempt_id    uuid        not null references public.exam_attempts (id) on delete restrict,
  -- The public handle. Format XXXX-XXXX-XXXX, uppercase, unambiguous characters
  -- only — it gets read off a screen and typed into another one.
  verification_code  text        not null unique,
  -- Snapshotted at issue, never joined at read time: the certificate must keep
  -- saying what it said on the day it was issued, even if the learner later
  -- changes their display name.
  learner_name       text        not null,
  track              text        not null,
  score_percent      numeric(5, 2) not null,
  issued_at          timestamptz not null default now(),
  -- Day-1 vs day-28 comparison. Private to the learner; the public verification
  -- view in 008 does not expose it.
  comparison         jsonb       not null default '{}'::jsonb,
  -- Issued in error, or revoked. A revoked certificate still verifies — it
  -- verifies as revoked. Deleting the row would make a fraudulent copy of the
  -- code indistinguishable from one that never existed.
  revoked_at         timestamptz,
  revoked_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint certificates_verification_code_format
    check (verification_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  constraint certificates_track_check
    check (track in ('standard28', 'sprint21')),
  constraint certificates_score_range
    check (score_percent between 0 and 100),
  constraint certificates_revocation_has_reason
    check ((revoked_at is null) = (revoked_reason is null)),
  -- One certificate per attempt. A re-run of the issue path finds the row it
  -- already wrote instead of minting a second code for the same pass.
  constraint certificates_attempt_unique
    unique (exam_attempt_id)
);

comment on table public.certificates is
  'Issued by passing the final. verification_code is public; comparison is not. A revoked certificate verifies as revoked.';

comment on column public.certificates.verification_code is
  'The public handle, XXXX-XXXX-XXXX. Read off one screen and typed into another, so uppercase and hyphenated.';

comment on column public.certificates.learner_name is
  'Snapshotted at issue. A certificate must keep saying what it said on the day it was issued.';

-- ---------------------------------------------------------------------------
-- Row Level Security — on now, policies in 008
-- ---------------------------------------------------------------------------
-- The public verification path is a policy, not an absence of one: RLS stays on
-- and 008 grants an anonymous read of the verification columns only.
alter table public.certificates enable row level security;
