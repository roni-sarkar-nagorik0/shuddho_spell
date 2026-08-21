import { type NextRequest, type NextResponse } from 'next/server';
import { withApi } from '@/lib/api/with-api';
import { type GetDictationDemoWordUseCase } from '../../application/use-cases/get-dictation-demo-word';

/**
 * `GET /api/v1/demo/word` — one random word for the landing page's demo.
 *
 * **Public, and deliberately so.** The demo's whole promise is "no account
 * needed", and a try-before-you-sign-up that requires a session is not one. It
 * publishes a word, its transcription, its Bangla gloss and one common error —
 * the same four things the marketing page has always shown, drawn from the
 * seeded corpus instead of hard-coded beside it.
 *
 * It does **not** publish the corpus. One word per request, chosen server-side,
 * with no cursor, no filter and no count: an endpoint that let a caller page
 * through 1,240 words would be the course's vocabulary handed out to anybody
 * who found the URL, which is a different thing from a demo.
 *
 * Rate-limited by address, because it is anonymous and it costs a query.
 */
export function createGetDemoWordHandler(
  useCase: () => GetDictationDemoWordUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async () => useCase().execute(), {
    auth: 'public',
    rateLimit: { key: 'demo:word', limit: 60, windowSeconds: 60 },
  });
}
