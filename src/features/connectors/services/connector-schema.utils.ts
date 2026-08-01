const MISSING_SCHEMA_CODES = new Set(['PGRST205', '42P01'])

export function isMissingSchemaError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}

	const code = 'code' in error ? String(error.code) : ''
	const message = 'message' in error ? String(error.message) : ''

	return (
		MISSING_SCHEMA_CODES.has(code) ||
		message.includes('schema cache') ||
		message.includes('does not exist')
	)
}

export function missingSchemaMessage(): string {
	return 'Connector database tables are not set up yet. Run the connector migration in Supabase (see supabase/CONNECTOR_DB_SETUP.md).'
}

export function missingHealthMetricsMessage(): string {
	return 'The health_metrics table is missing. Apply supabase/migrations/20260740120000_health_metrics.sql (run pnpm db:health-metrics or paste the migration in the Supabase SQL editor).'
}
