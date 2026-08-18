import { getTranslations } from 'next-intl/server';

export default async function LandingPage(): Promise<React.ReactElement> {
  const t = await getTranslations('landing');
  const tApp = await getTranslations('app');

  return (
    <main className="paper grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="flex flex-col justify-center px-16 py-24">
        <p className="mb-6 font-display text-lg font-bold text-secondary-500">{tApp('name')}</p>
        <h1 className="text-5xl font-extrabold leading-[1.05]">
          Spell it.
          <br />
          Say it.
          <br />
          Mean it.
        </h1>
        <p className="mt-6 max-w-xs text-muted">{t('subtitle')}</p>
      </section>

      <section className="hidden items-center justify-center border-l border-hairline lg:flex">
        <div className="text-center">
          <p className="font-display text-6xl font-extrabold text-primary-900">beautiful</p>
          <p className="num mt-6 text-lg text-cold">/&#39;bjuː-tɪ-fʊl/</p>
          <p className="mt-6 font-bengali text-lg text-neutral-700" lang="bn">
            বিউটিফুল
          </p>
        </div>
      </section>
    </main>
  );
}
