import { type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IPanelHeaderProps {
  readonly title: string;
  /** A count, a date range, a one-line explanation. Never a sentence of marketing. */
  readonly note?: string;
  /** A link or a small control, right-aligned. */
  readonly action?: ReactNode;
  readonly className?: string;
}

/**
 * The top of every card. A hairline underneath, never a shadow — separation in
 * this product is a 1px rule, and shadows exist only on overlays.
 */
export function PanelHeader({ title, note, action, className }: IPanelHeaderProps): ReactElement {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-3 border-b border-hairline px-3',
        className,
      )}
    >
      <h2 className="font-display text-sm tracking-tight text-primary-900">{title}</h2>
      {note !== undefined && <span className="num text-[11px] text-muted">{note}</span>}
      {action !== undefined && <span className="ml-auto">{action}</span>}
    </div>
  );
}
