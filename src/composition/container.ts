import 'server-only';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { SupabaseLearnerProfileRepository } from '@/modules/auth/infrastructure/persistence/supabase/learner-profile.repository';
import { toProfileDatabase } from '@/modules/auth/infrastructure/persistence/supabase/to-profile-database';
import { createServiceClient } from '@/lib/supabase/service-client';

/**
 * The composition root — plain construction, no DI framework, no decorators.
 * One container per request; nothing here is cached across requests, because a
 * request-scoped Supabase client must not outlive its cookies.
 *
 * Modules register their wiring here as they land. The container stays the only
 * file that knows which implementation is behind a port.
 */
export interface IContainer {
  readonly requestId: string;
  readonly learnerProfiles: ILearnerProfileRepository;
}

export function createContainer(requestId: string): IContainer {
  return {
    requestId,
    // The service client, because 008 gives the learner's own no insert policy
    // on `learner_profiles` — the row is the trigger's to make, not theirs.
    learnerProfiles: new SupabaseLearnerProfileRepository(toProfileDatabase(createServiceClient())),
  };
}
