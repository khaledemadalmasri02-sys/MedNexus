CREATE INDEX IF NOT EXISTS idx_agent_response_cache_hash ON agent_response_cache(agent_id, question_hash);
CREATE INDEX IF NOT EXISTS idx_agent_response_cache_expires ON agent_response_cache(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider_id ON users(oauth_provider_id) WHERE oauth_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_updated ON cards(updated_at);
-- email_verification_tokens and password_reset_tokens indexes are in migration 023
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_usage_user ON agent_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_user ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_deck ON mind_maps(deck_id);
