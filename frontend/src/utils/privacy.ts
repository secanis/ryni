// RÝNI — privacy tier helpers.

import type { TrackingMode } from '~/types';

/** Normalizes a stored tracking mode, defaulting unknown values to `standard`. */
export function trackingModeOf(mode: string | null | undefined): TrackingMode {
  return mode === 'session' || mode === 'minimal' ? mode : 'standard';
}
