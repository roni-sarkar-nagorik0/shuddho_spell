import 'server-only';

/**
 * The composition root — plain construction, no DI framework, no decorators.
 * One container per request; nothing here is cached across requests, because a
 * request-scoped Supabase client must not outlive its cookies.
 *
 * Modules register their wiring here as they land (Phase 5 onward). Until then
 * the container is deliberately empty rather than speculatively populated.
 */
export interface IContainer {
  readonly requestId: string;
}

export function createContainer(requestId: string): IContainer {
  return { requestId };
}
