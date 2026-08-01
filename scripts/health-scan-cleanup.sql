-- Reset all scan/import health data for one user while keeping family setup.
-- Run in Supabase SQL Editor. Replace the UUID with your auth.users.id.
-- Note: this does not remove files from the health-reports storage bucket.

DO $$
DECLARE
  v_user_id UUID := '8da8e8a9-b129-4d23-a2c4-e35e35f40ef7';
BEGIN
  DELETE FROM public.health_metrics WHERE user_id = v_user_id;

  DELETE FROM public.health_workflow_events WHERE user_id = v_user_id;
  DELETE FROM public.health_workflow_items WHERE user_id = v_user_id;

  DELETE FROM public.health_report_processing_queue q
  USING public.health_reports r
  WHERE q.report_id = r.id AND r.user_id = v_user_id;

  DELETE FROM public.health_reports WHERE user_id = v_user_id;

  DELETE FROM public.connector_document_registry WHERE user_id = v_user_id;
  DELETE FROM public.connector_import_queue WHERE user_id = v_user_id;
  DELETE FROM public.connector_sync_runs WHERE user_id = v_user_id;

  DELETE FROM public.health_discovery_runs WHERE user_id = v_user_id;
  DELETE FROM public.health_knowledge_graphs WHERE user_id = v_user_id;
END $$;

-- Kept: families, family_members, family_roles, family_invitations,
-- member_preferences, family_member_aliases, health_folder_assignments,
-- connector_connections, connector_folders, connector_oauth_tokens.
