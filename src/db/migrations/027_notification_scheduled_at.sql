-- Migration 027: Scheduled delivery time for reminder notifications
ALTER TABLE notifications ADD COLUMN scheduled_at INTEGER;
