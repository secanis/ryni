// Static fallback for the runtime config. In the Docker image the entrypoint
// script (40-ryni-config.sh) overwrites this with the real PB_URL; in `npm run
// dev` (Vite) this file is served as-is so /config.js never 404s.
// pbUrl "" means "same origin" (the app proxies /api/ and /t/ to PocketBase).
window.__RYNI_CONFIG__ = { pbUrl: '' };
