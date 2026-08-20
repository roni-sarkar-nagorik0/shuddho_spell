import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { readExamAnswerReview, readExamResult } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { answerText } from './diff';
import { ExamReviewTable } from './review-table';

/**
 * Every answer, opened up.
 *
 * **Unreachable before submission**, and not because this page checks:
 * `GetExamAnswerReview` refuses an attempt that is not finished, and it is the
 * only thing in the product that returns `correctAnswer` at all. Rule 3 is
 * bounded by time rather than by route — the review may show the key, and
 * nothing may show it early. A page-level guard would be a second place for
 * that rule to live, and the weaker of the two.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IPromptShape {
  readonly prompt?: unknown;
}

export default async function ExamReviewPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const [review, result] = await Promise.all([
    readExamAnswerReview(user.userId, id).catch(() => null),
    readExamResult(user.userId, id).catch(() => null),
  ]);

  if (review === null || result === null) {
    notFound();
  }

  const rows = [...review.items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => {
      const payload = (item.payload ?? {}) as IPromptShape;

      return {
        questionId: item.questionId,
        sectionCode: item.sectionCode,
        orderIndex: item.orderIndex,
        prompt: typeof payload.prompt === 'string' ? payload.prompt : '(no prompt recorded)',
        submittedValue: item.submittedValue,
        correctAnswer: answerText(item.correctAnswer),
        isCorrect: item.isCorrect,
        awardedPoints: item.awardedPoints,
        flagged: item.flagged,
      };
    });

  const wrong = rows.filter((row) => row.isCorrect === false).length;

  return (
    <>
      <header className="col-span-12 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">
          {result.title} — review
        </h1>
        <span className="num text-muted">
          {wrong} of {rows.length} wrong
        </span>
        <Link className="ml-auto text-primary-900 underline" href={`/exams/result/${id}`}>
          Back to the result
        </Link>
      </header>

      <section className="col-span-12">
        <ExamReviewTable rows={rows} />
      </section>
    </>
  );
}
