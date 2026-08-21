import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
  type ResponseConfig,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  advanceStageBodySchema,
  sessionParamsSchema,
  startSessionBodySchema,
  submitAttemptBodySchema,
} from '@/modules/lessons/presentation/dto/lesson-requests';
import {
  attemptParamsSchema,
  examCodeParamsSchema,
  saveAnswerBodySchema,
  sectionParamsSchema,
} from '@/modules/exams/presentation/dto/exam-requests';
import {
  notificationParamsSchema,
  subscribePushBodySchema,
  unsubscribePushBodySchema,
  updatePreferencesBodySchema,
} from '@/modules/notifications/presentation/dto/notification-requests';
import { programDayParamsSchema } from '@/modules/program/presentation/dto/program-params';
import { submitReviewBodySchema } from '@/modules/review/presentation/dto/review-requests';
import { meResponseSchema } from '@/modules/auth/presentation/dto/me.response';
import {
  setUserRoleBodySchema,
  userParamsSchema,
  userRosterSchema,
  userSummarySchema,
} from '@/modules/auth/presentation/dto/admin-users.response';
import { completeOnboardingBodySchema } from '@/modules/auth/presentation/dto/onboarding-requests';
import { verifyParamsSchema } from '@/modules/certificates/presentation/dto/certificate-requests';
import { libraryQuerySchema } from '@/modules/library/presentation/dto/library-requests';
import {
  demoSpeechBodySchema,
  demoSpeechScoreSchema,
} from '@/modules/library/presentation/dto/demo-speech.request';
import { demoWordSchema } from '@/modules/library/presentation/dto/demo-word.response';
import {
  demoAttemptResultSchema,
  recordDemoAttemptBodySchema,
} from '@/modules/progress/presentation/dto/demo-attempt-requests';

extendZodWithOpenApi(z);

/**
 * The OpenAPI document, **generated from the request schemas the handlers
 * actually use**.
 *
 * `11-api-surface.md`: "OpenAPI is generated from the same Zod schemas and
 * served at `/api/v1/openapi.json`. It is documentation, not a second source of
 * truth." Every schema below is imported from the module that validates with
 * it — none is redeclared here. A hand-maintained document drifts from the API
 * the moment someone is in a hurry, and a drifted spec is worse than none
 * because people believe it.
 *
 * The **route list** is the one thing that cannot be derived from a schema, so
 * it is stated once here and checked against the filesystem by a sweep: a route
 * added under `src/app/api/v1/` and not registered fails the suite.
 *
 * It lives in `presentation`, not in `src/lib`, because it imports the request
 * DTOs — and `lib` may not import `presentation`. That is the boundary working:
 * the generator belongs beside the schemas it describes.
 *
 * No `server-only`, deliberately. This is a pure function over Zod schemas —
 * no secret, no client, no database — and marking it server-only would be a
 * claim about danger that is not there. The handler that serves it is
 * server-only through `withApi`, which is where the guard belongs.
 */
const registry = new OpenAPIRegistry();

const problemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    instance: z.string(),
    code: z.string(),
    requestId: z.string(),
  })
  .openapi('ProblemDetails');

/** Every response is wrapped; the envelope is declared once. */
function envelope(data: z.ZodTypeAny): z.ZodTypeAny {
  return z.object({
    data,
    meta: z.object({ requestId: z.string(), timestamp: z.string() }).optional(),
  });
}

const PROBLEM: ResponseConfig = {
  description: 'RFC 7807 problem+json. Clients branch on `code`, never on `detail`.',
  content: { 'application/problem+json': { schema: problemSchema } },
};

function ok(data: z.ZodTypeAny, description: string): Record<string, ResponseConfig> {
  return {
    200: { description, content: { 'application/json': { schema: envelope(data) } } },
    401: PROBLEM,
    404: PROBLEM,
  };
}

registry.registerPath({
  method: 'get',
  path: '/api/v1/me',
  summary: 'The signed-in learner and their position in the programme.',
  responses: ok(meResponseSchema, 'The learner.'),
});

// The admin surface. Both answer 403 to a signed-in learner who is not one —
// documented rather than hidden, because a route that exists and is refused is
// a fact a client should be able to read from the contract.
registry.registerPath({
  method: 'get',
  path: '/api/v1/admin/users',
  summary: 'Everybody who has signed in. Admins only.',
  responses: { ...ok(userRosterSchema, 'The roster.'), 403: PROBLEM },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/admin/users/{id}/role',
  summary: 'Make a user an admin, or take it back. Admins only; the last admin cannot be demoted.',
  request: {
    params: userParamsSchema,
    body: { content: { 'application/json': { schema: setUserRoleBodySchema } } },
  },
  responses: { ...ok(userSummarySchema, 'The user, as they now stand.'), 403: PROBLEM, 409: PROBLEM },
});

