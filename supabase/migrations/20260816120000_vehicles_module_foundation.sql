-- Vehicles module foundation — folder assignments, vehicles, documents, facts, timeline

CREATE TABLE IF NOT EXISTS public.vehicle_folder_assignments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
	folder_id UUID NOT NULL REFERENCES public.connector_folders(id) ON DELETE CASCADE,
	family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
	folder_path TEXT,
	discovered_vehicle_names JSONB NOT NULL DEFAULT '[]'::jsonb,
	assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (folder_id, family_member_id)
);

CREATE TABLE IF NOT EXISTS public.vehicles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	display_name TEXT NOT NULL,
	slug TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'car',
	make TEXT,
	model TEXT,
	variant TEXT,
	registration_number TEXT,
	registration_date DATE,
	purchase_date DATE,
	fuel_type TEXT,
	vin TEXT,
	engine_number TEXT,
	color TEXT,
	status TEXT NOT NULL DEFAULT 'active',
	source TEXT NOT NULL DEFAULT 'folder_discovery',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	folder_assignment_id UUID REFERENCES public.vehicle_folder_assignments(id) ON DELETE SET NULL,
	registry_id UUID REFERENCES public.connector_document_registry(id) ON DELETE SET NULL,
	file_name TEXT NOT NULL,
	document_type TEXT NOT NULL DEFAULT 'other',
	document_subtype TEXT,
	status TEXT NOT NULL DEFAULT 'uploaded',
	parsed_data JSONB,
	document_date DATE,
	expiry_date DATE,
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_facts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
	document_id UUID REFERENCES public.vehicle_documents(id) ON DELETE SET NULL,
	fact_key TEXT NOT NULL,
	fact_value TEXT,
	value_date DATE,
	value_number NUMERIC,
	confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5,
	source TEXT NOT NULL DEFAULT 'deterministic',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_timeline_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
	document_id UUID REFERENCES public.vehicle_documents(id) ON DELETE SET NULL,
	event_type TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	event_date DATE NOT NULL,
	evidence_ids TEXT[] NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicle_discovery_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
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
	ADD COLUMN IF NOT EXISTS vehicle_document_id UUID REFERENCES public.vehicle_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vehicle_folder_assignments_user_idx
	ON public.vehicle_folder_assignments(user_id);

CREATE INDEX IF NOT EXISTS vehicles_user_idx
	ON public.vehicles(user_id);

CREATE INDEX IF NOT EXISTS vehicles_member_idx
	ON public.vehicles(family_member_id);

CREATE INDEX IF NOT EXISTS vehicle_documents_user_idx
	ON public.vehicle_documents(user_id);

CREATE INDEX IF NOT EXISTS vehicle_documents_vehicle_idx
	ON public.vehicle_documents(vehicle_id);

CREATE INDEX IF NOT EXISTS vehicle_facts_vehicle_idx
	ON public.vehicle_facts(vehicle_id);

CREATE INDEX IF NOT EXISTS vehicle_timeline_vehicle_idx
	ON public.vehicle_timeline_events(vehicle_id);

ALTER TABLE public.vehicle_folder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_discovery_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own vehicle folder assignments" ON public.vehicle_folder_assignments;
CREATE POLICY "Users manage own vehicle folder assignments"
	ON public.vehicle_folder_assignments FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own vehicles" ON public.vehicles;
CREATE POLICY "Users manage own vehicles"
	ON public.vehicles FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own vehicle documents" ON public.vehicle_documents;
CREATE POLICY "Users manage own vehicle documents"
	ON public.vehicle_documents FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own vehicle facts" ON public.vehicle_facts;
CREATE POLICY "Users manage own vehicle facts"
	ON public.vehicle_facts FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own vehicle timeline events" ON public.vehicle_timeline_events;
CREATE POLICY "Users manage own vehicle timeline events"
	ON public.vehicle_timeline_events FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own vehicle discovery runs" ON public.vehicle_discovery_runs;
CREATE POLICY "Users manage own vehicle discovery runs"
	ON public.vehicle_discovery_runs FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
