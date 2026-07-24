-- Health folder assignments: many-to-many between folders and family members

CREATE TABLE IF NOT EXISTS public.family_member_aliases (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
	alias TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (family_member_id, alias)
);

CREATE TABLE IF NOT EXISTS public.health_folder_assignments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
	folder_id UUID NOT NULL REFERENCES public.connector_folders(id) ON DELETE CASCADE,
	family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
	assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (folder_id, family_member_id)
);

CREATE INDEX IF NOT EXISTS family_member_aliases_member_idx
	ON public.family_member_aliases(family_member_id);

CREATE INDEX IF NOT EXISTS health_folder_assignments_user_idx
	ON public.health_folder_assignments(user_id);

CREATE INDEX IF NOT EXISTS health_folder_assignments_folder_idx
	ON public.health_folder_assignments(folder_id);

CREATE INDEX IF NOT EXISTS health_folder_assignments_member_idx
	ON public.health_folder_assignments(family_member_id);

-- Migrate legacy connector_folders.family_member_id rows
INSERT INTO public.health_folder_assignments (user_id, connector_id, folder_id, family_member_id, assigned_at)
SELECT
	cf.user_id,
	cf.connector_id,
	cf.id,
	cf.family_member_id,
	COALESCE(cf.updated_at, cf.created_at, NOW())
FROM public.connector_folders cf
WHERE cf.family_member_id IS NOT NULL
ON CONFLICT (folder_id, family_member_id) DO NOTHING;

DROP INDEX IF EXISTS public.connector_folders_family_member_unique;

ALTER TABLE public.connector_folders
	DROP COLUMN IF EXISTS family_member_id;

ALTER TABLE public.family_member_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_folder_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own family member aliases" ON public.family_member_aliases;
CREATE POLICY "Users manage own family member aliases"
	ON public.family_member_aliases FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own health folder assignments" ON public.health_folder_assignments;
CREATE POLICY "Users manage own health folder assignments"
	ON public.health_folder_assignments FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
