---
title: Tracking a website
description: Add Rýni to a website with the direct or proxy variant.
---

Create a site in the dashboard (**Sites → Add site**). You'll get two snippets.

## Variant A — direct

The script is served from Rýni and posts cross-origin:

```html
<script async src="https://ryni.example/ryni.js"
        data-ryni-server="https://ryni.example"
        data-ryni-site="<tracking_id>"></script>
```

Set the site's **allowed origins** to your website's origin so the
cross-origin request is accepted.

## Variant B — same-origin proxy

The script and the requests stay on your own origin:

```html
<script async src="/ryni.js" data-ryni-site="<tracking_id>"></script>
```

You must serve `/ryni.js` and forward `/t/` to Rýni from your own server.

## Single-page apps

Add `data-ryni-detailed` to re-fire on route changes:

```html
<script async src="/ryni.js" data-ryni-site="<tracking_id>" data-ryni-detailed></script>
```

## Variant B proxy setup

Variant B serves the tracker and the tracking endpoint from your own origin,
so adblockers (which block cross-origin analytics) see only same-origin
requests. You need two things on your server:

1. Serve the Rýni tracker script at `/ryni.js` (copy the built
   `frontend/public/ryni.js` into your static assets, or proxy it).
2. Forward `/t/` to your Rýni instance.

### nginx

```nginx
# Serve the tracker (either copy the file here, or proxy it):
location = /ryni.js {
    proxy_pass https://ryni.example/ryni.js;
    proxy_set_header Host ryni.example;
}

# Forward tracking requests to Rýni:
location /t/ {
    proxy_pass https://ryni.example/t/;
    proxy_set_header Host ryni.example;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Other servers / frameworks

The idea is the same everywhere: add a route that forwards `POST /t/<id>`
to `https://ryni.example/t/<id>` (preserving the path and query string).

For example, in a SolidJS/Vite app, add a Vite dev proxy:

```ts
// vite.config.ts
export default {
  server: {
    proxy: {
      '/t/': { target: 'https://ryni.example', changeOrigin: true },
    },
  },
};
```

### The snippet

Note there is no `data-ryni-server` — the tracker defaults to the same
origin, so it posts to `/t/<tracking_id>` on your own domain.

> The ingest accepts Variant B requests only when they carry a browser
> `Sec-Fetch-Site: same-origin` (or `same-site`) header. Real browser beacons
> always send it; the proxy forwards it unchanged. A bare `curl`/`wget` to the
> endpoint (no such header) returns 403 — that's expected, not a misconfig.
> For a hard, unspoofable boundary, put Rýni behind your own auth or a
> shared-secret proxy token.
