-- Included in 20260728120000_connector_connections_foundation.sql
-- Secure OAuth token storage for connectors (service-role access only)

CREATE TABLE IF NOT EXISTS public.connector_oauth_tokens (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	access_token TEXT,
	refresh_token TEXT NOT NULL,
	token_expires_at TIMESTAMPTZ,
	scopes TEXT[] NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, connector_id)
);

CREATE INDEX IF NOT EXISTS connector_oauth_tokens_user_connector_idx
	ON public.connector_oauth_tokens(user_id, connector_id);

ALTER TABLE public.connector_oauth_tokens ENABLE ROW LEVEL SECURITY;
