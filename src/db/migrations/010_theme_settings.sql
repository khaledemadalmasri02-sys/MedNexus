ALTER TABLE user_settings ADD COLUMN theme_id TEXT NOT NULL DEFAULT 'midnight';
ALTER TABLE user_settings ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE user_settings ADD COLUMN ambient_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN custom_cursor_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN ripples_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN animation_speed INTEGER NOT NULL DEFAULT 100;
ALTER TABLE user_settings ADD COLUMN reduce_motion INTEGER NOT NULL DEFAULT 0;
