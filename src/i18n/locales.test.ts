import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import bn from '../../messages/bn.json';
import { DEFAULT_LOCALE, isLocale, LOCALES } from './locales';

function leafKeys(value: unknown, prefix = ''): readonly string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

describe('locales', () => {
  it('offers exactly English and Bangla', () => {
    expect(LOCALES).toStrictEqual(['en', 'bn']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('rejects an unknown locale', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('bn')).toBe(true);
  });
});

describe('catalogues', () => {
  it('bn has every key en has — a missing key would render a fallback, not Bangla', () => {
    expect([...leafKeys(bn)].sort()).toStrictEqual([...leafKeys(en)].sort());
  });

  it('bn uses Bangla script, not transliteration', () => {
    expect(bn.landing.subtitle).toMatch(/[ঀ-৿]/u);
    expect(bn.nav.home).toMatch(/[ঀ-৿]/u);
  });
});
