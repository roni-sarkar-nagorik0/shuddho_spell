import 'server-only';
import { createGetMeHandler } from '@/modules/auth/presentation/handlers/get-me';
import { createContainer } from './container';
import { makeGetMe } from './use-cases';

/**
 * Where a route handler is joined to its dependencies.
 *
 * `src/app` may import this and `presentation` may not, which is the whole
 * reason it exists: a handler factory takes the use case it needs, and this is
 * the one file allowed to know where that comes from. It keeps `route.ts` a
 * three-line re-export, which `01-architecture.md` asks for.
 *
 * The container is built per call rather than once at module load. A container
 * holds a request-scoped client, and one captured at import time would outlive
 * the request that justified it.
 */
export const getMeHandler = createGetMeHandler(() =>
  makeGetMe(createContainer(crypto.randomUUID())),
);
