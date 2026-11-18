import { describe, it, expect } from 'vitest';
import { pbErrorMessage } from './pbError';

describe('pbErrorMessage', () => {
  it('extracts field-level detail from a ClientResponseError shape', () => {
    const err = {
      message: 'Failed to create record.',
      response: {
        data: {
          email: { code: 'validation_invalid_email', message: 'The email is invalid or already in use.' },
        },
      },
    };
    expect(pbErrorMessage(err, 'fallback')).toBe('The email is invalid or already in use.');
  });

  it('joins multiple field messages', () => {
    const err = {
      response: {
        data: { email: { message: 'bad email' }, name: { message: 'bad name' } },
      },
    };
    expect(pbErrorMessage(err, 'fallback')).toBe('bad email; bad name');
  });

  it('falls back to err.message when no field detail exists', () => {
    expect(pbErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('uses the fallback for non-object errors', () => {
    expect(pbErrorMessage('nope', 'fallback')).toBe('fallback');
  });
});
