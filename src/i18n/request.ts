import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

const LOCALE_COOKIE = 'shuddhospell.locale';

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value ?? '';
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const messages = (await import(`../../messages/${locale}.json`)) as { default: object };

  return { locale, messages: messages.default };
});
