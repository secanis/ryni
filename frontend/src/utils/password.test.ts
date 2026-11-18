import { describe, it, expect } from 'vitest';
import { generatePassword } from './password';

const AMBIGUOUS = /[0O1lI]/;

describe('generatePassword', () => {
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
