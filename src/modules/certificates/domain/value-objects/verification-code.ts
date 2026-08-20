import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';

/**
 * The alphabet, minus everything that gets misread off a screen.
 *
 * No `0`/`O`, no `1`/`I`/`L`, no `5`/`S`, no `2`/`Z`, no `8`/`B`. 006's comment
 * calls for "unambiguous characters only" because this code is read aloud and
 * typed into another device by someone verifying a claim — a code that fails
 * one time in twenty because of an `O` is a code that gets distrusted.
 */
const ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY';

const BLOCKS = 3;
const BLOCK_LENGTH = 4;

const FORMAT = /^[34679ACDEFGHJKMNPQRTUVWXY]{4}-[34679ACDEFGHJKMNPQRTUVWXY]{4}-[34679ACDEFGHJKMNPQRTUVWXY]{4}$/u;

/**
 * `XXXX-XXXX-XXXX`, the public handle on a certificate.
 *
 * 25 characters over 12 positions is about 55 bits — not a secret, and not
 * pretending to be one. It only has to be unguessable enough that scanning for
 * valid codes is pointless, and the thing it reveals is a name, a track and a
 * score that the holder chose to publish.
 */
export class VerificationCode {
  private constructor(readonly value: string) {}

  static of(value: string): VerificationCode {
    const normalised = value.trim().toUpperCase();

    if (!FORMAT.test(normalised)) {
      throw new InvalidValueError(
        'VerificationCode',
        JSON.stringify(value),
        'must be XXXX-XXXX-XXXX using unambiguous characters',
      );
    }

    return new VerificationCode(normalised);
  }

  /**
   * Built from bytes the **caller** supplies, so this stays pure and the source
   * of randomness is a port. `crypto.getRandomValues` inside a value object
   * would make it untestable and would put an environment dependency in the
   * domain.
   */
  static fromBytes(bytes: Uint8Array): VerificationCode {
    const needed = BLOCKS * BLOCK_LENGTH;

    if (bytes.length < needed) {
      throw new InvalidValueError(
        'VerificationCode',
        `${String(bytes.length)} bytes`,
        `needs at least ${String(needed)} bytes`,
      );
    }

    const characters = [...bytes.slice(0, needed)].map(
      (byte) => ALPHABET[byte % ALPHABET.length] ?? ALPHABET[0],
    );

    const blocks: string[] = [];

    for (let index = 0; index < BLOCKS; index += 1) {
      blocks.push(characters.slice(index * BLOCK_LENGTH, (index + 1) * BLOCK_LENGTH).join(''));
    }

    return new VerificationCode(blocks.join('-'));
  }

  /** Accepts a code typed without its hyphens, which is how people type them. */
  static normalise(raw: string): string {
    const bare = raw.trim().toUpperCase().replace(/-/gu, '');

    if (bare.length !== BLOCKS * BLOCK_LENGTH) {
      return raw.trim().toUpperCase();
    }

    return [bare.slice(0, 4), bare.slice(4, 8), bare.slice(8, 12)].join('-');
  }
}
