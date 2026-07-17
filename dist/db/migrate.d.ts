import type Database from "better-sqlite3";
export interface Migration {
    version: number;
    name: string;
    up: string;
}
export declare function migrate(db: Database.Database, migrations: Migration[]): void;
export declare function loadMigrations(migrationsDir: string): Migration[];
//# sourceMappingURL=migrate.d.ts.map