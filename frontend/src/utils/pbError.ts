// Extract a useful message from a PocketBase `ClientResponseError`.
//
// PB returns the top-level `message` as "Failed to create record." and puts
// the actionable per-field reason under `response.data.<field>.message`
// (e.g. "The email is invalid or already in use."). Surface the detail when
// it exists, then the top-level message, then the caller's fallback.
export function pbErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (data && typeof data === 'object') {
      const msgs = Object.values(data as Record<string, unknown>)
        .map((f) =>
          f && typeof f === 'object' ? (f as { message?: unknown }).message : undefined,
        )
        .filter((m): m is string => typeof m === 'string' && m.length > 0);
      if (msgs.length) return msgs.join('; ');
    }
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  return fallback;
}
