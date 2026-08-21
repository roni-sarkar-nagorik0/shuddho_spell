/**
 * Sentry, initialised once per runtime (F13.8).
 *
 * Next calls `register()` on boot for each runtime it starts. The import is
 * dynamic and inside the branch because `@sentry/nextjs` pulls in Node built-ins
 * that the edge runtime does not have — importing it at module scope would
 * break a runtime that never uses it.
 *
 * **With no `SENTRY_DSN` it initialises inert and reports nothing.** That is
 * what a developer running locally wants, and it is what a fork of this repo
 * gets by default rather than silently posting somebody else's stack traces
 * into a project they do not own.
 *
 * `13-frontend.md` and the phase list both say "Sentry, both apps" — a phrase
 * from the pre-restructure two-project design. There is one application now, so
 * this is both halves: the server runtimes here, and the browser through
 * `onRequestError` plus the client config below.
 */


export async function register(): Promise<void> {
  const { serverEnv } = await import('@/lib/env.server');

  if (serverEnv.SENTRY_DSN === undefined) {
    return;
  }

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: serverEnv.SENTRY_DSN,
      environment: serverEnv.NODE_ENV,
      // A learner's answers and a learner's identity are both in these
      // requests. Nothing is sent that was not explicitly attached.
      sendDefaultPii: false,
      tracesSampleRate: serverEnv.NODE_ENV === 'production' ? 0.1 : 1,
    });
  }
}

/**
 * Next hands every server error here. Re-exported from the SDK so a request
 * that fails inside a Server Component is reported with its route and its
 * request id rather than only appearing in the log.
 */
export async function onRequestError(
  ...args: readonly unknown[]
): Promise<void> {
  const { serverEnv } = await import('@/lib/env.server');

  if (serverEnv.SENTRY_DSN === undefined) {
    return;
  }

  const Sentry = await import('@sentry/nextjs');
  const captureRequestError = Sentry.captureRequestError as unknown as (
    ...forwarded: readonly unknown[]
  ) => void;

  captureRequestError(...args);
}
