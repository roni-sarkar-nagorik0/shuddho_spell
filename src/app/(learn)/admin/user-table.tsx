'use client';

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { useToast } from '@/components/overlays/toast';
import { MonoValue } from '@/components/primitives/mono-value';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { userSummarySchema, type UserRosterView, type UserSummaryView } from './admin-contracts';

export interface IUserTableProps {
  readonly initialRoster: UserRosterView;
}

/**
 * The roster, and the one thing an admin can do to a row.
 *
 * A Client Component because promotion is an interaction, but the list itself
 * arrives from the server render — the table is populated on first paint and
 * only the changed row is refetched, never the whole page.
 *
 * The **server's** answer replaces the row. Optimistically flipping the badge
 * and then reconciling would show an admin a promotion that the last-admin rule
 * refused, and the moment the two disagree the screen is lying about who can do
 * what.
 */
export function UserTable({ initialRoster }: IUserTableProps): ReactElement {
  const [users, setUsers] = useState<readonly UserSummaryView[]>(initialRoster.users);
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const toast = useToast();

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
      return users;
    }

    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(needle) ||
        (user.email ?? '').toLowerCase().includes(needle),
    );
  }, [users, query]);

  const adminCount = users.filter((user) => user.role === 'admin').length;

  const setRole = useCallback(
    (user: UserSummaryView, role: 'user' | 'admin') => {
      setPending(user.profileId);

      void apiFetch(`/api/v1/admin/users/${user.profileId}/role`, {
        method: 'PATCH',
        schema: userSummarySchema,
        body: { role },
      })
        .then((updated) => {
          setUsers((current) =>
            current.map((row) => (row.profileId === updated.profileId ? updated : row)),
          );
          toast.show({
            severity: 'success',
            title: updated.role === 'admin' ? 'Now an admin' : 'No longer an admin',
            body: `${updated.displayName} is ${updated.role === 'admin' ? 'an admin' : 'a user'}.`,
          });
        })
        .catch((caught: unknown) => {
          // The message from the server, not one invented here. The last-admin
          // refusal explains what to do instead, and rewriting it as "something
          // went wrong" would throw that away.
          toast.show({
            severity: 'warning',
            title: 'Role unchanged',
            body: caught instanceof Error ? caught.message : 'That change was refused.',
          });
        })
        .finally(() => {
          setPending(null);
        });
    },
    [toast],
  );

  return (
    <div className="flex flex-col gap-4">
      <label className="flex h-9 max-w-sm items-center gap-2 rounded-control border border-hairline bg-surface px-3">
        <Glyph name="search" size={16} />
        <span className="sr-only">Search by name or address</span>
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Name or email"
          type="search"
          value={query}
        />
      </label>

      <div className="overflow-x-auto rounded-control border border-hairline bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className="label px-3 py-2 font-normal">Learner</th>
              <th className="label px-3 py-2 font-normal">Role</th>
              <th className="label px-3 py-2 font-normal">Track</th>
              <th className="label px-3 py-2 font-normal">Day</th>
              <th className="label px-3 py-2 font-normal">Joined</th>
              <th className="label px-3 py-2 font-normal">
                <span className="sr-only">Change role</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((user) => (
              <tr className="border-b border-hairline last:border-b-0" key={user.profileId}>
                <td className="px-3 py-2">
                  <span className="block font-medium text-primary-900">
                    {user.displayName}
                    {user.isSelf && <span className="label ml-2 text-muted">you</span>}
                  </span>
                  <span className="block text-muted">{user.email ?? '—'}</span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={user.role === 'admin' ? 'Admin' : 'User'}
                    tone={user.role === 'admin' ? 'active' : 'neutral'}
                  />
                </td>
                <td className="px-3 py-2 text-muted">
                  {user.track === 'sprint21' ? 'Sprint 21' : 'Standard 28'}
                </td>
                <td className="px-3 py-2">
                  {user.hasOnboarded ? (
                    <MonoValue
                      size="sm"
                      value={`${String(user.currentDayIndex)}/${String(user.totalDays)}`}
                    />
                  ) : (
                    <span className="text-muted">not started</span>
                  )}
                </td>
                <td className="num px-3 py-2 text-muted">{user.startedAt.slice(0, 10)}</td>
                <td className="px-3 py-2 text-right">
                  <RoleButton
                    disabled={pending !== null}
                    // The button is not offered when pressing it would empty
                    // the admin list. The server refuses it too — this is so
                    // the only admin is not invited to lock themselves out.
                    hidden={user.role === 'admin' && adminCount <= 1}
                    onClick={() => {
                      setRole(user, user.role === 'admin' ? 'user' : 'admin');
                    }}
                    pending={pending === user.profileId}
                    role={user.role}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && <p className="text-muted">Nobody matches “{query}”.</p>}
    </div>
  );
}

interface IRoleButtonProps {
  readonly role: 'user' | 'admin';
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly pending: boolean;
  readonly hidden: boolean;
}

function RoleButton({
  role,
  onClick,
  disabled,
  pending,
  hidden,
}: IRoleButtonProps): ReactElement {
  if (hidden) {
    return <span className="label text-muted">only admin</span>;
  }

  return (
    <button
      className="h-8 rounded-control border border-hairline px-3 text-primary-900 hover:bg-primary-50 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {pending ? 'Saving…' : role === 'admin' ? 'Remove admin' : 'Make admin'}
    </button>
  );
}
