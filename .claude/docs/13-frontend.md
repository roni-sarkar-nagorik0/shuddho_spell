# 13 — Frontend

Next.js 16 App Router, React 19, Tailwind, TanStack Query. Read `12-design-system.md` first.

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

Built after the doc was first written, and part of the app now:

| Route | Contents |
| --- | --- |
| `/words` | every word this learner has practised, paged. **The URL is the state** — page and source filter are query params read on the server, the controls are plain links, no client fetching. Back button, shareable link, reload lands where they were |
| `/library/families` | the 412 IELTS word families: one root, the words English builds from it, the rule that connects them. First page resolved on the server, every filter and page after it from `GET /api/v1/library/families` |
| `/grammar` | the whole 28-day grammar syllabus on one screen. Nothing gates — day 28 is reachable on the first visit, because a learner deciding whether the course is worth their time needs to see that it ends somewhere |
| `/grammar/[day]` | one grammar day. Server Components all the way down except the answers. A day index that is not a day renders Next's 404, not an empty page that looks like a bug |
| `/settings/notifications` | the two-channel preference table and the push permission banner |
| `/admin` | the user roster and role changes. **404 for a non-admin**, while the API answers 403 — see `04-authentication.md` |
| `/gallery` | every state of every shared component, on one page |
| `/verify/[code]` | certificate verification — no session, no account. Outside every authenticated route group on purpose. **Currently unreachable signed-out**, see below |

### Phase 12 — exams and marketing

| Route | Contents |
| --- | --- |
| `/exams` | catalogue with lock state and readiness |
| `/exams/[code]` | lobby: specification table, section table, rules, mic + audio system check, begin button gated on the checkbox **and** the system check |
| `/exams/attempt/[id]` | the runtime — see `08-exam-engine.md` |
| `/exams/result/[id]` | score against pass mark, by-section table, by-skill chart, phoneme matrix, added-to-weak-spots table; the failed variant carries its prescription block |
| `/exams/review/[id]` | master-detail answer review with diffs |
| `/certificate/[id]` | the certificate plus the day-1 vs day-28 comparison |
| `/` | marketing: dark hero with a **working inline dictation demo** drawing the real corpus through `GET /api/v1/demo/word`, the signature **Hear → Spell → Speak → Sentence** flow, the speaking alphabet strip and the letters that sound alike, the 8-row Bangla-speaker error table, the 28-day syllabus table with milestone rows, the session-timing band, pricing, FAQ, footer. A signed-in learner's demo answers are recorded through `POST /api/v1/demo/attempts` and surface on the dashboard and `/words` |
| `/login` | one Google button |
| `/onboarding` | goal, minutes per day, track, reminder time, then the diagnostic |

The landing page is a **statically rendered Server Component** scoring **≥95 Lighthouse
performance and 100 accessibility**. Prove it with a report, don't assert it.

**`/verify/[code]` is not in `proxy.ts`'s `PUBLIC_PAGES`, so a signed-out visitor is redirected
to `/login`.** The page itself calls no `requireUser`, sits outside every authenticated route
group, and reads only the public `certificate_verifications` view — the intent is unambiguous
and `04-authentication.md` states it. What is missing is the one entry in the public list.
This is recorded here rather than quietly fixed because it is a behaviour change, not a doc
change: today a certificate cannot be checked by the employer it exists for. The API route
`GET /api/v1/certificates/verify/:code` **is** public and works, because `/api` is outside the
matcher entirely.

`proxy.ts` also lists `/pricing` and `/faq` as public pages. Neither exists yet — both are
sections of `/` today. The entries are harmless (a public list cannot leak a page that is not
there) and are left in place for when the pages are split out.

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

### Small screens

Verified at **375px**, and these are the six things that were actually broken there:

- The signed-in shell lays out on twelve columns. `.shell-grid` in `globals.css` collapses the
  container *and* its direct children to one column below `md`, **in one place**, so no page
  restates its spans and nothing creates the implicit columns a bare `grid-cols-1` would.
- The sidebar is always the **56px icon rail** below `md`. 232px of a 375px screen is not a
  navigation column. The cookie still decides on desktop.
- The top bar truncates the breadcrumb, and the items that are context rather than controls —
  time on task, the streak, the words "Notifications" and "Exit" — give up their space first.
  Overlays are capped to the viewport, not to their desktop width.
- Wide tables **scroll inside their card** with a `min-w`, rather than sitting in an
  `overflow-hidden` container that paints their last columns outside it and loses them.
- The dictation tiles need a **visible Check button** once every tile holds a letter. A soft
  keyboard decides for itself what its action key does, and several Android keyboards send no
  `Enter` keydown at all for `maxLength={1}` inputs outside a form. `enterKeyHint="done"` and
  reading a newline arriving through `onChange` are both worth having; the button is the one
  that cannot fail.
- `globals.css` colours every `h1`/`h2`/`h3` `text-primary-900`, so a heading on a
  `primary-900` surface is invisible. Any heading on a dark surface states its own colour.

### Audio

- **Every audio play cancels the previous utterance.** Words overlapping is the single most
  common bug in speech-synthesis UIs. Cancel before speak, every time.
- Respect the learner's `playbackRate` and `accentPreference` from their profile.

## The component gallery — not Storybook

`/gallery` renders every state of every shared component on one page. `PhonemeStrip` and
`MasteryMatrix` in three states each, and the primitive layer (`DataTable`, `StatCell`,
`PanelHeader`, `HeatCell`, `MonoValue`, `StatusBadge`, `Sparkline`, `Toast`, `Popover`,
`Drawer`, `ConfirmDialog`) beside them.

**This is a deliberate substitution for Storybook**, recorded in `ARCHITECTURE.md`. Storybook
is a second build, a second bundler config and roughly fifty devDependencies to render
components this application can already render, and the states below are the same states a
story file would have declared. What it costs is Storybook's controls panel and its published
static site. What it buys is one build, one dependency tree, and states that fail the
typecheck when a prop changes instead of drifting in a parallel config.
