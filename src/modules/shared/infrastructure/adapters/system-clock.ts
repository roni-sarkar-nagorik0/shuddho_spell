import { type IClock } from '../../application/ports/clock';

/**
 * The one place in the application that reads the wall clock.
 *
 * Everything else takes `IClock`, which is what makes "it is 23:50 on the 19th
 * in Dhaka" a parameter rather than something a test has to wait for.
 */
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
