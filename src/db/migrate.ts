import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: string;
}

const MIGRATION_TABLE = `
  CREATE TABLE IF NOT EXISTS __migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  );
`;

function getCurrentVersion(db: Database.Database): number {
  db.exec(MIGRATION_TABLE);
  const row = db.prepare("SELECT MAX(version) as version FROM __migrations").get() as { version: number | null } | undefined;
  return row?.version ?? 0;
}

export function migrate(db: Database.Database, migrations: Migration[]): void {
  const currentVersion = getCurrentVersion(db);
  const pending = migrations.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      db.exec(migration.up);
      db.prepare("INSERT INTO __migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        Date.now(),
      );
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function loadMigrations(migrationsDir: string): Migration[] {
  if (!fs.existsSync(migrationsDir)) return [];
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  return files.map(file => {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) throw new Error(`Invalid migration filename: ${file}`);
    return {
      version: parseInt(match[1], 10),
      name: match[2],
      up: fs.readFileSync(path.join(migrationsDir, file), "utf-8"),
    };
  });
}
