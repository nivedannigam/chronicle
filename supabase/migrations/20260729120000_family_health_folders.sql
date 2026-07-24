-- Family members + health folder mappings

CREATE TABLE IF NOT EXISTS public.family_members (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	display_name TEXT NOT NULL,
	relationship TEXT NOT NULL DEFAULT 'other',
	is_account_owner BOOLEAN NOT NULL DEFAULT false,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.connector_folders
	ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS family_members_user_idx
	ON public.family_members(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS connector_folders_family_member_unique
	ON public.connector_folders(user_id, connector_id, family_member_id)
	WHERE family_member_id IS NOT NULL;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own family members" ON public.family_members;
CREATE POLICY "Users manage own family members"
	ON public.family_members FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
