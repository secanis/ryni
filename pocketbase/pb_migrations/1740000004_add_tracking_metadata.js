/// <reference path="../pb_data/types.d.ts" />

// Adds the expanded tracking metadata fields to the `records` collection:
// language, timezone, page title, and UTM source/medium/campaign.
//
// Existing records keep null/empty values for these — only new traffic
// populates them.

migrate(
  (app) => {
    const records = app.findCollectionByNameOrId('records');
    const fields = [
      new TextField({ name: 'language', max: 100 }),
      new TextField({ name: 'timezone', max: 100 }),
      new TextField({ name: 'title', max: 500 }),
      new TextField({ name: 'utm_source', max: 200 }),
      new TextField({ name: 'utm_medium', max: 200 }),
      new TextField({ name: 'utm_campaign', max: 200 }),
    ];
    let changed = false;
    for (const f of fields) {
      if (records.fields.getByName(f.name)) continue;
      records.fields.add(f);
      changed = true;
    }
    if (changed) app.save(records);
  },
  (app) => {
    // Best-effort rollback: leave the fields in place to avoid data loss.
  },
);
