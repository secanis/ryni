import { describe, it, expect } from 'vitest';
import { generatePassword, ALPHABET } from './password';

const AMBIGUOUS = /[0O1lI]/;

describe('generatePassword', () => {
  it('uses the full unambiguous alphabet (lowercase minus l, uppercase minus I/O, digits 2-9)', () => {
    expect(ALPHABET).toBe('abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  });

  it('returns a string of the requested length', () => {
    expect(generatePassword(16)).toHaveLength(16);
    expect(generatePassword(24)).toHaveLength(24);
  });

  it('never emits ambiguous characters (0, O, 1, l, I)', () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePassword()).not.toMatch(AMBIGUOUS);
    }
  });

  it('produces different values across calls', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
