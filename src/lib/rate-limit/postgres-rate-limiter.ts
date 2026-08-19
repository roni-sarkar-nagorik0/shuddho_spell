import 'server-only';
import { z } from 'zod';
import { type IRateLimitDecision, type IRateLimitRule, type IRateLimiter } from '@/contracts';
import { createServiceClient } from '../supabase/service-client';
import { logger } from '../logger';

/**
 * A Supabase RPC result is untyped at runtime whatever the client's generics
 * claim, and this is one of the four places `02-typescript-rules.md` puts Zod:
 * an external response crossing into the application.
 */
const consumeRowSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int(),
  retry_after_seconds: z.number().int(),
});

/**
 * The default `IRateLimiter` — 012's `consume_rate_limit`, one round trip.
 *
 * The service client, because 012 revokes the function from every client role.
 * A learner able to call it directly could spend their own allowance to nothing
 * or, worse, somebody else's.
 */
export class PostgresRateLimiter implements IRateLimiter {
  async consume(rule: IRateLimitRule, subject: string): Promise<IRateLimitDecision> {
    const bucket = `${rule.key}:${subject}`;

    const { data, error } = await createServiceClient()
      .rpc('consume_rate_limit', {
        bucket_key: bucket,
        max_requests: rule.limit,
        window_seconds: rule.windowSeconds,
      })
      .single();

    const row = consumeRowSchema.safeParse(data);

    if (error !== null || !row.success) {
      // **Fail open, and say so loudly.**
      //
      // The alternative is that a hiccup in the limiter's own table locks every
      // learner out of the product. Rate limiting protects against abuse; it is
      // not an authorisation control, and nothing here is the thing standing
      // between a stranger and a learner's data — that is RLS and the session,
      // both of which are untouched by this failing.
      logger.error({ bucket, err: error }, 'rate limiter unavailable — allowing the request');

      return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
    }

    return {
      allowed: row.data.allowed,
      remaining: row.data.remaining,
      retryAfterSeconds: row.data.retry_after_seconds,
    };
  }
}
