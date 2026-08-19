import { getTranslations } from 'next-intl/server';

interface ILoginPageProps {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
}

/**
 * One heading, one line, one button. Google is the only door: this page carries
 * no form field of any kind and no second provider, now or later.
 *
 * The button submits a plain HTML form to `/auth/signin` rather than calling a
 * Server Action. Two reasons, both deliberate:
 *
 * 1. A Server Action form renders a hidden `<input name="$ACTION_ID_…">` for
 *    progressive enhancement, and this page must carry zero input elements.
 * 2. The OAuth url is built by the *server* Supabase client, because the session
 *    cookie is httpOnly and a browser client can no longer participate (D21).
 *
 * It also means sign-in works with JavaScript switched off.
 */
export default async function LoginPage(props: ILoginPageProps): Promise<React.ReactElement> {
  const t = await getTranslations('login');
  const tApp = await getTranslations('app');
  const searchParams = await props.searchParams;
  const hasFailed = searchParams['error'] === 'google';

  return (
    <main className="paper flex min-h-screen flex-col justify-center px-16 py-24">
      <p className="mb-6 font-display text-lg font-bold text-secondary-500">{tApp('name')}</p>

      <h1 className="text-5xl font-extrabold leading-[1.05]">{t('heading')}</h1>
      <p className="mt-6 max-w-xs text-muted">{t('subtitle')}</p>

      <form action="/auth/signin" method="post" className="mt-10">
        <button
          type="submit"
          className="rounded-control border border-hairline bg-surface px-6 py-3 font-display text-base font-bold text-primary-900 transition-colors hover:bg-primary-50"
        >
          {t('google')}
        </button>
      </form>

      {hasFailed ? (
        <p role="alert" className="mt-6 max-w-xs text-tertiary-700">
          {t('failed')}
        </p>
      ) : null}
    </main>
  );
}
