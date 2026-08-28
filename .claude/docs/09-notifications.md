# 09 — Notifications

**Two channels: in-app and web push. The app sends no email.**

Email is deferred to **v2** and is explicitly out of scope for the 28-day build. Do not
implement `IMailer`, do not add Resend or any SMTP dependency, do not read `RESEND_API_KEY`.
The variables stay commented out in `.env.example`.

What *is* built now keeps the door open at zero cost:

- `email` remains a value in the `NotificationChannel` union and in the database check
  constraint, so adding it in v2 needs **no migration**.
- `NotificationPolicy` treats `email` as an **unavailable channel** — it is never selected,
  and a preference row for it is never created.
- The preferences UI ships **In-app / Push** columns only. No greyed-out third column, no
  "coming soon" row.

One policy service decides which of the two live channels fire.

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

| Port | Adapter | Status |
| --- | --- | --- |
| `IPushSender` | Web Push with VAPID via `web-push` | built now |
| `IInAppNotifier` | writes a `notifications` row | built now |
| ~~`IMailer`~~ | Resend or SMTP | **v2 — not built, not declared** |

Do not declare a port you are not implementing. When email lands in v2, `IMailer` is added
then, with its adapter, in one change. A speculative interface with no implementation is dead
weight that drifts out of date.

## Use cases

`RegisterPushSubscription` · `RevokePushSubscription` · `GetNotificationPreferences` ·
`UpdateNotificationPreferences` · `ListNotifications` · `MarkNotificationRead` ·
`MarkAllNotificationsRead` · `RunHourlyNotifications` (the cron tick)

Plus one dispatch use case per type: `SendDailyReminder` · `SendStreakAtRisk` ·
`SendReviewItemsDue` · `SendExamUnlocked` · `SendExamResult` · `SendWeeklyReport`.

Each dispatches to in-app and push only. `SendWeeklyReport` writes an in-app notification and
sends a push — it does **not** send a weekly email.

## Scheduling — the part that is usually wrong

There is no long-running server process, so there is no in-process scheduler.
Dispatch runs as a **cron route handler**: `/api/cron/notifications`, authenticated with
`Bearer ${CRON_SECRET}`, `runtime = 'nodejs'`, `maxDuration = 60`.

The job is written as an **hourly tick**: it selects the learners whose **local** time matches
their stored `reminderTime`. It does **not** run once at a server-local hour. A learner in
UTC+6 with a 20:00 reminder gets it at 20:00 *their* time. The query is "select learners where
`reminder_time` hour = current hour in `learner.timezone`".

**What actually schedules it is daily, not hourly.** Vercel's Hobby plan refuses any cron
finer than once a day, so `vercel.json` fires `/api/cron/notifications` at `0 14 * * *` and
`/api/cron/exam-autosubmit` at `0 19 * * *`. The consequence is honest and worth stating: on
Hobby a learner only receives a reminder when their local reminder hour lands in the one UTC
hour the job runs. The handler is unchanged and correct — moving to a plan that allows
`0 * * * *`, or pointing any external scheduler at the same URL, restores the behaviour with
no code change. Do not "fix" this by making the job send to everyone on every tick; that
trades a missed reminder for a 3 a.m. one.

`SendWeeklyReportUseCase` is built and tested but **nothing schedules it yet** — there is no
weekly cron entry and the hourly tick does not call it.

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
- A preferences table with **In-app / Push** columns, typed from `src/contracts`.
  No Email column — not greyed out, not "coming soon". It appears in v2 when it works.

## Required policy tests

| Case | Expected |
| --- | --- |
| quiet hours 22:00→07:00, send at 02:00 | suppressed |
| quiet hours 22:00→07:00, send at 12:00 | delivered |
| push disabled, in-app enabled | in-app only |
| a preference requesting the `email` channel | never selected; no send attempted |
| push endpoint returns 410 | subscription deleted, no throw |
| UTC+6 learner, 20:00 reminder | fires at 20:00 local, once |
| the same dispatch retried | one row, one send |
