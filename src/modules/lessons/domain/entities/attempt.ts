import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';
import { type ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { type AttemptMode } from '../value-objects/attempt-mode';

export interface IAttemptProps {
  readonly id: string;
  readonly sessionId: string;
  /** Denormalised from the session so an RLS policy never has to join. */
  readonly profileId: string;
  readonly itemType: AttemptItemType;
  readonly itemId: string;
  readonly mode: AttemptMode;
  readonly submittedValue: string;
  readonly isCorrect: boolean;
  readonly score: ScorePercent;
  readonly errorTags: readonly ErrorTag[];
  readonly latencyMs: number | null;
  readonly createdAt: Date;
}

/**
 * One submitted answer, and what was wrong with it.
 *
 * **Immutable by design, not by accident.** 003 gives the client no update and
 * no delete on this table: an attempt is the evidence every score, every
 * mastery number and every exam result is derived from, and evidence that can
 * be edited after the fact is not evidence. There is no method here that
 * returns a changed copy, because there is no legitimate reason to change one.
 */
export class Attempt {
  readonly id: string;
  readonly sessionId: string;
  readonly profileId: string;
  readonly itemType: AttemptItemType;
  readonly itemId: string;
  readonly mode: AttemptMode;
  readonly submittedValue: string;
  readonly isCorrect: boolean;
  readonly score: ScorePercent;
  readonly errorTags: readonly ErrorTag[];
  readonly latencyMs: number | null;
  readonly createdAt: Date;

  constructor(props: IAttemptProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.profileId = props.profileId;
    this.itemType = props.itemType;
    this.itemId = props.itemId;
    this.mode = props.mode;
    this.submittedValue = props.submittedValue;
    this.isCorrect = props.isCorrect;
    this.score = props.score;
    this.errorTags = props.errorTags;
    this.latencyMs = props.latencyMs;
    this.createdAt = props.createdAt;
  }

  /**
   * Whether this attempt says anything about pronunciation. Only a spoken
   * answer is evidence about a phoneme — a learner who spells "very" correctly
   * has not demonstrated they can say it.
   */
  isPronunciation(): boolean {
    return this.mode === 'pronunciation';
  }

  hasTag(tag: ErrorTag): boolean {
    return this.errorTags.includes(tag);
  }
}
