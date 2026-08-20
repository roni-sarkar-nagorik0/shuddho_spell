# 13 — Frontend

Next.js 15 App Router, React 19, Tailwind, TanStack Query. Read `12-design-system.md` first.

This is the whole application — UI and API in one project. `13-frontend.md` covers the UI;
`11-api-surface.md` covers the handlers; `01-architecture.md` covers how they share use cases.

## Server vs Client Components

- **Server Components** for data-heavy read screens: dashboard panels, program table,
  library table, progress analytics, the marketing landing page.
- **Client Components only where interaction demands it**: dictation tiles, the microphone,
  the exam timer, drag-to-order chips, the notification bell.

If a component does not use state, an effect, or an event handler, it stays on the server.

## Data layer

- TanStack Query for client state.
- A Zod-validated fetch wrapper built on `src/contracts`. Every response is validated; a
  mismatch throws a typed `ApiError`.
- **Server Components do not fetch their own API over HTTP.** They call the same use case
  directly through the composition root. The route handler exists for the client. Both paths
  run one implementation — never two.
- **Optimistic updates** for exam answer saving — the learner must never wait on the network
  to move to the next question.
- **Exam writes are never retried.** Configure the retry policy to exclude them explicitly.
  A retried write after a deadline produces a support ticket, not a saved answer.

## Screens

### Phase 11 — learning

| Route | Contents |
| --- | --- |
| `/dashboard` | four stat panels, today's session, next-exam countdown with readiness, due-review table, phoneme matrix, weekly minutes chart |
| `/program` | 28-day table grouped by week with milestone rows, expandable day rows, stats rail |
| `/lesson/[day]` | focus mode, five-stage tracker, the four stage screens: Learn, Dictate, Speak, Build |
| `/practice` | standalone drills by weakness |
| `/weak-spots` | master-detail with the spaced-repetition schedule axis |
| `/library` | dense word table: filters, column control, CSV export, detail drawer |
| `/progress` | accuracy over time with milestone markers, time on task, both mastery matrices, activity heatmap |

### Phase 12 — exams and marketing

| Route | Contents |
| --- | --- |
| `/exams` | catalogue with lock state and readiness |
| `/exams/[code]` | lobby: specification table, section table, rules, mic + audio system check, begin button gated on the checkbox **and** the system check |
| `/exams/attempt/[id]` | the runtime — see `08-exam-engine.md` |
| `/exams/result/[id]` | score against pass mark, by-section table, by-skill chart, phoneme matrix, added-to-weak-spots table; the failed variant carries its prescription block |
| `/exams/review/[id]` | master-detail answer review with diffs |
| `/certificate/[id]` | the certificate plus the day-1 vs day-28 comparison |
| `/` | marketing: dark hero with a **working inline dictation demo**, the 8-row Bangla-speaker error table, the 28-day syllabus table with milestone rows, the session-timing band, pricing, FAQ, footer |
| `/login` | one Google button |
| `/onboarding` | goal, minutes per day, track, reminder time, then the diagnostic |

The landing page is a **statically rendered Server Component** scoring **≥95 Lighthouse
performance and 100 accessibility**. Prove it with a report, don't assert it.

## The interactions that are easy to get wrong

These are the ones that get shipped broken. Get them right the first time.

### Dictation letter tiles

- real keyboard input, not a hidden input hack that breaks on mobile
- auto-advance on keypress
- backspace moves back **and clears** — both, in one press
- arrow keys navigate between tiles
- **paste is blocked** (it defeats the entire exercise)
- Enter submits
- the whole thing is operable with **no mouse**

### The microphone flow

- **Feature-detect `SpeechRecognition`.** On an unsupported browser (Firefox, some mobile
  browsers) render the **self-assessment fallback**, never a dead button.
- Show recording state unambiguously. A learner who does not know whether it is listening
  will not speak.
- Handle permission-denied as a first-class state with a recovery instruction.

### Sentence chips

- drag to reorder with **pointer events** (not HTML5 drag-and-drop — it does not work on touch)
- **full keyboard operation as a first-class path**, not an afterthought: focus a chip,
  move it with arrow keys, confirm with Enter

### Audio

- **Every audio play cancels the previous utterance.** Words overlapping is the single most
  common bug in speech-synthesis UIs. Cancel before speak, every time.
- Respect the learner's `playbackRate` and `accentPreference` from their profile.

## Storybook

`PhonemeStrip` and `MasteryMatrix` ship documented with screenshots in three states each.
The primitive layer (`DataTable`, `StatCell`, `PanelHeader`, `HeatCell`, `MonoValue`,
`StatusBadge`, `Sparkline`, `Toast`, `Popover`, `Drawer`, `ConfirmDialog`) is documented too.
