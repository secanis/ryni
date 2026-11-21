---
title: Privacy & GDPR
description: Rýni's tracking tiers, what each stores on a visitor's device, and the disclosure material for site owners.
---

Rýni's headline is **no cookies, no fingerprinting, honors Do Not Track**. What
that means in practice depends on the **tracking tier** a site owner chooses:
the tiers differ in how much — if anything — Rýni stores on a visitor's device.

Each site also has a **disclosure mode** so the owner can publish a matching
privacy notice and/or an informational banner.

:::caution[Not legal advice]
The tiers and the generated disclosure copy are templates. Rýni does not assert
or guarantee compliance on your behalf. As the site owner you are the
**controller**; the final wording, the completed placeholders, and your
legitimate-interest assessment are your responsibility. ePrivacy/GDPR
interpretation varies between EU member states and changes over time — confirm
with your DPA or legal counsel.
:::

## Tracking tiers

Every site has a `tracking_mode`: `standard` (default), `session`, or `minimal`.
Lower tiers are strictly less invasive: each removes a class of measurement
instead of degrading silently.

| Tier | Visitor id stored in | What the tracker sends | What you lose |
|------|----------------------|------------------------|---------------|
| `standard` | `localStorage`; falls back to `sessionStorage`, then to a per-page in-memory id | view, heartbeat, duration (`end`) | — |
| `session` | `sessionStorage` only | view, heartbeat, duration (`end`) | New/returning visitors; persistent uniques |
| `minimal` | Nothing — a fresh random id per page load, never stored | view only | Unique visitors, sessions, duration, bounce, live visitors |

### Standard

The visitor id is kept in `localStorage`, so a returning visitor is recognised
across visits. If `localStorage` is blocked (private mode, storage restrictions),
Rýni falls back to `sessionStorage`, so a visitor at least correlates within the
tab instead of counting once per page load. If every store refuses the write,
the id is ephemeral. All dashboard metrics are available.

**Unique visitors are per browser profile, not per person**, and they reset
whenever the visitor clears browsing data (or the storage is otherwise wiped).
A visitor using two browser profiles counts twice; the same profile in private
mode counts separately each session.

### Session

The visitor id lives in `sessionStorage` and disappears when the tab/session
ends. Per-session uniques, sessions, duration, bounce rate and the live count
still work. "New vs returning" is meaningless — every session looks new — so the
dashboard hides it and relabels unique visitors as **Visitors (per session)**.

### Minimal

Rýni stores nothing on the visitor's device and cannot correlate visits. The
tracker still sends a random id per page load so the records schema stays valid,
but the backend skips heartbeat, duration and new-visitor bookkeeping. Only page
views plus the per-event breakdowns (referrer, browser, OS, device, screen,
page, UTM, language, time zone) are available. This tier is the closest to
"aggregate page counting".

### Changing a tier

Pick the tier in the dashboard under **Sites → (your site) → Settings →
Privacy & disclosure**. The tier is advertised to the tracker through the
snippet, not fetched at runtime:

```html
<!-- session tier -->
<script async src="/ryni.js" data-ryni-site="<tracking_id>" data-ryni-mode="session"></script>
```

`standard` is the default and emits no `data-ryni-mode` attribute, so snippets
installed before this feature keep working unchanged. After changing the tier,
**re-copy the snippet** and replace it on your site — the tracker stores the id
according to the attribute baked into the snippet you install. Lowering the tier
stops new storage; it does not rewrite data already collected.

## Device storage and ePrivacy Art 5(3)

The ePrivacy Directive (Art 5(3)) governs **storing information on, or gaining
access to information stored in, a user's terminal equipment**. It is not
limited to cookies: `localStorage` and `sessionStorage` are terminal-equipment
storage too. "No cookies" is therefore accurate as a product statement, but it
does **not** by itself settle whether consent is required.

- `minimal` stores nothing, so there is no Art 5(3) storage to justify.
- `session` stores an id in `sessionStorage` for the duration of the visit.
- `standard` stores an id in `localStorage` for longer.

Rýni deliberately ships **no cookies and no consent wall**, because the only
thing stored is a random identifier used to count aggregate visits — no
cross-site identity, no profiling, no advertising. Whether that storage needs
prior consent under Art 5(3), or can rely on a national exemption for
first-party audience measurement, depends on how the directive is implemented
in your jurisdiction and on your own assessment. If you need the strongest
position, choose `minimal`; if you keep `standard` or `session`, use the
disclosure text below and record your reasoning.

Rýni never stores cookies, never fingerprints, never stores raw IP addresses,
and never shares data across sites. Everything stays on the Rýni instance you
run.

## Transparency: GDPR Art 13

Rýni is a **processor**; the site owner is the **controller**. The Art 13 duty
to inform visitors — identity and contact of the controller, purposes, legal
basis, recipients, retention, and data-subject rights — therefore sits with the
owner, not with Rýni. That duty applies even when no banner is shown.

