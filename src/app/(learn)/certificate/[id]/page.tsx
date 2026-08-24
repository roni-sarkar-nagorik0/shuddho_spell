import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatusBadge } from '@/components/primitives/status-badge';
import { readCertificate } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The learner's own certificate, with the day-1 against day-28 comparison the
 * public verification page withholds.
 *
 * The document itself is deliberately plain: a border, a name, a score and a
 * code. `12-design-system.md` forbids gradients, illustration and emoji
 * everywhere, and a certificate is the one page where the temptation to break
 * that is strongest and the cost highest — a document that looks like clip art
 * is a document nobody believes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CertificatePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<ReactElement> {
  const { id } = await params;
  const user = await requireUser();
  const certificate = await readCertificate(user.userId, id);

  if (certificate === null) {
    // Not yours, or not there. The same answer for both — telling them apart
    // confirms an id exists.
    notFound();
  }

  return (
    <>
      <header className="col-span-12 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Certificate</h1>
        {certificate.isValid ? (
          <StatusBadge label="Valid" tone="passed" />
        ) : (
          <StatusBadge label="Revoked" tone="failed" />
        )}
      </header>

      <section className="col-span-12 lg:col-span-8">
        <article className="rounded-card border-2 border-primary-900 bg-surface p-10">
          <p className="label">ShuddhoSpell</p>
          <p className="mt-6 font-display text-3xl tracking-tight text-primary-900">
            {certificate.learnerName}
          </p>
          <p className="mt-2 text-muted">
            completed the {certificate.track === 'sprint21' ? '21-day sprint' : '28-day standard'}{' '}
            programme in English precision for Bangla speakers, passing the final examination.
          </p>

          <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-hairline pt-6 sm:grid-cols-3 sm:gap-6">
            <div>
              <dt className="label">Final score</dt>
              <dd>
                <MonoValue size="lg" unit="%" value={Math.round(certificate.scorePercent)} />
              </dd>
            </div>
            <div>
              <dt className="label">Issued</dt>
              <dd className="num">{new Date(certificate.issuedAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="label">Verification code</dt>
              <dd className="num tracking-wider">{certificate.verificationCode}</dd>
            </div>
          </dl>

          {!certificate.isValid && (
            <p className="mt-6 border-l-2 border-l-tertiary-500 pl-3 text-tertiary-700">
              This certificate has been revoked{certificate.revokedReason === null ? '.' : `: ${certificate.revokedReason}.`}{' '}
              It still verifies — as revoked.
            </p>
          )}
        </article>

        <p className="mt-3 text-muted">
          Anyone can check this at{' '}
          <Link className="text-primary-900 underline" href={`/verify/${certificate.verificationCode}`}>
            /verify/{certificate.verificationCode}
          </Link>{' '}
          without signing in.
        </p>
      </section>

      <section className="card col-span-12 lg:col-span-4">
        <PanelHeader note="private to you" title="Day 1 against day 28" />
        <div className="p-4">
          {certificate.comparison.length === 0 ? (
            <p className="text-muted">
              No comparison was recorded for this certificate. The public verification page never
              showed one either — it is yours alone, and its absence changes nothing about the
              certificate itself.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {certificate.comparison.map((row) => (
                <li key={row.label}>
                  <p className="label">{row.label}</p>
                  <p className="flex items-baseline gap-2">
                    <MonoValue size="sm" value={row.before} />
                    <span aria-hidden="true" className="text-cold">
                      →
                    </span>
                    <MonoValue value={row.after} />
                    <span className="num text-[11px] text-mastered">
                      +{Math.round(row.after - row.before)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
