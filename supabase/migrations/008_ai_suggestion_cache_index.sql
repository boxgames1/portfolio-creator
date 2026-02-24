-- Index for fetching latest AI suggestion by user
CREATE INDEX idx_ai_suggestion_cache_user_created
  ON ai_suggestion_cache (user_id, created_at DESC);
