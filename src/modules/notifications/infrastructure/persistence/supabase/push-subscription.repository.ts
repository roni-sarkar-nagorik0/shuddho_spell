import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type PushSubscription } from '../../../domain/entities/push-subscription';
import { type IPushSubscriptionRepository } from '../../../domain/repositories/push-subscription-repository';
import {
  PUSH_SUBSCRIPTION_COLUMNS,
  toPushSubscriptions,
  toPushSubscriptionRow,
} from '../../mappers/push-subscription.mapper';

const TABLE = 'push_subscriptions';

export class SupabasePushSubscriptionRepository implements IPushSubscriptionRepository {
  constructor(private readonly db: IDatabase) {}

  async findByProfile(profileId: string): Promise<readonly PushSubscription[]> {
    return toPushSubscriptions(
      await this.db.select({
        table: TABLE,
        columns: PUSH_SUBSCRIPTION_COLUMNS,
        eq: { profile_id: profileId },
      }),
    );
  }

  /**
   * `ignoreDuplicates: false`, and here that is not a preference — it is the
   * feature. A conflict on `endpoint` means this browser is already
   * subscribed, possibly by a **different learner** on a shared device, and
   * updating is what moves the row to whoever is signed in now. Ignoring the
   * duplicate would leave the push going to the previous owner.
   */
  async upsert(subscription: PushSubscription): Promise<PushSubscription> {
    await this.db.upsert(TABLE, [toPushSubscriptionRow(subscription)], {
      onConflict: 'endpoint',
      ignoreDuplicates: false,
    });

    return subscription;
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db.delete(TABLE, { endpoint });
  }
}
