ALTER TABLE public.vehicle_documents
	ADD COLUMN IF NOT EXISTS storage_path TEXT;
