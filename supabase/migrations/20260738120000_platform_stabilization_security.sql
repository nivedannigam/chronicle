-- Stabilization sprint: family member ownership validation + workflow observability indexes

CREATE OR REPLACE FUNCTION public.family_member_belongs_to_user(
	member_id UUID,
	owner_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
	SELECT member_id IS NULL OR EXISTS (
		SELECT 1
		FROM public.family_members AS member
		WHERE member.id = member_id
			AND member.user_id = owner_user_id
	);
$$;

DROP POLICY IF EXISTS "Users can insert own health reports" ON public.health_reports;
CREATE POLICY "Users can insert own health reports"
	ON public.health_reports
	FOR INSERT
	TO authenticated
	WITH CHECK (
		auth.uid() = user_id
		AND public.family_member_belongs_to_user(family_member_id, auth.uid())
	);

DROP POLICY IF EXISTS "Users can update own health reports" ON public.health_reports;
CREATE POLICY "Users can update own health reports"
	ON public.health_reports
	FOR UPDATE
	TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (
		auth.uid() = user_id
		AND public.family_member_belongs_to_user(family_member_id, auth.uid())
	);

DROP POLICY IF EXISTS "Users can insert own workflow items" ON public.health_workflow_items;
CREATE POLICY "Users can insert own workflow items"
	ON public.health_workflow_items
	FOR INSERT
	TO authenticated
	WITH CHECK (
		auth.uid() = user_id
		AND public.family_member_belongs_to_user(family_member_id, auth.uid())
	);

DROP POLICY IF EXISTS "Users can update own workflow items" ON public.health_workflow_items;
CREATE POLICY "Users can update own workflow items"
	ON public.health_workflow_items
	FOR UPDATE
	TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (
		auth.uid() = user_id
		AND public.family_member_belongs_to_user(family_member_id, auth.uid())
	);

CREATE INDEX IF NOT EXISTS health_workflow_events_correlation_idx
	ON public.health_workflow_events ((payload ->> 'correlationId'))
	WHERE payload ? 'correlationId';

NOTIFY pgrst, 'reload schema';
