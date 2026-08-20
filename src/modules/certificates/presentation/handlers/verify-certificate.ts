import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type VerifyCertificateUseCase } from '../../application/use-cases/verify-certificate';
import { verifyParamsSchema, type IVerifyParams } from '../dto/certificate-requests';

/**
 * `GET /api/v1/certificates/verify/:code` — **public**.
 *
 * `auth: 'public'` is the whole feature. A certificate is a claim its holder
 * publishes and a verifier is by definition a stranger; requiring an account to
 * check one would make it unverifiable by the people it exists to convince.
 * 008 already grants `select` on `certificate_verifications` to `anon` for the
 * same reason — this route is the app's own front door to the same fact.
 *
 * A rate limit, because an unauthenticated endpoint keyed on a short code is
 * exactly the shape somebody enumerates. Fifty-five bits makes scanning
 * pointless anyway; the ceiling makes it cheap to refuse.
 *
 * Not found and malformed both answer 404. Distinguishing them would tell a
 * scanner which of its guesses had the right shape.
 */
export function createVerifyCertificateHandler(
  useCase: () => VerifyCertificateUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, IVerifyParams>(
    async ({ params }) => {
      const verification = await useCase().execute({ code: params.code });

      if (verification === null) {
        throw ApiError.notFound('That certificate');
      }

      return verification;
    },
    {
      auth: 'public',
      paramsSchema: verifyParamsSchema,
      rateLimit: { key: 'certificates:verify', limit: 30, windowSeconds: 60 },
    },
  );
}
