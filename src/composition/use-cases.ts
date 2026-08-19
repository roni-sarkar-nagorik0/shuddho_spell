import 'server-only';
import { BootstrapProfileUseCase } from '@/modules/auth/application/use-cases/bootstrap-profile';
import { GetMeUseCase } from '@/modules/auth/application/use-cases/get-me';
import { type IContainer } from './container';

/**
 * One factory per use case. A use case never reaches into the container itself
 * — it takes interfaces through its constructor and is buildable with fakes
 * alone, which is the whole test for whether the wiring is right.
 */
export function makeBootstrapProfile(container: IContainer): BootstrapProfileUseCase {
  return new BootstrapProfileUseCase(container.learnerProfiles);
}

export function makeGetMe(container: IContainer): GetMeUseCase {
  return new GetMeUseCase(container.learnerProfiles);
}
