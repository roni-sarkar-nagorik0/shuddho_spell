-- 005_notification_tables.sql
--
-- Two live channels: in-app and web push. The app sends no email (09-notifications.md).
--
-- `email` stays a legal value in the channel check constraint on purpose: it is
-- the v2 door, held open at zero cost so adding the channel later needs no
-- migration. NotificationPolicy treats it as unavailable — it is never selected
-- and a preference row for it is never created. A value the schema permits and
-- the domain refuses is a deliberate asymmetry, not an oversight.
--
-- The one thing this file exists to guarantee is idempotency. Dispatch runs as a
-- cron route on a platform that may retry an invocation that already sent half
-- its batch, and there is no long-running process holding state between ticks.
-- The unique key on (profile_id, type, scheduled_for) is the only thing standing
-- between a retried tick and a double-send.

-- ---------------------------------------------------------------------------
-- notifications — one row per notification, whatever channel carried it
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                   uuid        primary key default gen_random_uuid(),
  profile_id           uuid        not null references public.learner_profiles (id) on delete cascade,
  type                 text        not null,
  title                text        not null,
  body                 text        not null,
  severity             text        not null default 'info',
  payload              jsonb       not null default '{}'::jsonb,
  -- The instant the dispatcher was aiming at, not the instant it ran. Two ticks
  -- of the same hourly job aim at the same scheduled_for, which is what makes
  -- the unique key below reject the second one.
  scheduled_for        timestamptz not null,
  sent_at              timestamptz,
  read_at              timestamptz,
  -- Which channels actually delivered it. Empty means the row was written but
  -- nothing has gone out yet — a queued notification, not a failed one.
  channels_delivered   text[]      not null default array[]::text[],
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint notifications_type_check
    check (type in (
      'daily_reminder',
      'streak_at_risk',
      'review_items_due',
      'exam_unlocked',
      'exam_result',
      'weekly_report',
      'milestone_reached',
      'product_update'
    )),
  constraint notifications_severity_check
    check (severity in ('info', 'success', 'warning', 'critical')),
  constraint notifications_channels_delivered_check
    check (channels_delivered <@ array['in_app', 'push', 'email']::text[]),
  -- Read implies sent. A notification the learner has read but that was never
  -- sent is a bug in the dispatcher, and this is where it surfaces.
  constraint notifications_read_implies_sent
    check (read_at is null or sent_at is not null),
  -- The idempotency key. A retried job, a duplicated cron tick, a scheduler
  -- firing twice, or a redeploy mid-run cannot produce a second row.
  constraint notifications_idempotency_unique
    unique (profile_id, type, scheduled_for)
);

comment on table public.notifications is
  'One notification. The (profile_id, type, scheduled_for) unique key makes a retried cron tick a no-op.';

comment on column public.notifications.scheduled_for is
  'The window the dispatcher aimed at, not when it ran. It is what makes the idempotency key stable across retries.';

comment on column public.notifications.channels_delivered is
  'Channels that actually delivered. email is permitted by the check but never written — the app sends no email.';

-- ---------------------------------------------------------------------------
-- notification_preferences — one row per learner per type per channel
-- ---------------------------------------------------------------------------
-- Quiet hours can span midnight (22:00 → 07:00). That is the classic off-by-one
-- and it is the policy service's job, not a check constraint's: start > end is
-- legal data here and means "wraps".
create table if not exists public.notification_preferences (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        not null references public.learner_profiles (id) on delete cascade,
  type                text        not null,
  channel             text        not null,
  enabled             boolean     not null default true,
  quiet_hours_start   time,
  quiet_hours_end     time,
  reminder_time       time,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint notification_preferences_type_check
    check (type in (
      'daily_reminder',
      'streak_at_risk',
      'review_items_due',
      'exam_unlocked',
      'exam_result',
      'weekly_report',
      'milestone_reached',
      'product_update'
    )),
  -- 'email' is legal here and never written. See the header.
  constraint notification_preferences_channel_check
    check (channel in ('in_app', 'push', 'email')),
  -- Quiet hours are set as a pair or not at all. One half of a window is not a
  -- window, and the policy would have to guess which way it opened.
  constraint notification_preferences_quiet_hours_paired
    check ((quiet_hours_start is null) = (quiet_hours_end is null)),
  constraint notification_preferences_unique
    unique (profile_id, type, channel)
);

comment on table public.notification_preferences is
  'Per learner, per type, per channel. Quiet hours may wrap midnight — start > end is legal and means "wraps".';

-- ---------------------------------------------------------------------------
-- push_subscriptions — one browser, one endpoint
-- ---------------------------------------------------------------------------
-- The endpoint is unique globally, not per learner: it identifies a browser
-- install. If a device is handed to another learner, the row moves rather than
-- being duplicated, and a push never reaches the wrong person.
create table if not exists public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.learner_profiles (id) on delete cascade,
  endpoint     text        not null unique,
  -- The Web Push keys, exactly as the browser gave them: { p256dh, auth }.
  keys         jsonb       not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A subscription missing either key cannot be encrypted to, so web-push would
  -- fail at send time on every tick. Refuse it at write time instead.
  constraint push_subscriptions_keys_complete
    check (keys ? 'p256dh' and keys ? 'auth')
);

comment on table public.push_subscriptions is
  'One row per browser install. A 410 Gone from the endpoint means the adapter deletes the row immediately.';

comment on column public.push_subscriptions.endpoint is
  'Globally unique: it identifies a browser, not a learner. Re-subscribing the same browser moves the row.';

-- ---------------------------------------------------------------------------
-- Row Level Security — on now, policies in 008
-- ---------------------------------------------------------------------------
alter table public.notifications             enable row level security;
alter table public.notification_preferences  enable row level security;
alter table public.push_subscriptions        enable row level security;
