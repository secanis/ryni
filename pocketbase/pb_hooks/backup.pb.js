/// <reference path="../pb_data/types.d.ts" />

// RÝNI — scheduled backup.
//
// Registers a cron job when RYNI_BACKUP_INTERVAL is set (a cron expression,
// e.g. "0 4 * * *"). The cron handler runs in the loader VM, so it uses
// $app directly (no require()/executor split needed, unlike route handlers).
//
// The admin UI drives PB's built-in /api/backups HTTP API directly; this
// hook only adds the schedule.

console.log('[ryni-backup] loading');

var cronExpr = '';
try {
    cronExpr = $os.getenv('RYNI_BACKUP_INTERVAL') || '';
} catch (_) {
    cronExpr = '';
}

if (cronExpr) {
    cronAdd('ryni_backup', cronExpr, function () {
        try {
            // Must match PocketBase's backup name rule ^[a-z0-9_-]+\.zip$
            // (see apis/backup_create.go), so lowercase the ISO timestamp.
            var name = 'ryni_' + new Date().toISOString().replace(/[:.]/g, '-').toLowerCase() + '.zip';
            $app.createBackup(name);
            console.log('[ryni-backup] created backup ' + name);
        } catch (e) {
            console.log('[ryni-backup] failed: ' + (e && e.message ? e.message : e));
        }
    });
    console.log('[ryni-backup] scheduled with ' + cronExpr);
} else {
    console.log('[ryni-backup] no schedule (RYNI_BACKUP_INTERVAL unset)');
}
