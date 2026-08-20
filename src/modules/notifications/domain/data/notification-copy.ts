import { type NotificationType } from '../value-objects/notification-type';

/**
 * What each notification says, in both languages the product speaks.
 *
 * Data rather than strings built in six use cases, for the ordinary reason —
 * copy changes, and a change that has to be made in six files gets made in
 * four. And for one specific to this product: **the Bangla is real Bangla
 * script**, which `CLAUDE.md` requires and which nobody can review if it is
 * scattered through application code.
 *
 * Placeholders are `{name}` and are substituted by `fill` below. Deliberately
 * not a template library: there are a dozen substitutions in the whole file.
 */
export interface INotificationCopy {
  readonly title: string;
  readonly body: string;
}

export interface ILocalisedCopy {
  readonly en: INotificationCopy;
  readonly bn: INotificationCopy;
}

export const NOTIFICATION_COPY: Readonly<Record<NotificationType, ILocalisedCopy>> = Object.freeze({
  daily_reminder: {
    en: { title: 'Day {day} is ready', body: 'Fifteen minutes today keeps the streak alive.' },
    bn: {
      title: '{day} নম্বর দিনটি প্রস্তুত',
      body: 'আজ পনেরো মিনিট অনুশীলন করলেই ধারাবাহিকতা বজায় থাকবে।',
    },
  },
  streak_at_risk: {
    en: {
      title: 'Your {days}-day streak ends tonight',
      body: 'One lesson before midnight keeps it. It takes about fifteen minutes.',
    },
    bn: {
      title: 'আপনার {days} দিনের ধারাবাহিকতা আজ রাতে শেষ হয়ে যাবে',
      body: 'মধ্যরাতের আগে একটি পাঠ শেষ করলেই সেটি টিকে থাকবে — সময় লাগবে প্রায় পনেরো মিনিট।',
    },
  },
  review_items_due: {
    en: {
      title: '{count} words are due for review',
      body: 'These are the ones you have got wrong before. Ten minutes clears them.',
    },
    bn: {
      title: '{count}টি শব্দ পুনরাবৃত্তির জন্য অপেক্ষা করছে',
      body: 'এগুলো আগে ভুল হয়েছিল। দশ মিনিটেই শেষ করা যায়।',
    },
  },
  exam_unlocked: {
    en: {
      title: '{exam} is unlocked',
      body: 'You have reached day {day}. The exam is open when you are ready.',
    },
    bn: {
      title: '{exam} খুলে গেছে',
      body: 'আপনি {day} নম্বর দিনে পৌঁছেছেন। প্রস্তুত হলে পরীক্ষাটি দিতে পারেন।',
    },
  },
  exam_result: {
    en: { title: '{exam}: {score}%', body: '{outcome}' },
    bn: { title: '{exam}: {score}%', body: '{outcome}' },
  },
  weekly_report: {
    en: {
      title: 'Your week: {accuracy}% accuracy',
      body: 'You practised on {days} days and mastered {mastered} new items.',
    },
    bn: {
      title: 'আপনার সপ্তাহ: {accuracy}% সঠিক',
      body: 'আপনি {days} দিন অনুশীলন করেছেন এবং {mastered}টি নতুন বিষয় আয়ত্ত করেছেন।',
    },
  },
  milestone_reached: {
    en: { title: '{exam} passed', body: 'The next block of the programme is open.' },
    bn: { title: '{exam} উত্তীর্ণ', body: 'প্রোগ্রামের পরবর্তী অংশ খুলে গেছে।' },
  },
  product_update: {
    en: { title: '{title}', body: '{body}' },
    bn: { title: '{title}', body: '{body}' },
  },
});

/** Pass or fail, said in the learner's language rather than as a number twice. */
export const EXAM_OUTCOME_COPY = Object.freeze({
  passed: {
    en: 'You passed. The next block of the programme is open.',
    bn: 'আপনি উত্তীর্ণ হয়েছেন। প্রোগ্রামের পরবর্তী অংশ খুলে গেছে।',
  },
  failed: {
    en: 'Not this time. Your weakest items are waiting in the review queue.',
    bn: 'এবার হয়নি। আপনার দুর্বল বিষয়গুলো পুনরাবৃত্তির তালিকায় যোগ করা হয়েছে।',
  },
});

/**
 * The learner's own language, falling back to English.
 *
 * `learner_profiles.ui_language` is `bn` or `en` in 003, so the fallback is
 * defensive rather than expected — but a notification is the one place the app
 * speaks to somebody who is not looking at it, and an untranslated string is
 * better than an empty one.
 */
export function copyFor(type: NotificationType, language: string): INotificationCopy {
  const localised = NOTIFICATION_COPY[type];

  return language === 'bn' ? localised.bn : localised.en;
}

/** Substitutes `{name}` placeholders. Anything unmatched is left alone. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replaceAll(/\{(\w+)\}/gu, (whole: string, name: string) => values[name] ?? whole);
}
