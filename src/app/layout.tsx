import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Bricolage_Grotesque, IBM_Plex_Mono, Noto_Sans_Bengali, Public_Sans } from 'next/font/google';
import { SessionBoundary } from '@/lib/auth/session-boundary';
import { QueryProvider } from '@/lib/query/query-provider';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
const bengali = Noto_Sans_Bengali({ subsets: ['bengali'], variable: '--font-bengali' });

export const metadata: Metadata = {
  title: 'ShuddhoSpell',
  description: 'A 30-day English precision course built for Bangla speakers.',
};

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${mono.variable} ${bengali.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <SessionBoundary>{children}</SessionBoundary>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
