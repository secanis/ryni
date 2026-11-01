/// <reference path="../pb_data/types.d.ts" />

// Converts `sites.created_by` from a RelationField (→ `users`) to a plain
// TextField.
//
// Why: a site's creator can be a superuser, whose id lives in `_superusers`,
// not `users`. A RelationField rejects superuser-created sites with
// "validation_missing_rel_records". `created_by` is only a marker (the
// list/view rules compare it against `@request.auth.id`), so a text column
// is the right shape.
//
// This is a follow-up to 1740000000 (which now creates it as text for fresh
// installs); it upgrades instances that applied the old relation version.
// Idempotent: no-ops when the field is missing or already text.

migrate(
  (app) => {
    var col;
    try {
      col = app.findCollectionByNameOrId('sites');
    } catch (_) {
      return;
    }

    var field = col.fields.getByName('created_by');
    if (!field || field.type() !== 'relation') return;

    // Snapshot existing creator ids before dropping the relation.
    var creators = {};
    try {
      var sites = app.findRecordsByFilter('sites', '', '', 0, 0) || [];
      for (var i = 0; i < sites.length; i++) {
        var v = sites[i].get('created_by');
        creators[sites[i].id] = String(v || '');
      }
    } catch (_) {}

    // Replace relation field with a text field.
    col.fields.removeByName('created_by');
    col.fields.add(new TextField({ name: 'created_by', max: 100 }));
    app.save(col);

    // Restore the creator ids as plain text.
    for (var id in creators) {
      if (!creators[id]) continue;
      try {
        var rec = app.findRecordById('sites', id);
        rec.set('created_by', creators[id]);
        app.save(rec);
      } catch (_) {}
    }
  },
  (app) => {
    // Best-effort: converting text back to a relation is lossy, so no-op.
  },
);
