/// <reference path="../pb_data/types.d.ts" />

// RÝNI — anonymous tracking ingest route.
//
//   POST /t/{slug}
//
// No auth middleware. The handler lives in pb_hooks/lib/ingest.js and is
// require()d inside the handler (loader/executor VM split).

console.log('[ryni-ingest] loading');

routerAdd('POST', '/t/{slug}', (e) => {
    require(`${__hooks}/lib/ingest.js`).handler(e);
});

console.log('[ryni-ingest] registered POST /t/{slug}');
