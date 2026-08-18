# 09 — Notifications

Three channels: **in-app**, **push**, **email**. One policy service decides which fire.

## Entities

```
NotificationPreference   profileId, channel (inApp|push|email), type, enabled,
                         quietHoursStart, quietHoursEnd, reminderTime
Notification             profileId, type, title, body, severity, payload,
                         readAt, sentAt, channelsDelivered[]
PushSubscription         profileId, endpoint, keys, userAgent, createdAt
```

**Types:** `dailyReminder` · `streakAtRisk` · `reviewItemsDue` · `examUnlocked` ·
`examResult` · `weeklyReport` · `milestoneReached` · `productUpdate`

## NotificationPolicy — the domain service

Given a type and a learner, it decides:

1. which channels are enabled for that type
2. whether **quiet hours** suppress the send
3. whether the send should be deferred to the next allowed window or dropped entirely

Quiet hours **can span midnight** (`22:00 → 07:00`). This is the classic off-by-one; there is
a mandatory test for it.

## Ports and adapters

| Port | Adapter |
| --- | --- |
| `IPushSender` | Web Push with VAPID via `web-push` |
| `IMailer` | Resend or Supabase SMTP — behind the interface either way |
| `IInAppNotifier` | writes a `notifications` row |

The choice of mail provider must never appear outside the adapter.

## Use cases

`RegisterPushSubscription` · `RevokePushSubscription` · `GetNotificationPreferences` ·
`UpdateNotificationPreferences` · `ListNotifications` · `MarkNotificationRead` ·
`MarkAllRead`

Plus one dispatch use case per type: `SendDailyReminder` · `SendStreakAtRisk` ·
`SendReviewItemsDue` · `SendExamUnlocked` · `SendExamResult` · `SendWeeklyReport`.

## Scheduling — the part that is usually wrong

There is no long-running server process, so there is no in-process scheduler.
Dispatch runs as a **cron route handler**: `/api/cron/notifications`, called hourly by Vercel
Cron (or any scheduler), authenticated with `Bearer ${CRON_SECRET}`, `runtime = 'nodejs'`.

The job **runs hourly** and selects the learners whose **local** time matches their stored
`reminderTime`.

It does **not** run once at a server-local hour. A learner in UTC+6 with a 20:00 reminder
gets it at 20:00 *their* time. Write the query as "select learners where
`reminder_time` hour = current hour in `learner.timezone`".

## Idempotency

A unique constraint on `(profile_id, type, scheduled_for)`. A retried job, a duplicated
cron tick, a scheduler firing twice, or a redeploy mid-run **cannot double-send**. Proven by
test.

This matters more without a persistent process: a cron invocation can be retried by the
platform after a timeout, having already sent half its batch. The constraint is the only
thing standing between that and duplicate emails.

## Self-cleaning push

A push endpoint returning **410 Gone** means the subscription is dead. The adapter deletes
it immediately. A 429 backs off. A 500 retries once. Nothing else.

## Frontend

- A **service worker** for push.
- The permission prompt is an **inline banner, never a modal**. Browsers punish sites that
  request notification permission in a modal on load, and so do users.
- A bell popover for the in-app feed, with unread counts.
- A toast system for in-session events.
- A preferences table with **In-app / Push / Email** columns, all typed from
  `src/contracts`.

## Required policy tests

| Case | Expected |
| --- | --- |
| quiet hours 22:00→07:00, send at 02:00 | suppressed |
| quiet hours 22:00→07:00, send at 12:00 | delivered |
| push disabled, in-app enabled | in-app only |
| push endpoint returns 410 | subscription deleted, no throw |
| UTC+6 learner, 20:00 reminder | fires at 20:00 local, once |
| the same dispatch retried | one row, one send |
