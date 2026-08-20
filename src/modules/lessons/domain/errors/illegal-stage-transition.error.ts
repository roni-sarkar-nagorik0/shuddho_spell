import { type LessonStage } from '../value-objects/lesson-stage';

/**
 * A lesson was asked to move somewhere it cannot go.
 *
 * `05-domain-model.md` is explicit that stage order is a domain rule, not a UI
 * concern — the client hides the buttons, and the client is not trusted. A
 * learner who replays a stale request, or a component that renders the wrong
 * link, lands here rather than corrupting the session.
 */
export class IllegalStageTransitionError extends Error {
  constructor(
    readonly from: LessonStage,
    readonly to: LessonStage,
  ) {
    super(`a lesson cannot move from ${from} to ${to}`);
    this.name = 'IllegalStageTransitionError';
  }
}
