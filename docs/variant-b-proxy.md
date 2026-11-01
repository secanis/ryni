# Variant B — same-origin proxy

Variant B serves the tracker and the tracking endpoint from your own origin,
so adblockers (which block cross-origin analytics) see only same-origin
requests. You need two things on your server:

1. Serve the Rýni tracker script at `/ryni.js` (copy the built
   `frontend/public/ryni.js` into your static assets, or proxy it).
2. Forward `/t/` to your Rýni instance.

## nginx

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

## Other servers / frameworks

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

## The snippet

```html
<script async src="/ryni.js" data-ryni-site="<tracking_id>"></script>
```

Note there is no `data-ryni-server` — the tracker defaults to the same
origin, so it posts to `/t/<tracking_id>` on your own domain.
