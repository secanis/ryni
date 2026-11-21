/// <reference path="../pb_data/types.d.ts" />

// Adds the two per-site privacy settings to the `sites` collection:
//
//   tracking_mode   — how much the client script collects:
//                     standard | session | minimal
//   disclosure_mode — which privacy notice the client script shows:
//                     none | text | banner
//
// Both are optional: an empty value means "not configured yet", and readers
// fall back to the defaults (`standard` / `none`). Existing rows are
// backfilled with those defaults so dashboards and the ingest route never
// have to special-case legacy sites.
//
// Idempotent: fields are only added when missing, and the backfill only
// touches rows whose value is empty/NULL.

migrate(
  (app) => {
    const sites = app.findCollectionByNameOrId('sites');

    const fields = [
      new SelectField({
        name: 'tracking_mode',
        values: ['standard', 'session', 'minimal'],
        maxSelect: 1,
        required: false,
      }),
      new SelectField({
        name: 'disclosure_mode',
        values: ['none', 'text', 'banner'],
        maxSelect: 1,
        required: false,
      }),
    ];

    let changed = false;
    for (const f of fields) {
      if (sites.fields.getByName(f.name)) continue;
      sites.fields.add(f);
      changed = true;
    }
    if (changed) app.save(sites);

    // Raw SQL backfill: PB record updates would run validation/rules, and
    // a plain UPDATE is both cheaper and safe for legacy rows.
    const backfills = [
      "UPDATE sites SET tracking_mode='standard' WHERE tracking_mode='' OR tracking_mode IS NULL",
      "UPDATE sites SET disclosure_mode='none' WHERE disclosure_mode='' OR disclosure_mode IS NULL",
    ];
    for (const sql of backfills) {
      try {
        app.db().newQuery(sql).execute();
      } catch (e) {
        console.log('[migration] backfill statement skipped:', sql, '—', e && e.message ? e.message : e);
      }
    }
  },
  (app) => {
    // Best-effort rollback: leave the fields in place to avoid data loss.
  },
);
