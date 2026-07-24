-- Connector database foundation (Google Drive OAuth + future sync)
-- Standalone: does not require health_reports or other app tables.

CREATE TABLE IF NOT EXISTS public.connector_connections (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'disconnected',
	scopes TEXT[] NOT NULL DEFAULT '{}',
	connected_at TIMESTAMPTZ,
	last_sync_at TIMESTAMPTZ,
	last_error TEXT,
	settings JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, connector_id)
);

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

CREATE TABLE IF NOT EXISTS public.connector_folders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	external_folder_id TEXT NOT NULL,
	display_name TEXT NOT NULL,
	alias TEXT NOT NULL,
	enabled BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, connector_id, external_folder_id)
);

CREATE TABLE IF NOT EXISTS public.connector_document_registry (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	external_file_id TEXT NOT NULL,
	file_name TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	checksum TEXT NOT NULL,
	file_size BIGINT NOT NULL DEFAULT 0,
	external_created_at TIMESTAMPTZ,
	external_modified_at TIMESTAMPTZ,
	folder_id UUID REFERENCES public.connector_folders(id) ON DELETE SET NULL,
	imported_at TIMESTAMPTZ,
	last_sync_at TIMESTAMPTZ,
	registry_status TEXT NOT NULL DEFAULT 'discovered',
	import_status TEXT NOT NULL DEFAULT 'discovered',
	health_report_id UUID,
	knowledge_graph_status TEXT,
	error_message TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, connector_id, external_file_id)
);

CREATE TABLE IF NOT EXISTS public.connector_import_queue (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	registry_id UUID NOT NULL REFERENCES public.connector_document_registry(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'queued',
	attempts INTEGER NOT NULL DEFAULT 0,
	started_at TIMESTAMPTZ,
	completed_at TIMESTAMPTZ,
	error_message TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connector_sync_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL,
	mode TEXT NOT NULL DEFAULT 'manual',
	status TEXT NOT NULL DEFAULT 'pending',
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ,
	files_discovered INTEGER NOT NULL DEFAULT 0,
	files_queued INTEGER NOT NULL DEFAULT 0,
	files_imported INTEGER NOT NULL DEFAULT 0,
	files_failed INTEGER NOT NULL DEFAULT 0,
	error_message TEXT,
	debug_log JSONB NOT NULL DEFAULT '[]'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS connector_connections_user_idx
	ON public.connector_connections(user_id);

CREATE INDEX IF NOT EXISTS connector_oauth_tokens_user_connector_idx
	ON public.connector_oauth_tokens(user_id, connector_id);

CREATE INDEX IF NOT EXISTS connector_folders_user_connector_idx
	ON public.connector_folders(user_id, connector_id);

CREATE INDEX IF NOT EXISTS connector_document_registry_user_connector_idx
	ON public.connector_document_registry(user_id, connector_id);

CREATE INDEX IF NOT EXISTS connector_document_registry_checksum_idx
	ON public.connector_document_registry(user_id, connector_id, checksum);

CREATE INDEX IF NOT EXISTS connector_import_queue_status_idx
	ON public.connector_import_queue(user_id, status);

CREATE INDEX IF NOT EXISTS connector_sync_runs_user_connector_idx
	ON public.connector_sync_runs(user_id, connector_id, started_at DESC);

ALTER TABLE public.connector_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_document_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_import_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own connector connections" ON public.connector_connections;
CREATE POLICY "Users manage own connector connections"
	ON public.connector_connections FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own connector folders" ON public.connector_folders;
CREATE POLICY "Users manage own connector folders"
	ON public.connector_folders FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own connector registry" ON public.connector_document_registry;
CREATE POLICY "Users manage own connector registry"
	ON public.connector_document_registry FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own connector import queue" ON public.connector_import_queue;
CREATE POLICY "Users manage own connector import queue"
	ON public.connector_import_queue FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own connector sync runs" ON public.connector_sync_runs;
CREATE POLICY "Users manage own connector sync runs"
	ON public.connector_sync_runs FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- connector_oauth_tokens: RLS enabled with no client policies (service-role access only)

NOTIFY pgrst, 'reload schema';
