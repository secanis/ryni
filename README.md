# RÝNI

Self-hosted, privacy-preserving web analytics in the spirit of Ackee — no
cookies, respects Do Not Track, built on the same stack as
[STJÓRNA](https://github.com/secanis/stjorna).

Two integration variants, both driven by the same client script:

- **Variant A (direct)** — the script posts straight to Rýni (cross-origin).
- **Variant B (proxy)** — the script posts to the site's own origin, which
  forwards to Rýni, so adblockers can't see it.

**Status:** early design. See
[`docs/superpowers/specs/2026-11-01-ryni-design.md`](docs/superpowers/specs/2026-11-01-ryni-design.md).

## License

[AGPL-3.0-or-later](LICENSE)
