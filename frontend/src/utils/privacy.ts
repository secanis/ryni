// RÝNI — privacy tier helpers.

import type { DisclosureMode, TrackingMode } from '~/types';

/** Normalizes a stored tracking mode, defaulting unknown values to `standard`. */
export function trackingModeOf(mode: string | null | undefined): TrackingMode {
  return mode === 'session' || mode === 'minimal' ? mode : 'standard';
}

/** Normalizes a stored disclosure mode, defaulting unknown values to `none`. */
export function disclosureModeOf(mode: string | null | undefined): DisclosureMode {
  return mode === 'text' || mode === 'banner' ? mode : 'none';
}
