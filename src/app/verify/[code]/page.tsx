import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { readCertificateVerification } from '@/composition/reads';

/**
 * Public certificate verification. **No session, no sign-in, no account.**
 *
 * Outside every authenticated route group on purpose: nothing on this page
 * calls `requireUser`, and there is nothing here for a session to unlock. That
 * is the feature — a certificate a stranger cannot check is not a
 * qualification, it is a screenshot.
 *
 * It shows only what 008's `certificate_verifications` view exposes: name,
 * track, score, issue date and revocation. No id, no attempt, no comparison.
 *
 * A revoked certificate **verifies as revoked** rather than as missing.
 * Reporting it as unknown would make a revoked certificate indistinguishable
 * from a forged code, which is precisely the distinction a verifier came for.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  params,
}: {
  readonly params: Promise<{ readonly code: string }>;
}): Promise<ReactElement> {
  const { code } = await params;
  const verification = await readCertificateVerification(decodeURIComponent(code));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <header>
        <p className="label">ShuddhoSpell</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight text-primary-900">
          Certificate verification
        </h1>
      </header>

      {verification === null ? (
        <div className="card border-l-2 border-l-tertiary-500 p-6">
          <p className="font-medium text-primary-900">No certificate matches that code.</p>
          <p className="mt-2 text-muted">
            Codes look like <span className="num">XXXX-XXXX-XXXX</span> and never contain the
            letters O, I, L, S, B or Z, or the digits 0, 1, 2, 5 or 8 — they are left out precisely
            because they are misread. Check the characters and try again.
          </p>
        </div>
      ) : (
        <div className="card p-6">
          <p className="font-display text-2xl tracking-tight text-primary-900">
            {verification.learnerName}
          </p>
          <p className="mt-1 text-muted">
            completed the {verification.track === 'sprint21' ? '21-day sprint' : '28-day standard'}{' '}
            programme and passed the final examination.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4">
            <div>
              <dt className="label">Score</dt>
              <dd>
                <MonoValue unit="%" value={Math.round(verification.scorePercent)} />
              </dd>
            </div>
            <div>
              <dt className="label">Issued</dt>
              <dd className="num">{new Date(verification.issuedAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="label">Code</dt>
              <dd className="num tracking-wider">{verification.verificationCode}</dd>
            </div>
            <div>
              <dt className="label">Status</dt>
              <dd className={verification.isValid ? 'text-mastered' : 'text-tertiary-700'}>
                {verification.isValid ? 'Valid' : 'Revoked'}
              </dd>
            </div>
          </dl>

          {!verification.isValid && (
            <p className="mt-4 border-l-2 border-l-tertiary-500 pl-3 text-tertiary-700">
              This certificate was revoked
              {verification.revokedAt === null
                ? ''
                : ` on ${new Date(verification.revokedAt).toLocaleDateString()}`}
              {verification.revokedReason === null ? '.' : `: ${verification.revokedReason}.`} It is
              a real certificate that is no longer valid — not an unknown code.
            </p>
          )}
        </div>
      )}

      <p className="text-muted">
        <Link className="text-primary-900 underline" href="/">
          What is ShuddhoSpell?
        </Link>
      </p>
    </main>
  );
}
