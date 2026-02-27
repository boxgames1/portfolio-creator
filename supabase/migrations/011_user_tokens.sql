-- Token balance per user (1 token ≈ 1 cent USD; used for AI features)
CREATE TABLE user_token_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History of token credits (purchases) and debits (usage)
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('purchase', 'usage')),
  reference TEXT NOT NULL, -- e.g. 'portfolio_chat', 'ai_suggestions', 'portfolio_sentiment', 'real_estate_estimate'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_token_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own token balance" ON user_token_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own token transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role will do INSERT/UPDATE on user_token_balance and INSERT on token_transactions via Edge Functions
-- No INSERT/UPDATE policy for authenticated users; only backend can modify

CREATE INDEX idx_token_transactions_user_created ON token_transactions(user_id, created_at DESC);

COMMENT ON TABLE user_token_balance IS 'AI token balance per user; deducted by Edge Functions, topped up via Stripe';
COMMENT ON TABLE token_transactions IS 'Audit log of token purchases and usage';
