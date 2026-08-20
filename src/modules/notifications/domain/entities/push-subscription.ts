import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';

export interface IPushKeys {
  readonly p256dh: string;
  readonly auth: string;
}

export interface IPushSubscriptionProps {
  readonly id: string;
  readonly profileId: string;
  /** Globally unique: it identifies a **browser install**, not a learner. */
  readonly endpoint: string;
  readonly keys: IPushKeys;
  readonly userAgent: string | null;
  readonly createdAt: Date;
}

/**
 * One browser that has agreed to receive push.
 *
 * The endpoint being unique across the whole table rather than per learner is
 * the interesting part, and 005 says why: it identifies a browser install. A
 * shared device handed to a second learner **moves** the row instead of
 * duplicating it, so a push cannot reach the wrong person — which is the one
 * failure mode of this feature that would be genuinely harmful.
 */
export class PushSubscription {
  readonly id: string;
  readonly profileId: string;
  readonly endpoint: string;
  readonly keys: IPushKeys;
  readonly userAgent: string | null;
  readonly createdAt: Date;

  constructor(props: IPushSubscriptionProps) {
    // 005's `push_subscriptions_keys_complete`. A subscription missing a key
    // cannot be encrypted to, so it would fail at send time on every tick
    // forever. Refusing it at write time turns a permanent runtime error into
    // one bad request.
    if (props.keys.p256dh.length === 0 || props.keys.auth.length === 0) {
      throw new InvalidValueError(
        'PushSubscription',
        props.endpoint,
        'both p256dh and auth keys are required to encrypt a push',
      );
    }

    this.id = props.id;
    this.profileId = props.profileId;
    this.endpoint = props.endpoint;
    this.keys = props.keys;
    this.userAgent = props.userAgent;
    this.createdAt = props.createdAt;
  }
}
