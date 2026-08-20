'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import {
  notificationFeedSchema,
  unreadCountSchema,
  type NotificationFeed,
} from './notification-contracts';

/**
 * The bell and its popover.
 *
 * Plain `useState` and `apiFetch` rather than TanStack Query: **F10.7 wires the
 * query client**, and reaching for it here would mean either building it early
 * or building this twice. What is here is the real read and the real writes, so
 * swapping the data layer later touches this file and nothing behind it.
 *
 * The badge is the server's `unreadCount`, never `notifications.length`. The
 * feed is a page of thirty; a learner with sixty unread would otherwise see a
 * badge saying 30, which is wrong in the reassuring direction.
 */
export function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed>({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const popover = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(() => {
    void apiFetch('/api/v1/notifications', { schema: notificationFeedSchema })
      .then(setFeed)
      // A feed that fails to load leaves the previous one on screen. Blanking
      // it would tell the learner their notifications had been deleted.
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  // Escape closes and returns focus to the button that opened it. Trapping
  // focus inside is Phase 10's `Popover`; this is the minimum that keeps the
  // control usable without a mouse in the meantime.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener('keydown', onKey);

    return () => { document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markRead = (id: string): void => {
    void apiFetch(`/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
      schema: unreadCountSchema,
    })
      .then(({ unreadCount }) => {
        setFeed((current) => ({
          unreadCount,
          notifications: current.notifications.map((entry) =>
            entry.id === id ? { ...entry, readAt: new Date().toISOString() } : entry,
          ),
        }));
      })
      .catch(() => undefined);
  };

  const markAllRead = (): void => {
    void apiFetch('/api/v1/notifications/read-all', {
      method: 'POST',
      schema: unreadCountSchema,
    })
      .then(({ unreadCount }) => {
        setFeed((current) => ({
          unreadCount,
          notifications: current.notifications.map((entry) => ({
            ...entry,
            readAt: entry.readAt ?? new Date().toISOString(),
          })),
        }));
      })
      .catch(() => undefined);
  };

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        // The count is in the accessible name, not only in a superscript: a
        // screen reader user needs the number, not the fact that a badge exists.
        aria-label={
          feed.unreadCount === 0
            ? 'Notifications'
            : `Notifications, ${String(feed.unreadCount)} unread`
        }
        className="relative border border-neutral-300 px-3 py-1 text-sm"
        onClick={() => {
          setOpen((current) => !current);
          load();
        }}
      >
        Notifications
        {feed.unreadCount > 0 && (
          <span className="ml-2 tabular-nums" aria-hidden="true">
            {feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popover}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-10 mt-2 w-96 border border-neutral-300 bg-white text-sm"
        >
          <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-2">
            <span className="font-medium">Notifications</span>
            <button
              type="button"
              className="underline disabled:no-underline disabled:opacity-50"
              disabled={feed.unreadCount === 0}
              onClick={markAllRead}
            >
              Mark all read
            </button>
          </div>

          {feed.notifications.length === 0 ? (
            <p className="px-4 py-6">Nothing yet.</p>
          ) : (
            <ul>
              {feed.notifications.map((notification) => (
                <li key={notification.id} className="border-b border-neutral-200 px-4 py-3">
                  <p className={notification.readAt === null ? 'font-medium' : undefined}>
                    {notification.title}
                  </p>
                  <p className="mt-1">{notification.body}</p>

                  {notification.readAt === null && (
                    <button
                      type="button"
                      className="mt-2 underline"
                      onClick={() => { markRead(notification.id); }}
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
