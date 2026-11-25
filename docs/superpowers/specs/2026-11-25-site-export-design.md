# Per-site export: chart image + raw pageviews

## Intent

Site members need to take data out of Rýni: a picture of the views chart for a
report, and the underlying pageview rows for a spreadsheet or further analysis.
Both exports cover the date range currently selected on the dashboard.

## Goals

- Export the "Views over time" chart as PNG or JPG from the chart card.
- Export raw pageview records for the selected range as CSV or JSON, from the
  header **More** menu.
- Anyone with a role on that site — viewer, manager, or superuser — may export.
  Non-members get 403.
- Exported rows contain every stored pageview field **except `visitor_id`**.

## Non-goals

- Exporting aggregate stats (totals, breakdowns) — replaced by raw records.
- Scheduled or emailed exports.
- Pagination/streaming for very large sites; the endpoint returns one payload,
  like `/stats`.
- Exporting heartbeats or live-visitor data.

## Approaches considered

### Data

1. **Server renders CSV/JSON directly.** Auth still needs a `fetch` + blob on the
   client because the JWT is a header. CSV quoting lives in the Goja VM and is
   only reachable through integration tests.
2. **Server returns one JSON payload; client renders both formats.** Route
   returns `{ site, from, to, exportedAt, records }`. CSV escaping and JSON
   shape are pure frontend functions with unit tests; the backend test covers
   auth, range filtering, field selection, and omission of `visitor_id`.
3. Client-only query of `records` — impossible: the collection is superuser-only
   by design.

**Chosen: 2.** One payload, two renderers, testable on both sides.

### Chart image

1. **Rasterize the existing SVG.** Clone the chart, inline computed styles,
   draw to a 2× canvas, encode PNG or JPEG. No dependency, no duplicate chart.
2. A separate export-only chart renderer — duplicates drawing code, drifts.
3. `html-to-image`-style dependency — extra bundle for what the SVG already does.

**Chosen: 1.**

## Backend

New handler `pocketbase/pb_hooks/lib/export.js`, registered by
`pocketbase/pb_hooks/export.pb.js`:

```
GET /api/ryni/sites/{siteId}/export?from=<ISO>&to=<ISO>
Auth: $apis.requireAuth(); handler checks superuser or site member.
```

- `from` and `to` are required and must parse; invalid/missing → 400. Unlike
  `/stats`, exporting without an explicit range is refused rather than defaulted
  to "everything".
- Query `records` filtered by site and range, ordered oldest first.
- Response:

```json
{
  "site": { "id": "...", "name": "...", "tracking_id": "..." },
  "from": "2026-11-18T00:00:00.000Z",
  "to": "2026-11-25T00:00:00.000Z",
  "exportedAt": "2026-11-25T12:00:00.000Z",
  "records": [
    {
      "created": "2026-11-20T10:00:00.000Z",
      "path": "/pricing",
      "title": "Pricing",
      "referrer": "https://example.com/",
      "browser": "Firefox",
      "os": "Linux",
      "device": "desktop",
      "screen_size": "1920x1080",
      "language": "de-CH",
      "timezone": "Europe/Zurich",
      "utm_source": "newsletter",
      "utm_medium": "email",
      "utm_campaign": "launch",
      "duration": 42,
      "is_new_visitor": true
    }
  ]
}
```

- Field order above is the CSV column order. JSON keeps the same keys.
- `visitor_id`, PocketBase `id`, and the `site` relation are never emitted.
- Missing values become `""` for text and `0`/`false` for numbers/booleans, so
  every row has the same shape.

## Frontend

### Raw data

- `SiteActionsMenu` gains **Export CSV** and **Export JSON** items, wired from
  `Dashboard` with the current `range()` and site.
- `utils/siteExport.ts`:
  - `fetchSiteExport(siteId, range): Promise<SiteExportPayload>` — calls
    `pb.send('/api/ryni/sites/{id}/export', { query: range })`.
  - `toCsv(payload): string` — header row + RFC 4180 quoting (quotes doubled,
    fields with `,`, `"`, `\n`, `\r` wrapped). Cells starting with `=`, `+`,
    `-`, `@`, tab or CR get a leading `'` so a crafted page path cannot run as
    a spreadsheet formula.
  - `toJson(payload): string` — pretty-printed payload (metadata included).
  - `exportFilename(siteName, from, to, ext)` — slugified site name, ISO dates,
    e.g. `ryni-example-com-2026-11-18_2026-11-25.csv`.
- `utils/download.ts` — `downloadBlob(blob, filename)` using an object URL and a
  temporary anchor.
- A failure surfaces as inline error text under the header (the menu closes on
  click, so there is no in-menu busy state).

### Chart image

- Chart card header gets a small **Export** dropdown (PNG / JPG), matching the
  `SiteActionsMenu` interaction pattern.
- `utils/svgToImage.ts`:
  - `svgToBlob(svg: SVGSVGElement, opts): Promise<Blob>`.
  - Clone the SVG, drop elements marked `data-export-hide` (hover tooltip and
    transparent hit targets), inline computed `fill`, `stroke`, `stop-color`,
    `stop-opacity`, `font-family`, `font-size`, `font-weight`, `text-anchor`,
    `opacity`, and stroke properties from the live DOM.
  - Rasterize at 2× the SVG's viewBox size onto a canvas filled with the card
    background color, so both PNG and JPG are legible and JPEG has no alpha.
  - Encode `image/png` or `image/jpeg` (quality ~0.92) via `canvas.toBlob`.
- `TimeSeries` marks the hover group and hit-target rects `data-export-hide` and
  exposes the SVG element to the parent through a prop callback/ref so the
  header control can export exactly what is displayed.

## Testing

- Backend (`pocketbase/tests/export.test.ts`): member and superuser get rows in
  range; non-member 403; missing/invalid range 400; ordering; no `visitor_id`
  key; empty range returns `[]`; minimal-tier rows export with blank strings.
- Frontend unit tests: CSV escaping (commas, quotes, newlines, blank values),
  JSON shape, filename generation, and SVG inlining (jsdom + a stub canvas
  encoder where needed).
- Component test: menu items call the handlers and close; chart control invokes
  the image export with the right type.

## Open decisions left to the builder

- Exact wording/placement of the export error message.
- JPEG quality and whether to expose it (default 0.92, not exposed).
- Whether the chart menu is a dropdown or two buttons; follow the header menu
  pattern.