// The one endpoint in v1 with no session behind it and a payload that carries
// an answer. Both are deliberate — see the handler.
registry.registerPath({
  method: 'get',
  path: '/api/v1/demo/word',
  summary: 'One random word from the corpus for the landing page demo. Public; no account needed.',
  responses: ok(demoWordSchema, 'A word, or null when the corpus is not seeded.'),
});

// The spoken half, and public like the read half rather than like the write
// half — it marks an attempt and stores nothing. A **transcript**, never audio:
// the browser transcribes, and 07-speech-scoring.md requires the server to hold
// no recording of anybody's voice.
registry.registerPath({
  method: 'post',
  path: '/api/v1/demo/speech',
  summary:
    'Score one spoken attempt for the landing page demo. Public; a transcript, never audio.',
  request: { body: { content: { 'application/json': { schema: demoSpeechBodySchema } } } },
  responses: ok(demoSpeechScoreSchema, 'The score, with what to fix.'),
});

// The write half of the demo, and unlike the read half it needs a session:
// there is no profile to record an anonymous visitor against. The body says
// what was typed and never whether it was right.
registry.registerPath({
  method: 'post',
  path: '/api/v1/demo/attempts',
  summary: 'Record one demo answer for the signed-in learner. The server decides if it was right.',
  request: { body: { content: { 'application/json': { schema: recordDemoAttemptBodySchema } } } },
  responses: ok(demoAttemptResultSchema, 'The stored attempt.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/program',
  summary: 'The programme overview — every day, which are done, which are unlocked.',
  responses: ok(z.unknown(), 'The overview.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/program/days/{dayIndex}',
  summary: 'One day, with its words, sentences and rules resolved.',
  request: { params: programDayParamsSchema },
  responses: { ...ok(z.unknown(), 'The day.'), 403: PROBLEM },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/lessons/sessions',
  summary: 'Open a day, or resume the session already open for it.',
  request: { body: { content: { 'application/json': { schema: startSessionBodySchema } } } },
  responses: ok(z.unknown(), 'The session, new or resumed.'),
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/lessons/sessions/{id}/stage',
  summary: 'Advance the session by exactly one stage.',
  request: {
    params: sessionParamsSchema,
    body: { content: { 'application/json': { schema: advanceStageBodySchema } } },
  },
  responses: { ...ok(z.unknown(), 'The new stage.'), 409: PROBLEM },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/lessons/sessions/{id}/attempts',
  summary: 'Submit one answer — dictation or construction.',
  request: {
    params: sessionParamsSchema,
    body: { content: { 'application/json': { schema: submitAttemptBodySchema } } },
  },
  responses: ok(z.unknown(), 'The marked answer.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/lessons/sessions/{id}/complete',
  summary: 'Close the day — session, position and streak, in one transaction.',
  request: { params: sessionParamsSchema },
  responses: { ...ok(z.unknown(), 'The closed session and the new position.'), 409: PROBLEM },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/onboarding',
  summary: 'What onboarding has stored so far, so an abandoned run resumes.',
  responses: ok(z.unknown(), 'The stored choices, and whether they are final.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/onboarding',
  summary: 'Record the learner’s track, daily minutes and accent. Written once.',
  request: { body: { content: { 'application/json': { schema: completeOnboardingBodySchema } } } },
  responses: ok(z.unknown(), 'The stored choices. A second call changes nothing.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/library',
  summary: 'A keyset page of the word library, annotated with the learner’s own accuracy.',
  request: { query: libraryQuerySchema },
  responses: ok(z.unknown(), 'The page, and the cursor for the next one.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/certificates/verify/{code}',
  summary:
    'Verify a certificate. Public — no session. Returns only the fields 008’s public view exposes, and reports a revoked certificate as revoked rather than as missing.',
  request: { params: verifyParamsSchema },
  responses: ok(z.unknown(), 'The public face of the certificate.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/review/due',
  summary: 'Today’s review queue, capped at 25 and ordered by how overdue.',
  responses: ok(z.unknown(), 'The queue.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/review/attempts',
  summary: 'Answer one review item.',
  request: { body: { content: { 'application/json': { schema: submitReviewBodySchema } } } },
  responses: ok(z.unknown(), 'The result and when it next falls due.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/progress/summary',
  summary: 'Position, streak, accuracy and mastered items.',
  responses: ok(z.unknown(), 'The summary.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/progress/mastery',
  summary: 'The mastery matrix — per phoneme and per rule family.',
  responses: ok(z.unknown(), 'The matrix.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/exams/{code}/attempts',
  summary: 'Start an exam, or resume the one already running.',
  description:
    'Returns the live attempt when one exists rather than creating a second — the deadline on it is never extended. No response from this route carries a correct answer.',
  request: { params: examCodeParamsSchema },
  responses: ok(z.unknown(), 'The attempt, its paper and the seconds left on the server clock.'),
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/exams/attempts/{id}/answers',
  summary: 'Save an answer, or flag a question to come back to.',
  description:
    'Refused with 409 EXAM_TIME_EXPIRED once the server deadline has passed. The response carries the remaining seconds from the server clock, so the runtime resynchronises on every save.',
  request: {
    params: attemptParamsSchema,
    body: { content: { 'application/json': { schema: saveAnswerBodySchema } } },
  },
  responses: ok(z.unknown(), 'The saved answer and the time left.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/exams/attempts/{id}/sections/{code}/submit',
  summary: 'Lock a section. One way, forwards, one at a time.',
  description:
    'There is no endpoint that reopens a submitted section. Submitting a section that is not the open one is 409 — behind is a replay, ahead would lock the section between unsat.',
  request: { params: sectionParamsSchema },
  responses: ok(z.unknown(), 'The next section, and whether the paper is complete.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/exams/attempts/active',
  summary: 'The attempt in progress, if there is one.',
  description:
    'Rule 6 — a crash loses nothing. Returns the attempt, the current section, the saved answers and the seconds remaining computed from the server clock. Null when nothing is running.',
  responses: ok(z.unknown(), 'The live attempt, or null.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/exams/attempts/{id}/submit',
  summary: 'Hand the paper in. Marks it, scores it, and acts on the result.',
  description:
    'A pass advances the learner and a fail writes a prescription of drills into the review queue — never just a number. Idempotent: a second submit on a handed-in attempt changes nothing. Carries no correct answers.',
  request: { params: attemptParamsSchema },
  responses: ok(z.unknown(), 'The score, the outcome and what happens next.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/exams/attempts/{id}/result',
  summary: 'The mark, after the paper is in.',
  description:
    '409 before submission. Carries the score and the section breakdown, and no correct answers — the result screen never needs one.',
  request: { params: attemptParamsSchema },
  responses: ok(z.unknown(), 'The score, the outcome and the section breakdown.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/exams/attempts/{id}/review',
  summary: 'The paper opened up, question by question.',
  description:
    'The only route in the API that returns correct answers, and only once the attempt is submitted — 409 before that. Rule 3 bounds the answer key by time, not by route.',
  request: { params: attemptParamsSchema },
  responses: ok(z.unknown(), 'Every question, the learner’s answer, and the right one.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/exams/{code}/readiness',
  summary: 'A predicted score and the three topics most likely to cost marks.',
  description:
    'What makes the lobby honest instead of decorative. The topics are ranked by expected loss, not by accuracy — a weak rule inside a heavier section costs more of the final mark than a weaker phoneme inside a lighter one.',
  request: { params: examCodeParamsSchema },
  responses: ok(z.unknown(), 'The prediction, per section, and the three costliest topics.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/notifications',
  summary: 'The bell feed and the unread count.',
  responses: ok(z.unknown(), 'A page of notifications, newest first, and the badge number.'),
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/notifications/{id}/read',
  summary: 'Mark one notification read.',
  description:
    'Reading twice is not an error and does not move the timestamp. A notification that is not yours is 404, the same answer as one that does not exist.',
  request: { params: notificationParamsSchema },
  responses: ok(z.unknown(), 'The new unread count.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/notifications/read-all',
  summary: 'Clear the badge.',
  responses: ok(z.unknown(), 'The new unread count, which is zero.'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/notifications/preferences',
  summary: 'The complete preferences matrix.',
  description:
    'Every type on both live channels, with stored rows over the defaults. There is no email channel in the response and no way to ask for one.',
  responses: ok(z.unknown(), 'Eight types across In-app and Push.'),
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/notifications/preferences',
  summary: 'Save preference changes.',
  description:
    'The channel enum is the two live channels: a body asking to configure `email` is a 422 naming the field rather than an accepted request that does nothing.',
  request: { body: { content: { 'application/json': { schema: updatePreferencesBodySchema } } } },
  responses: ok(z.unknown(), 'The complete matrix after saving.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/notifications/push/subscribe',
  summary: 'Register this browser for push.',
  description:
    'The endpoint is unique across the table because it identifies a browser install, not a learner: a shared device moves the row rather than duplicating it.',
  request: { body: { content: { 'application/json': { schema: subscribePushBodySchema } } } },
  responses: ok(z.unknown(), 'The registered endpoint.'),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/notifications/push/unsubscribe',
  summary: 'Turn push off for this browser.',
  request: { body: { content: { 'application/json': { schema: unsubscribePushBodySchema } } } },
  responses: ok(z.unknown(), 'Whether a subscription of yours was removed.'),
});

// `/api/cron/*` is deliberately **not** registered. This document describes the
// v1 API — the surface a client consumes — and a cron route has no client: it
// is called by a scheduler holding a shared secret, and `11-api-surface.md`
// keeps the scheduled endpoints in their own table for that reason. The sweep
// below reads `src/app/api/v1/` for the same reason, so documenting one here
// would fail it, which is the check noticing correctly rather than being wrong.

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'ShuddhoSpell API',
      version: '1.0.0',
      description:
        'The v1 API. Every response is `{ data, meta }`; every error is RFC 7807 problem+json with a stable `code`. Routes are protected by default — the two liveness probes are the only public ones.',
    },
  });
}
