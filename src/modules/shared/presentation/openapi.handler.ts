import { type NextRequest, type NextResponse } from 'next/server';
import { buildOpenApiDocument } from './openapi';
import { withApi } from '@/lib/api/with-api';

/**
 * `GET /api/v1/openapi.json`.
 *
 * **Public**, and deliberately so: an API description that requires a session
 * to read is not documentation, it is a puzzle. It describes shapes, not data —
 * there is nothing here a learner's session protects.
 *
 * Built per request rather than cached at module load. The document is small,
 * the cost is a few milliseconds, and a module-level constant is how a
 * generated artifact quietly goes stale in a long-running process.
 */
export const openApiHandler: (request: NextRequest) => Promise<NextResponse> = withApi(
  () => Promise.resolve(buildOpenApiDocument()),
  { auth: 'public' },
);
