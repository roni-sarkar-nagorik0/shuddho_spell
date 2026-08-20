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
} from '@/modules/exams/presentation/dto/exam-requests';
import { programDayParamsSchema } from '@/modules/program/presentation/dto/program-params';
import { submitReviewBodySchema } from '@/modules/review/presentation/dto/review-requests';
import { meResponseSchema } from '@/modules/auth/presentation/dto/me.response';

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
