import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { type MasteryDimension } from '../value-objects/mastery-dimension';

export interface IMasteryRecordProps {
  readonly id: string;
  readonly profileId: string;
  readonly dimension: MasteryDimension;
  /** The phoneme id or rule family id this row scores. */
  readonly dimensionId: string;
  readonly attempts: number;
  readonly correct: number;
  readonly lastUpdatedAt: Date;
}

/** Below this, and with enough evidence, the matrix calls it a weakness. */
const WEAKNESS_THRESHOLD = 60;
/** One wrong answer out of one is not a weakness, it is one wrong answer. */
const MINIMUM_EVIDENCE = 3;

/**
 * How well one learner knows one sound, or one rule.
 *
 * `accuracy` is derived rather than stored as an independent field. 003 has an
 * `accuracy` column and it is written from here — the alternative is two
 * numbers that can disagree, and a matrix that shows 4/5 alongside 60% is a
 * matrix nobody trusts again.
 */
export class MasteryRecord {
  readonly id: string;
  readonly profileId: string;
  readonly dimension: MasteryDimension;
  readonly dimensionId: string;
  readonly attempts: number;
  readonly correct: number;
  readonly lastUpdatedAt: Date;

  constructor(props: IMasteryRecordProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.dimension = props.dimension;
    this.dimensionId = props.dimensionId;
    this.attempts = props.attempts;
    this.correct = props.correct;
    this.lastUpdatedAt = props.lastUpdatedAt;
  }

  /** Nothing attempted is not nothing known — it is nothing *measured*. */
  accuracy(): ScorePercent {
    if (this.attempts === 0) {
      return ScorePercent.of(0);
    }

    return ScorePercent.of((this.correct / this.attempts) * 100);
  }

  /**
   * Whether this is worth putting in front of the learner as something to work
   * on. Needs both a low score and enough evidence to mean it: calling a sound
   * a weakness after one missed attempt sends learners to drill things they can
   * already do.
   */
  isWeakness(): boolean {
    return this.attempts >= MINIMUM_EVIDENCE && this.accuracy().value < WEAKNESS_THRESHOLD;
  }

  record(isCorrect: boolean, now: Date): MasteryRecord {
    return new MasteryRecord({
      id: this.id,
      profileId: this.profileId,
      dimension: this.dimension,
      dimensionId: this.dimensionId,
      attempts: this.attempts + 1,
      correct: this.correct + (isCorrect ? 1 : 0),
      lastUpdatedAt: now,
    });
  }
}
