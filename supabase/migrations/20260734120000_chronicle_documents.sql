-- Chronicle personal documents — multi-category knowledge domain

CREATE TABLE IF NOT EXISTS public.chronicle_documents (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	category_id TEXT NOT NULL,
	sub_category_id TEXT,
	title TEXT NOT NULL,
	file_name TEXT NOT NULL,
	storage_path TEXT NOT NULL,
	mime_type TEXT NOT NULL DEFAULT 'application/pdf',
	issue_date DATE,
	expiry_date DATE,
	issuer TEXT,
	document_number TEXT,
	tags TEXT[] NOT NULL DEFAULT '{}',
	notes TEXT,
	status TEXT NOT NULL DEFAULT 'active'
		CHECK (status IN ('active', 'archived', 'expired', 'processing', 'failed')),
	source TEXT NOT NULL DEFAULT 'upload'
		CHECK (source IN ('upload', 'google-drive', 'connector')),
	connector_id TEXT,
	external_file_id TEXT,
	connector_registry_id UUID,
	extracted_text TEXT,
	extracted_metadata JSONB NOT NULL DEFAULT '{}',
	knowledge_refs JSONB NOT NULL DEFAULT '[]',
	audit JSONB NOT NULL DEFAULT '{}',
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chronicle_documents_user_id_idx
	ON public.chronicle_documents(user_id);

CREATE INDEX IF NOT EXISTS chronicle_documents_member_idx
	ON public.chronicle_documents(user_id, family_member_id);

CREATE INDEX IF NOT EXISTS chronicle_documents_category_idx
	ON public.chronicle_documents(user_id, category_id);

CREATE INDEX IF NOT EXISTS chronicle_documents_expiry_idx
	ON public.chronicle_documents(user_id, expiry_date)
	WHERE expiry_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chronicle_documents_external_file_idx
	ON public.chronicle_documents(user_id, external_file_id)
	WHERE external_file_id IS NOT NULL;

ALTER TABLE public.chronicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own documents" ON public.chronicle_documents;
CREATE POLICY "Users manage own documents"
	ON public.chronicle_documents
	FOR ALL
	TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'personal-documents',
	'personal-documents',
	false,
	15728640,
	ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
	file_size_limit = EXCLUDED.file_size_limit,
	allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own document files" ON storage.objects;
CREATE POLICY "Users upload own document files"
	ON storage.objects
	FOR INSERT
	TO authenticated
	WITH CHECK (
		bucket_id = 'personal-documents'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);

DROP POLICY IF EXISTS "Users read own document files" ON storage.objects;
CREATE POLICY "Users read own document files"
	ON storage.objects
	FOR SELECT
	TO authenticated
	USING (
		bucket_id = 'personal-documents'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);

DROP POLICY IF EXISTS "Users delete own document files" ON storage.objects;
CREATE POLICY "Users delete own document files"
	ON storage.objects
	FOR DELETE
	TO authenticated
	USING (
		bucket_id = 'personal-documents'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);
