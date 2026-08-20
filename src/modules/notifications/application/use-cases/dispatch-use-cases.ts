import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { EXAM_OUTCOME_COPY } from '../../domain/data/notification-copy';
import {
  type IDispatchResult,
  type NotificationDispatcher,
} from '../services/notification-dispatcher';

/**
 * The six dispatches, each a thin decision about *what to say*.
 *
 * They share `NotificationDispatcher` for everything else — the policy, the
 * idempotency key, the two channels — so none of them can decide on its own
 * whether quiet hours apply, and none of them can reach a channel the policy
 * did not select. **In particular none of them can send an email**: there is no
 * mailer, no port for one, and `LIVE_CHANNELS` has two entries.
 *
 * `SendWeeklyReport` is the one `09-notifications.md` calls out by name — "it
 * writes an in-app notification and sends a push; it does **not** send a
 * weekly email" — and it goes through the identical path as the other five,
 * which is the strongest form that promise can take.
 */

export interface ISendDailyReminderInput {
  readonly profile: LearnerProfile;
  readonly dayIndex: number;
  readonly scheduledFor: Date;
}

export class SendDailyReminderUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendDailyReminderInput): Promise<IDispatchResult> {
    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'daily_reminder',
      severity: 'info',
      values: { day: String(input.dayIndex) },
      payload: { dayIndex: input.dayIndex },
      url: `/lesson/${String(input.dayIndex)}`,
      scheduledFor: input.scheduledFor,
    });
  }
}

export interface ISendStreakAtRiskInput {
  readonly profile: LearnerProfile;
  readonly streakDays: number;
  readonly scheduledFor: Date;
}

export class SendStreakAtRiskUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendStreakAtRiskInput): Promise<IDispatchResult> {
    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'streak_at_risk',
      // A warning, not critical: a streak is a motivator, and treating it as an
      // emergency is how a product teaches people to ignore its warnings.
      severity: 'warning',
      values: { days: String(input.streakDays) },
      payload: { streakDays: input.streakDays },
      url: '/dashboard',
      scheduledFor: input.scheduledFor,
    });
  }
}

export interface ISendReviewItemsDueInput {
  readonly profile: LearnerProfile;
  readonly dueCount: number;
  readonly scheduledFor: Date;
}

export class SendReviewItemsDueUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendReviewItemsDueInput): Promise<IDispatchResult> {
    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'review_items_due',
      severity: 'info',
      values: { count: String(input.dueCount) },
      payload: { dueCount: input.dueCount },
      url: '/practice',
      scheduledFor: input.scheduledFor,
    });
  }
}

export interface ISendExamUnlockedInput {
  readonly profile: LearnerProfile;
  readonly examCode: string;
  readonly examTitle: string;
  readonly dayIndex: number;
  readonly scheduledFor: Date;
}

export class SendExamUnlockedUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendExamUnlockedInput): Promise<IDispatchResult> {
    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'exam_unlocked',
      severity: 'success',
      values: { exam: input.examTitle, day: String(input.dayIndex) },
      payload: { examCode: input.examCode },
      url: `/exams/${input.examCode}`,
      scheduledFor: input.scheduledFor,
    });
  }
}

export interface ISendExamResultInput {
  readonly profile: LearnerProfile;
  readonly examCode: string;
  readonly examTitle: string;
  readonly scorePercent: number;
  readonly passed: boolean;
  readonly attemptId: string;
  readonly scheduledFor: Date;
}

export class SendExamResultUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendExamResultInput): Promise<IDispatchResult> {
    const outcome = input.passed ? EXAM_OUTCOME_COPY.passed : EXAM_OUTCOME_COPY.failed;

    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'exam_result',
      severity: input.passed ? 'success' : 'warning',
      values: {
        exam: input.examTitle,
        score: String(Math.round(input.scorePercent)),
        // Chosen here rather than in the copy table because it is a branch on
        // data, and the copy table holds strings rather than logic.
        outcome: input.profile.uiLanguage === 'bn' ? outcome.bn : outcome.en,
      },
      payload: { attemptId: input.attemptId, passed: input.passed },
      url: `/exams/attempts/${input.attemptId}/result`,
      scheduledFor: input.scheduledFor,
    });
  }
}

export interface ISendWeeklyReportInput {
  readonly profile: LearnerProfile;
  readonly accuracyPercent: number;
  readonly activeDays: number;
  readonly masteredCount: number;
  readonly scheduledFor: Date;
}

/**
 * In-app and push. **No email**, and there is nothing here that could send one.
 */
export class SendWeeklyReportUseCase {
  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async execute(input: ISendWeeklyReportInput): Promise<IDispatchResult> {
    return this.dispatcher.dispatch({
      profile: input.profile,
      type: 'weekly_report',
      severity: 'info',
      values: {
        accuracy: String(Math.round(input.accuracyPercent)),
        days: String(input.activeDays),
        mastered: String(input.masteredCount),
      },
      payload: {
        accuracyPercent: input.accuracyPercent,
        activeDays: input.activeDays,
        masteredCount: input.masteredCount,
      },
      url: '/progress',
      scheduledFor: input.scheduledFor,
    });
  }
}
