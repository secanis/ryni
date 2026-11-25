import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

const createObjectURL = vi.fn(() => 'blob:test');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    value: createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: revokeObjectURL,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('downloadBlob', () => {
  it('creates an object URL, clicks a temporary link and revokes the URL', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBlob(new Blob(['x'], { type: 'text/csv' }), 'a.csv');

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