Rýni helps in two ways:

1. **Generated disclosure text** that matches the selected tier, ready to adapt
   for your privacy policy.
2. **An optional informational banner** with a short tier-matched summary.

The legal basis assumed by the generated copy is **legitimate interest
(Art. 6(1)(f) GDPR)** in understanding how the site is used. You must document
your own balancing assessment.

**Do Not Track is the opt-out.** Rýni's tracker checks
`navigator.doNotTrack`; when it is `"1"`, the tracker sends nothing at all. Such
visitors do not appear in the statistics — they are not counted, not stored,
and not identified. The disclosure text tells visitors they can object this
way.

## What each tier measures

| Dashboard metric | `standard` | `session` | `minimal` |
|------------------|:----------:|:---------:|:---------:|
| Views | ✓ | ✓ | ✓ |
| Unique visitors | ✓ | ✓ (per session) | ✗ |
| New / returning visitors | ✓ | ✗ | ✗ |
| Sessions / pages per session | ✓ | ✓ | ✗ |
| Avg duration / avg session duration / bounce rate | ✓ | ✓ | ✗ |
| Current (live) visitors | ✓ | ✓ | ✗ |
| Views over time | ✓ | ✓ | ✓ (views only) |
| Duration histogram | ✓ | ✓ | ✗ |
| Landing / exit pages | ✓ | ✓ | ✗ |
| Referrer, browser, OS, device, screen, page, UTM, language, time zone, page title breakdowns | ✓ | ✓ | ✓ |

Metrics a tier cannot produce are hidden in the dashboard rather than shown as
zero.

## Disclosure options

Each site has a `disclosure_mode`: `none` (default), `text`, or `banner`.
Choosing `text` or `banner` in the site settings dialog shows the generated
material with a copy button. Nothing is published automatically — you paste it
where you want it.

- **`none`** — Rýni generates nothing. You can still write your own notice.
- **`text`** — a paragraph for your privacy policy. Fill in the bracketed
  placeholders before publishing.
- **`banner`** — a self-contained HTML + JS snippet: inline styles, inline
  script, no external requests, no consent buttons. It is informational only,
  not a consent wall. Dismissal is stored per tier — `localStorage` for
  `standard`, `sessionStorage` for `session`/`minimal` — so the banner never
  stores more than tracking does. An optional "Learn more" link can point at
  your privacy policy.

### Generated disclosure text

The text is built from the tier. `[retention period]` and
`[controller name and contact]` are placeholders you must complete.

**Standard**

> This website uses Rýni, a self-hosted privacy-friendly analytics tool. To
> count unique visits, Rýni stores a random identifier in your browser's local
> storage (no cookies are used). It records the pages you view, the referring
> site, your browser and device type, screen size, language, time zone, and the
> time spent on each page. No IP address is stored, no cross-site tracking is
> performed, and the data never leaves this server. The legal basis is
> legitimate interest (Art. 6(1)(f) GDPR) in understanding how this site is
> used. You can object at any time by enabling the 'Do Not Track' setting in
> your browser. Data is retained for [retention period]. Controller:
> [controller name and contact].

**Session**

> This website uses Rýni, a self-hosted privacy-friendly analytics tool. To
> measure a single visit, Rýni stores a temporary random identifier for the
> duration of your visit only (nothing persistent). It records the pages you
> view, the referring site, your browser and device type, screen size,
> language, time zone, and the time spent on each page. No IP address is stored,
> no cross-site tracking is performed, and the data never leaves this server.
> The legal basis is legitimate interest (Art. 6(1)(f) GDPR) in understanding
> how this site is used. You can object at any time by enabling the 'Do Not
> Track' setting in your browser. Data is retained for [retention period].
> Controller: [controller name and contact].

**Minimal**

> This website uses Rýni, a self-hosted privacy-friendly analytics tool. Rýni
> stores nothing on your device and cannot link your visits together. It
> records the pages you view, the referring site, your browser and device type,
> screen size, language, and time zone. No IP address is stored, no cross-site
> tracking is performed, and the data
> never leaves this server. The legal basis is legitimate interest
> (Art. 6(1)(f) GDPR) in understanding how this site is used. You can object at
> any time by enabling the 'Do Not Track' setting in your browser. Data is
> retained for [retention period]. Controller: [controller name and contact].

### Banner summaries

The banner shows one tier-matched sentence:

| Tier | Text |
|------|------|
| `standard` | This site uses privacy-friendly analytics. |
| `session` | This site measures visits with a temporary, non-persistent identifier. |
| `minimal` | This site counts anonymous page views — no tracking data is stored on your device. |

Neither the text nor the banner adds a cookie, a third-party request, or any
storage beyond what the tier already uses.
