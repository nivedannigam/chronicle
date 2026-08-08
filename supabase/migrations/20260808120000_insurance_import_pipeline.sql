-- Insurance import pipeline — folder assignments, documents, policies, discovery runs

CREATE TABLE IF NOT EXISTS public.insurance_folder_assignments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
	folder_id UUID NOT NULL REFERENCES public.connector_folders(id) ON DELETE CASCADE,
	family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
	folder_path TEXT,
	discovered_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
	assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (folder_id, family_member_id)
);

CREATE TABLE IF NOT EXISTS public.insurance_documents (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	folder_assignment_id UUID REFERENCES public.insurance_folder_assignments(id) ON DELETE SET NULL,
	registry_id UUID REFERENCES public.connector_document_registry(id) ON DELETE SET NULL,
	file_name TEXT NOT NULL,
	storage_path TEXT,
	document_kind TEXT NOT NULL DEFAULT 'unknown',
	status TEXT NOT NULL DEFAULT 'uploaded',
	parsed_data JSONB,
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_policies (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	policy_number TEXT NOT NULL,
	policy_type TEXT NOT NULL DEFAULT 'other',
	product_name TEXT,
	insurer_id TEXT,
	status TEXT NOT NULL DEFAULT 'active',
	inception_date DATE,
	expiry_date DATE,
	renewal_date DATE,
	sum_insured NUMERIC,
	currency TEXT NOT NULL DEFAULT 'INR',
	source_document_ids UUID[] NOT NULL DEFAULT '{}',
	extraction_method TEXT NOT NULL DEFAULT 'deterministic',
	confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_discovery_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
	mode TEXT NOT NULL DEFAULT 'manual',
	status TEXT NOT NULL DEFAULT 'running',
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ,
	folders_scanned INTEGER NOT NULL DEFAULT 0,
	files_scanned INTEGER NOT NULL DEFAULT 0,
	document_count INTEGER NOT NULL DEFAULT 0,
	duplicate_count INTEGER NOT NULL DEFAULT 0,
	error_message TEXT
);

ALTER TABLE public.connector_document_registry
	ADD COLUMN IF NOT EXISTS insurance_document_id UUID REFERENCES public.insurance_documents(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS target_module TEXT;

CREATE INDEX IF NOT EXISTS insurance_folder_assignments_user_idx
	ON public.insurance_folder_assignments(user_id);

CREATE INDEX IF NOT EXISTS insurance_documents_user_idx
	ON public.insurance_documents(user_id);

CREATE INDEX IF NOT EXISTS insurance_documents_member_idx
	ON public.insurance_documents(family_member_id);

CREATE INDEX IF NOT EXISTS insurance_policies_user_idx
	ON public.insurance_policies(user_id);

CREATE INDEX IF NOT EXISTS insurance_policies_member_idx
	ON public.insurance_policies(family_member_id);

CREATE INDEX IF NOT EXISTS connector_document_registry_target_module_idx
	ON public.connector_document_registry(user_id, target_module);

ALTER TABLE public.insurance_folder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_discovery_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own insurance folder assignments" ON public.insurance_folder_assignments;
CREATE POLICY "Users manage own insurance folder assignments"
	ON public.insurance_folder_assignments FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own insurance documents" ON public.insurance_documents;
CREATE POLICY "Users manage own insurance documents"
	ON public.insurance_documents FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users manage own insurance policies"
	ON public.insurance_policies FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own insurance discovery runs" ON public.insurance_discovery_runs;
CREATE POLICY "Users manage own insurance discovery runs"
	ON public.insurance_discovery_runs FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
