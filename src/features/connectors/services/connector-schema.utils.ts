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
