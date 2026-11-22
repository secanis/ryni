/// <reference path="../pb_data/types.d.ts" />

// Adds the optional free-form `labels` list to the `sites` collection.
//
//   labels — JSON array of short, human-typed strings (e.g. ["production",
//            "customer-acme"]) used to tag sites in the UI. Shape is
//            normalized in the frontend (trim / dedupe / cap); the field
//            itself only stores an array. An empty/missing value means
//            "no labels" and needs no backfill.
//
// Idempotent: the field is only added when missing.

migrate(
  (app) => {
    const sites = app.findCollectionByNameOrId('sites');
    if (sites.fields.getByName('labels')) return;
    sites.fields.add(new JSONField({ name: 'labels', maxSize: 10000 }));
    app.save(sites);
  },
  (app) => {
    // Best-effort rollback: leave the field in place to avoid data loss.
  },
);
