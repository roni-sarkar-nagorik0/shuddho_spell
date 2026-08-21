/**
 * One word tried on the public demo by a signed-in learner — 021.
 *
 * Deliberately thin. It has no behaviour because there is no rule about it: an
 * attempt on the demo is a fact that happened, not a thing that can be right or
 * wrong about itself. `is_correct` is decided before this exists, by
 * `Word.matches`, which is where that rule already lives.
 *
 * It is **not** `Attempt`. That one belongs to a lesson session, carries a
 * score, error tags and a latency, and feeds the review scheduler and the
 * mastery rollup. This feeds a count on the dashboard. Reusing the entity would
 * have meant inventing a score and a session for something that has neither.
 */
export interface IDemoAttemptProps {
  readonly id: string;
  readonly profileId: string;
  readonly wordId: string;
  readonly submittedValue: string;
  readonly isCorrect: boolean;
  readonly createdAt: Date;
}

export class DemoAttempt {
  readonly id: string;
  readonly profileId: string;
  readonly wordId: string;
  readonly submittedValue: string;
  readonly isCorrect: boolean;
  readonly createdAt: Date;

  constructor(props: IDemoAttemptProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.wordId = props.wordId;
    this.submittedValue = props.submittedValue;
    this.isCorrect = props.isCorrect;
    this.createdAt = props.createdAt;
  }
}
