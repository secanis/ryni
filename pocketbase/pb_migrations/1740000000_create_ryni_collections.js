/// <reference path="../pb_data/types.d.ts" />

// Creates the RÝNI collections on fresh PocketBase v0.40+ instances:
//   sites      — one row per tracked website
//   records    — one row per page view (anonymous ingest)
//   heartbeats — live-visitor presence, upserted by the client script
// and adds a `name` field to the built-in `users` collection for display.
//
// Per-site permissions are DENORMALIZED onto `sites` as two multi-select
// relation fields (`managers`, `viewers`). PB v0.40 collection API rules
// cannot express membership via a separate junction collection (no joins in
// rule expressions), so a junction can't gate `sites` list/view. Relation
// fields let the rules read as `managers ?= @request.auth.id`.
//
// Rules are set AFTER the fields are added: PB validates rule expressions
// against the collection's fields at save time, so a rule referencing a
// field that does not exist yet fails migration.
//
// `records` and `heartbeats` keep ALL rules null (the default): the anonymous
// ingest route writes them server-side via $app (bypassing rules), and only
// superusers can reach them over the collection API.

migrate(
  (app) => {
    function ensureCollection(name) {
      let col;
      try {
        col = app.findCollectionByNameOrId(name);
      } catch (_) {
        col = new Collection({ name, type: 'base', fields: [] });
        app.save(col);
        col = app.findCollectionByNameOrId(name);
      }
      return col;
    }

    function addFields(col, fields) {
      let changed = false;
      for (const f of fields) {
        if (col.fields.getByName(f.name)) continue;
        col.fields.add(f);
        changed = true;
      }
      if (changed) app.save(col);
      return col;
    }

    function addIndex(col, name, fields, unique) {
      // Raw SQL via app.db() — col.addIndex is not exposed consistently in
      // the v0.40 JSVM; the collection's `indexes` field stores raw SQL.
      const cols = fields
        .split(',')
        .map((f) => '`' + f.trim() + '`')
        .join(', ');
      const sql = `${unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX'} IF NOT EXISTS \`${name}\` ON \`${col.name}\` (${cols});`;
      try {
        app.db().newQuery(sql).execute();
      } catch (e) {
        console.log('[migration] index statement skipped:', sql, '—', e && e.message ? e.message : e);
      }
    }

    const usersCol = app.findCollectionByNameOrId('users');
    const usersId = usersCol.id;

    // ---------------------------------------------------------------------
    // 1. sites
    // ---------------------------------------------------------------------
    const sites = ensureCollection('sites');
    addFields(sites, [
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
      new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }),
      new TextField({ name: 'name', required: true, min: 1, max: 100 }),
      new TextField({ name: 'tracking_id', required: true, min: 1, max: 20 }),
      new JSONField({ name: 'allowed_origins', maxSize: 100000 }),
      new TextField({ name: 'endpoint_slug', required: true, min: 1, max: 100 }),
      new RelationField({ name: 'created_by', collectionId: usersId, maxSelect: 1, cascadeDelete: false }),
      new RelationField({ name: 'managers', collectionId: usersId, maxSelect: 99, cascadeDelete: false }),
      new RelationField({ name: 'viewers', collectionId: usersId, maxSelect: 99, cascadeDelete: false }),
    ]);
    // Rules reference collection fields, so they must be set after addFields.
    // `created_by` is single-select → `=`; `managers`/`viewers` are
    // multi-select → `~` (relation containment) is the matching operator.
    sites.listRule =
      "@request.auth.id != '' && (created_by = @request.auth.id || managers ~ @request.auth.id || viewers ~ @request.auth.id)";
    sites.viewRule =
      "@request.auth.id != '' && (created_by = @request.auth.id || managers ~ @request.auth.id || viewers ~ @request.auth.id)";
    sites.createRule = "@request.auth.id != ''";
    sites.updateRule =
      "@request.auth.id != '' && (created_by = @request.auth.id || managers ~ @request.auth.id)";
    sites.deleteRule =
      "@request.auth.id != '' && (created_by = @request.auth.id || managers ~ @request.auth.id)";
    app.save(sites);
    addIndex(sites, 'idx_sites_tracking_id', 'tracking_id', true);
    addIndex(sites, 'idx_sites_endpoint_slug', 'endpoint_slug', true);

    // ---------------------------------------------------------------------
    // 2. records (page views) — all rules null (default)
    // ---------------------------------------------------------------------
    const records = ensureCollection('records');
    addFields(records, [
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
      new RelationField({ name: 'site', collectionId: sites.id, maxSelect: 1, cascadeDelete: true }),
      new TextField({ name: 'visitor_id', required: true, max: 100 }),
      new TextField({ name: 'path', max: 1000 }),
      new TextField({ name: 'referrer', max: 2000 }),
      new TextField({ name: 'browser', max: 100 }),
      new TextField({ name: 'os', max: 100 }),
      new TextField({ name: 'device', max: 100 }),
      new TextField({ name: 'screen_size', max: 50 }),
      new NumberField({ name: 'duration', onlyInt: true }),
      new BoolField({ name: 'is_new_visitor' }),
    ]);
    addIndex(records, 'idx_records_site_created', 'site,created', false);

    // ---------------------------------------------------------------------
    // 3. heartbeats (live visitors) — all rules null (default)
    // ---------------------------------------------------------------------
    const heartbeats = ensureCollection('heartbeats');
    addFields(heartbeats, [
      new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
      new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }),
      new RelationField({ name: 'site', collectionId: sites.id, maxSelect: 1, cascadeDelete: true }),
      new TextField({ name: 'visitor_id', required: true, max: 100 }),
      new DateField({ name: 'last_seen' }),
    ]);
    addIndex(heartbeats, 'idx_heartbeats_site_visitor', 'site,visitor_id', true);

    // ---------------------------------------------------------------------
    // 4. users: add display name
    // ---------------------------------------------------------------------
    if (!usersCol.fields.getByName('name')) {
      usersCol.fields.add(new TextField({ name: 'name', max: 200 }));
      app.save(usersCol);
    }
  },
  (app) => {
    // Best-effort rollback: do not drop collections to avoid data loss.
  },
);
