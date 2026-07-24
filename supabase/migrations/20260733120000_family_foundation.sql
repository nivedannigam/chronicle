-- Foundation 1: Family platform schema

CREATE TABLE IF NOT EXISTS public.family_roles (
	id TEXT PRIMARY KEY,
	label TEXT NOT NULL,
	description TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.family_roles (id, label, description, sort_order, permissions)
VALUES
	('owner', 'Owner', 'Full control of the family account.', 0, '{"manage_family": true, "manage_members": true, "manage_invitations": true, "manage_modules": true}'::jsonb),
	('family_manager', 'Family Manager', 'Can manage members and module settings.', 1, '{"manage_members": true, "manage_invitations": true, "manage_modules": true}'::jsonb),
	('adult', 'Adult', 'Standard family member with module access.', 2, '{"view_modules": true, "edit_own_data": true}'::jsonb),
	('child', 'Child', 'Limited access family member.', 3, '{"view_modules": true}'::jsonb),
	('viewer', 'Viewer', 'Read-only access to shared family data.', 4, '{"view_modules": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.families (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL DEFAULT 'My Family',
	owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS families_owner_user_unique
	ON public.families(owner_user_id);

CREATE INDEX IF NOT EXISTS families_owner_user_idx
	ON public.families(owner_user_id);

ALTER TABLE public.family_members
	ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS role_id TEXT NOT NULL DEFAULT 'adult' REFERENCES public.family_roles(id),
	ADD COLUMN IF NOT EXISTS date_of_birth DATE,
	ADD COLUMN IF NOT EXISTS gender TEXT,
	ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
	ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS family_members_family_idx
	ON public.family_members(family_id);

CREATE INDEX IF NOT EXISTS family_members_status_idx
	ON public.family_members(family_id, status);

CREATE TABLE IF NOT EXISTS public.family_invitations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	role_id TEXT NOT NULL REFERENCES public.family_roles(id),
	invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	status TEXT NOT NULL DEFAULT 'pending',
	token_hash TEXT,
	expires_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT family_invitations_status_check
		CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

CREATE INDEX IF NOT EXISTS family_invitations_family_idx
	ON public.family_invitations(family_id);

CREATE INDEX IF NOT EXISTS family_invitations_email_idx
	ON public.family_invitations(email);

CREATE TABLE IF NOT EXISTS public.member_preferences (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
	selected_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, family_id)
);

CREATE INDEX IF NOT EXISTS member_preferences_user_idx
	ON public.member_preferences(user_id);

ALTER TABLE public.health_reports
	ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_reports_family_member_idx
	ON public.health_reports(user_id, family_member_id);

-- Backfill one family per account owner and link existing members
INSERT INTO public.families (owner_user_id, name)
SELECT DISTINCT user_id, 'My Family'
FROM public.family_members
ON CONFLICT (owner_user_id) DO NOTHING;

UPDATE public.family_members AS member
SET family_id = family.id
FROM public.families AS family
WHERE member.user_id = family.owner_user_id
	AND member.family_id IS NULL;

UPDATE public.family_members
SET role_id = CASE
	WHEN is_account_owner THEN 'owner'
	WHEN relationship = 'self' THEN 'owner'
	ELSE 'adult'
END
WHERE role_id = 'adult'
	AND (is_account_owner OR relationship = 'self');

-- Assign legacy health reports to the account owner member
UPDATE public.health_reports AS report
SET family_member_id = owner_member.id
FROM public.family_members AS owner_member
WHERE report.user_id = owner_member.user_id
	AND owner_member.is_account_owner = true
	AND report.family_member_id IS NULL;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read family roles" ON public.family_roles;
CREATE POLICY "Authenticated users can read family roles"
	ON public.family_roles FOR SELECT TO authenticated
	USING (true);

DROP POLICY IF EXISTS "Owners manage own families" ON public.families;
CREATE POLICY "Owners manage own families"
	ON public.families FOR ALL TO authenticated
	USING (auth.uid() = owner_user_id)
	WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users manage own family invitations" ON public.family_invitations;
CREATE POLICY "Users manage own family invitations"
	ON public.family_invitations FOR ALL TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.families
			WHERE families.id = family_invitations.family_id
				AND families.owner_user_id = auth.uid()
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.families
			WHERE families.id = family_invitations.family_id
				AND families.owner_user_id = auth.uid()
		)
	);

DROP POLICY IF EXISTS "Users manage own member preferences" ON public.member_preferences;
CREATE POLICY "Users manage own member preferences"
	ON public.member_preferences FOR ALL TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
