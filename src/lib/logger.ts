import 'server-only';
import pino from 'pino';

/**
 * Redaction covers what this app actually holds: the bearer token on an
 * inbound request, the session cookie, and any access token that finds its way
 * into a logged object.
 *
 * A fourth path was removed in F3.11, guarding a credential this app cannot
 * have. Do not put it back — the reasoning is D26 in `ARCHITECTURE.md`, and
 * `src/lib/auth/one-door.test.ts` will fail if you do.
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.accessToken'],
    censor: '[redacted]',
  },
});
