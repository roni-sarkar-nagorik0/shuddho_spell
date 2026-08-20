# 02 — TypeScript rules

"Everything is an interface" is a hard rule here, not a style preference.

## Compiler flags

`packages/config` base tsconfig, extended by every package:

```
strict
noUncheckedIndexedAccess
exactOptionalPropertyTypes
noImplicitOverride
noFallthroughCasesInSwitch
verbatimModuleSyntax
isolatedModules
```

No `skipLibCheck` shortcut inside our own packages.

`noUncheckedIndexedAccess` in particular means `words[0]` is `Word | undefined`. Handle it.
Do not silence it with `!`.

## Interfaces, not types

Every object shape is declared with `interface`. Ports, entities, DTOs, React props, config,
API payloads — all interfaces.

`type` is permitted **only** where an interface cannot express the shape:

- union types
- mapped types
- conditional types
- template literal types
- tuple types

Nothing else. If you reach for `type` on an object, you are wrong. Lint enforces this.

## No enums

```ts
export const EXAM_STATUS = {
  Scheduled: 'scheduled',
  InProgress: 'in_progress',
  Submitted: 'submitted',
  Passed: 'passed',
  Failed: 'failed',
} as const;

export type ExamStatus = typeof EXAM_STATUS[keyof typeof EXAM_STATUS];
```

This pattern is used for every closed set: `ExamStatus`, `LessonStage`, `AttemptMode`,
`Track`, `ErrorTag`, `NotificationType`, `NotificationChannel`, `PartOfSpeech`, `PhonemeType`.

## Banned

| Banned | Use instead |
| --- | --- |
| `any` | `unknown` + a narrowing guard, or the correct interface |
| `!` non-null assertion | an explicit check, or a value object that cannot be empty |
| `as` | a Zod parse at the boundary (`as` is allowed *immediately after* one) |
| `enum` | frozen const object + derived union |
| `type X = { … }` | `interface X { … }` |
| inferred literal arrays | explicit `readonly T[]` |

## Readonly everywhere

All entity and DTO properties are `readonly`. State changes return a **new instance** or go
through an explicit method on the entity:

```ts
export class ReviewItem {
  private constructor(
    readonly id: string,
    readonly intervalIndex: number,
    readonly dueAt: Date,
    readonly consecutiveCorrect: number,
  ) {}

  recordResult(isCorrect: boolean, now: Date): ReviewItem { /* returns a new instance */ }
}
```

Arrays are `readonly T[]`. Records are `Readonly<Record<K, V>>`.

## Zod at the edges only

Validate at exactly four places:

1. HTTP request body
2. HTTP query and params
3. Environment variables at boot
4. External API responses

Inside the app, types are **trusted** because the edge validated them. No defensive
re-parsing in a use case.

## Interface is the source of truth

Declare the interface first, the schema second, and assert the schema conforms:

```ts
export interface ISubmitAnswerRequest {
  readonly questionId: string;
  readonly submittedValue: string;
  readonly flagged: boolean;
}

export const submitAnswerRequestSchema = z.object({
  questionId: z.string().uuid(),
  submittedValue: z.string().min(1).max(500),
  flagged: z.boolean(),
}) satisfies z.ZodType<ISubmitAnswerRequest>;
```

If the schema drifts from the interface, the build breaks. That is the point.

## Naming and files

- Port and contract interfaces are `I`-prefixed: `IWordRepository`, `IApiResponse`.
- Entity classes are **not** prefixed: `Word`, `ExamAttempt`.
- Files are kebab-case: `submit-dictation-attempt.use-case.ts`.
- One exported public symbol per file.

## Errors

```ts
export interface IResult<T, E> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: E;
}
```

Expected failure inside the domain → return a `IResult`. Unexpected or boundary failure →
throw a typed exception, caught by the single global filter.
