import { type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export const STATUS_TONES = Object.freeze([
  'neutral',
  'active',
  'due',
  'passed',
  'failed',
  'locked',
] as const);

export type StatusTone = (typeof STATUS_TONES)[number];

export interface IStatusBadgeProps {
  readonly tone: StatusTone;
  /** The word a learner reads. The tone tints it; it never replaces it. */
  readonly label: string;
  readonly className?: string;
}

const TONES: Readonly<Record<StatusTone, string>> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  active: 'bg-primary-100 text-primary-900',
  due: 'bg-secondary-100 text-secondary-700',
  passed: 'bg-mastered/10 text-mastered',
  failed: 'bg-tertiary-100 text-tertiary-700',
  locked: 'bg-neutral-100 text-cold',
};

/**
 * A state, written out.
 *
 * There is no icon-only variant and there will not be one: a badge whose only
 * content is a colour is unreadable in greyscale, unreadable to a screen
 * reader, and ambiguous to everyone else. The label is required.
 */
export function StatusBadge({ tone, label, className }: IStatusBadgeProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-chip px-1.5 text-[11px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
