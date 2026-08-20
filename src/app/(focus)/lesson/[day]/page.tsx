import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { readPhonemeStrips, readProgramDay } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { LessonRuntime } from './lesson-runtime';

/**
 * One day of the programme, in focus mode.
 *
 * The day's content is read on the server through the composition root — the
 * same `GetProgramDay` use case the endpoint runs, which is also the use case
 * that refuses a locked day. The runtime below is a Client Component because
 * the stages are interaction; the content it needs crosses as plain data.
 *
 * A day that does not resolve is a 404, not an error page: an unlocked day and
 * a nonexistent day look the same from the outside, and telling the difference
 * would confirm what exists on days the learner has not reached.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  readonly params: Promise<{ readonly day: string }>;
}): Promise<ReactElement> {
  const { day } = await params;
  const dayIndex = Number.parseInt(day, 10);

  if (!Number.isInteger(dayIndex) || dayIndex < 1) {
    notFound();
  }

  const user = await requireUser();
  const detail = await readProgramDay(user.userId, dayIndex).catch(() => null);

  if (detail === null) {
    notFound();
  }

  // One batched read for the whole day's strips — four queries, not four per
  // word. The order of `wordIds` is the order the content team taught them and
  // the use case preserves it.
  const strips = await readPhonemeStrips(
    user.userId,
    detail.words.map((word) => word.id),
  );

  const stripsByWordId = new Map(strips.map((strip) => [strip.wordId, strip] as const));

  const words = detail.words.flatMap((word) => {
    const strip = stripsByWordId.get(word.id);

    return strip === undefined
      ? []
      : [
          {
            wordId: word.id,
            text: word.text,
            ipa: word.ipa,
            syllables: word.syllables,
            banglaSound: word.banglaSound,
            banglaMeaning: word.banglaMeaning,
            partOfSpeech: word.partOfSpeech,
            cells: strip.cells.map((cell) => ({
              symbol: cell.symbol,
              isStressed: cell.isStressed,
              // Syllable alignment between the spelling split and the phoneme
              // sequence is not stored, so every cell sits in one group and the
              // dividers appear on the spelling line where they are known.
              // Guessing the boundary would put a divider in the wrong place,
              // which teaches a wrong syllable break.
              syllable: 0,
              accuracy: cell.accuracy,
              attempts: cell.attempts,
            })),
          },
        ];
  });

  return (
    <LessonRuntime
      dayIndex={detail.dayIndex}
      description={detail.description}
      rules={detail.rules}
      sentences={detail.sentences.map((sentence) => ({
        id: sentence.id,
        banglaText: sentence.banglaText,
        englishText: sentence.englishText,
        distractorWords: sentence.distractorWords,
      }))}
      title={detail.title}
      words={words}
    />
  );
}
