import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { isJsonObject, type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type ExamAnswer } from '../entities/exam-answer';
import { type ExamQuestion } from '../entities/exam-question';

const PERCENT = 100;

/**
 * A pronunciation attempt, judged.
 *
 * A domain-side port so marking stays pure: the exams module states what it
 * needs — a number out of 100 for a transcript against a target — and the
 * composition root wires the Phase 6 scorer behind it. Nothing here imports
 * `ISpeechScorer`, so an acoustic model arriving later changes one wiring line.
 */
export interface IPronunciationJudge {
  /**
   * Asynchronous, and that is the one concession to the world outside the
   * domain. Scoring speech needs the 44-phoneme inventory to cut the stored IPA
   * into sounds, and the inventory is a table. The alternative — carrying a
   * segmented form on every question's answer key — would put a Phase 6
   * implementation detail into Phase 7's stored data, where a change to the
   * inventory could not reach it.
   */
  readonly scorePercent: (target: IPronunciationTarget, transcript: string) => Promise<number>;
}

export interface IPronunciationTarget {
  readonly text: string;
  readonly ipa: string;
}

export interface IMark {
  readonly isCorrect: boolean;
  /** 0..question.weight. Partial only where the product scores partially. */
  readonly awardedPoints: number;
}

/**
 * A pronunciation attempt has to clear this to count as *correct*, even though
 * it earns points below it. It is the near-miss ceiling from
 * `07-speech-scoring.md`: above it there is no named error left.
 */
const PRONUNCIATION_PASS = 90;

/**
 * Marks one answer against its question.
 *
 * Separate from `ExamScoringService` on purpose. Marking asks "was this right",
 * which is a different question per question type and needs the speech scorer
 * for one of them; weighting asks "what is the paper worth", which is
 * arithmetic over marks. Together they would make the weighting untestable
 * without a scorer in scope, and `08-exam-engine.md` asks for the scoring
 * service to have zero I/O.
 *
 * **Pronunciation earns partial points and the other types do not**, and that
 * asymmetry is the product's, not an oversight. A spelling is right or it is
 * not. A pronunciation is a distance from the target, which is the whole
 * premise of Phase 6 — marking `wery` zero in a lesson and zero in an exam
 * would be the same mistake made twice.
 */
export class ExamAnswerMarker {
  constructor(private readonly judge: IPronunciationJudge | null = null) {}

  async mark(question: ExamQuestion, answer: ExamAnswer | null): Promise<IMark> {
    const submitted = answer?.submittedValue ?? null;

    // A blank is worth nothing and is not an error. A learner who ran out of
    // time has an unanswered question, not a missing row.
    if (submitted === null || submitted.trim().length === 0) {
      return { isCorrect: false, awardedPoints: 0 };
    }

    if (question.type === 'pronunciation') {
      return await this.markPronunciation(question, submitted);
    }

    const accepted = acceptedAnswers(question.correctAnswer);

    if (accepted.length === 0) {
      // Content with no answer key cannot mark anybody down. Failing the
      // learner for a broken question is the one outcome that is certainly
      // wrong; the section's total simply carries the weight.
      return { isCorrect: false, awardedPoints: 0 };
    }

    const isCorrect = accepted.some(
      (candidate) => normaliseAnswer(candidate) === normaliseAnswer(submitted),
    );

    return { isCorrect, awardedPoints: isCorrect ? question.weight : 0 };
  }

  private async markPronunciation(question: ExamQuestion, transcript: string): Promise<IMark> {
    const target = pronunciationTarget(question.correctAnswer);

    if (this.judge === null || target === null) {
      return { isCorrect: false, awardedPoints: 0 };
    }

    const percent = await this.judge.scorePercent(target, transcript);

    return {
      isCorrect: percent > PRONUNCIATION_PASS,
      awardedPoints: (question.weight * percent) / PERCENT,
    };
  }
}

/**
 * Every spelling the key accepts — the target plus its alternatives.
 *
 * Read defensively because `correct_answer` is jsonb and its shape belongs to
 * the blueprint. A key that is not the shape this expects yields no accepted
 * answers, which is handled above rather than throwing: one malformed question
 * must not take a whole exam submission down with it.
 */
function acceptedAnswers(key: JsonValue): readonly string[] {
  if (!isJsonObject(key)) {
    return typeof key === 'string' ? [key] : [];
  }

  const text = key['text'];
  const alternatives = key['alternatives'];

  return [
    ...(typeof text === 'string' ? [text] : []),
    ...(Array.isArray(alternatives)
      ? alternatives.flatMap((entry) => (typeof entry === 'string' ? [entry] : []))
      : []),
  ];
}

function pronunciationTarget(key: JsonValue): IPronunciationTarget | null {
  if (!isJsonObject(key)) {
    return null;
  }

  const text = key['text'];
  const ipa = key['ipa'];

  return typeof text === 'string' && typeof ipa === 'string' ? { text, ipa } : null;
}
