import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { readUserRoster } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { UserTable } from './user-table';

/**
 * The admin screen: who has signed in, and who is allowed to run the place.
 *
 * `readUserRoster` throws for anybody who is not an admin, and this page turns
 * that into a 404 rather than an error page. The endpoints answer 403, because
 * a client that asked deserves a straight answer; a *page* that renders "you
 * are not allowed" for a URL a learner has no reason to know about is only
 * advertising it. Neither is the protection — the use case reading the caller's
 * role from the database before it reads anything else is.
 *
 * The roster is resolved on the server through the composition root, so the
 * table is populated on first paint. Role changes go to `/api/v1/admin/...`,
 * which runs the same use case the other way round.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminPage(): Promise<ReactElement> {
  const user = await requireUser();

  const roster = await readUserRoster(user.userId).catch(() => null);

  if (roster === null) {
    notFound();
  }

  const onboarded = roster.users.filter((row) => row.hasOnboarded).length;

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Admin</h1>
        <span className="num text-muted">everybody who has signed in</span>
      </header>

      <section className="col-span-12 flex flex-wrap gap-6 rounded-control border border-hairline bg-surface px-4 py-3">
        <Stat label="Users" value={roster.totalUsers} />
        <Stat label="Admins" value={roster.totalAdmins} />
        <Stat label="Onboarded" value={onboarded} />
      </section>

      <section className="col-span-12">
        <UserTable initialRoster={roster} />
      </section>

      {/*
        The content tables are already screens, and they are already correct —
        the library is the word list, `/program` is the day plan, `/exams` is
        the paper catalogue. Linking is the honest thing to do here: a second
        word table on this page would be a second implementation of the library
        for no reason but to sit under a different heading.
      */}
      <section className="col-span-12 flex flex-col gap-2">
        <h2 className="font-display text-lg tracking-tight text-primary-900">Content</h2>
        <ul className="flex flex-wrap gap-3">
          <ContentLink href="/library" label="Words" />
          <ContentLink href="/program" label="Programme days" />
          <ContentLink href="/exams" label="Exams" />
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }): ReactElement {
  return (
    <span className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <MonoValue size="sm" value={String(value)} />
    </span>
  );
}

function ContentLink({
  href,
  label,
}: {
  readonly href: string;
  readonly label: string;
}): ReactElement {
  return (
    <li>
      <Link
        className="flex h-9 items-center rounded-control border border-hairline bg-surface px-3 text-primary-900 hover:bg-primary-50"
        href={href}
      >
        {label}
      </Link>
    </li>
  );
}
