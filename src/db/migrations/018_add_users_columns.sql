-- Migration 018: Add missing columns to users table
-- Adds email_verified, auth_provider, oauth_provider_id, password_hash

ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';
ALTER TABLE users ADD COLUMN oauth_provider_id TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
