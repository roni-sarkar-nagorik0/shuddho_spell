import { type SentenceItem } from '@/modules/library/domain/entities/sentence-item';
import { type Word } from '@/modules/library/domain/entities/word';
import { type ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IExamItemCandidate } from './exam-blueprint.service';

/**
 * How weak a learner is on something they have **never been tested on**.
 *
 * Not 0 and not 1. Zero would mean the exam never asks about anything new,
 * which turns a milestone into a re-run of the learner's mistakes; one would
 * fill the paper with material they have not met. A half says "unknown", which
 * is the truth, and lets a genuinely weak item outrank it.
 */
const UNKNOWN_WEAKNESS = 0.5;

/**
 * Turns course content plus the learner's own history into things to ask.
 *
 * Pure, and the reason matters: what makes a good exam question is a product
 * judgement — a word the learner keeps getting wrong beats a word they have
 * never seen, which beats a word they have mastered — and a judgement made
 * inside a SQL `order by` is one nobody can read or test.
 *
 * The four question shapes come from the two kinds of content the course
 * actually has. A word can be asked two ways: spell it from its meaning and its
 * IPA, or say it. A sentence can be asked two ways: build it from a word bank,
 * or write a response to it. Nothing here invents content that does not exist.
 */
export class ExamCandidateBuilder {
  build(
    words: readonly Word[],
    sentences: readonly SentenceItem[],
    history: readonly ReviewItem[],
  ): readonly IExamItemCandidate[] {
    const weakness = new Map<string, number>();

    for (const item of history) {
      // Accuracy is how often they get it right, so weakness is the rest of it.
      // A mastered item is pushed to the floor rather than merely low: it has
      // been proven three separate days apart, and re-testing it costs a slot
      // that something unproven needs.
      weakness.set(item.itemId, item.isMastered ? 0 : 1 - item.accuracy());
    }

    const wordCandidates = words.flatMap((word): readonly IExamItemCandidate[] => {
      const weak = weakness.get(word.id) ?? UNKNOWN_WEAKNESS;

      return [
        {
          itemId: word.id,
          type: 'dictation',
          // The spelling is **not** in the payload. A dictation question that
          // showed the word would be answering itself, so the learner is given
          // the meaning and the sounds and asked for the letters — which is
          // exactly what the product teaches.
          payload: {
            wordId: word.id,
            banglaMeaning: word.banglaMeaning,
            ipa: word.ipa.value,
            syllableCount: word.syllables.length,
          },
          correctAnswer: { text: word.text },
          weakness: weak,
        },
        {
          itemId: word.id,
          type: 'pronunciation',
          // Here the spelling **is** the prompt: the learner is asked to say
          // the word in front of them, so showing it gives nothing away.
          payload: { wordId: word.id, text: word.text, ipa: word.ipa.value },
          correctAnswer: { text: word.text, ipa: word.ipa.value },
          weakness: weak,
        },
      ];
    });

    const sentenceCandidates = sentences.flatMap((sentence): readonly IExamItemCandidate[] => {
      const weak = weakness.get(sentence.id) ?? UNKNOWN_WEAKNESS;

      return [
        {
          itemId: sentence.id,
          type: 'construction',
          payload: {
            sentenceItemId: sentence.id,
            banglaText: sentence.banglaText,
            distractorWords: [...sentence.distractorWords],
          },
          correctAnswer: {
            text: sentence.englishText,
            alternatives: [...sentence.acceptedAlternatives],
          },
          weakness: weak,
        },
        {
          itemId: sentence.id,
          type: 'reading_response',
          payload: { sentenceItemId: sentence.id, banglaText: sentence.banglaText },
          correctAnswer: {
            text: sentence.englishText,
            alternatives: [...sentence.acceptedAlternatives],
          },
          weakness: weak,
        },
      ];
    });

    return [...wordCandidates, ...sentenceCandidates];
  }
}
