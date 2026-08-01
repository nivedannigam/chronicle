import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

function loadEnvFile(filePath) {
	if (!existsSync(filePath)) {
		return
	}

	for (const line of readFileSync(filePath, 'utf8').split('\n')) {
		const trimmed = line.trim()

		if (!trimmed || trimmed.startsWith('#')) {
			continue
		}

		const separatorIndex = trimmed.indexOf('=')

		if (separatorIndex === -1) {
			continue
		}

		const key = trimmed.slice(0, separatorIndex).trim()
		const value = trimmed.slice(separatorIndex + 1).trim()

		if (!(key in process.env)) {
			process.env[key] = value
		}
	}
}

loadEnvFile(resolve(rootDir, '.env.local'))
loadEnvFile(resolve(rootDir, '.env'))

function resolveDatabaseUrl() {
	if (process.env.SUPABASE_DB_URL) {
		return process.env.SUPABASE_DB_URL
	}

	const password = process.env.SUPABASE_DB_PASSWORD

	if (!password) {
		throw new Error(
			'Missing database credentials. Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local',
		)
	}

	const projectRef =
		process.env.SUPABASE_PROJECT_REF ??
		process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

	if (!projectRef) {
		throw new Error(
			'Could not determine Supabase project ref from VITE_SUPABASE_URL',
		)
	}

	return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
}

const migrationFile =
	process.argv[2] ?? '20260740120000_health_metrics.sql'

async function main() {
	const migrationPath = resolve(rootDir, 'supabase/migrations', migrationFile)

	if (!existsSync(migrationPath)) {
		throw new Error(`Migration not found: ${migrationPath}`)
	}

	const sql = readFileSync(migrationPath, 'utf8')
	const databaseUrl = resolveDatabaseUrl()
	const client = new pg.Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: false },
	})

	await client.connect()

	try {
		await client.query('BEGIN')
		await client.query(sql)
		await client.query('COMMIT')
		console.log(`Applied migration ${migrationFile} successfully.`)
	} catch (error) {
		await client.query('ROLLBACK')
		throw error
	} finally {
		await client.end()
	}

	const verifyClient = new pg.Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: false },
	})

	await verifyClient.connect()

	try {
		const table = await verifyClient.query(
			`SELECT table_name
			 FROM information_schema.tables
			 WHERE table_schema = 'public'
			   AND table_name = 'health_metrics'`,
		)

		if (table.rows.length === 0) {
			throw new Error(
				'health_metrics table was not created. Check migration SQL.',
			)
		}

		console.log('Verified public.health_metrics exists.')

		const policies = await verifyClient.query(
			`SELECT policyname
			 FROM pg_policies
			 WHERE schemaname = 'public'
			   AND tablename = 'health_metrics'
			 ORDER BY policyname`,
		)

		console.log('RLS policies on health_metrics:')
		for (const row of policies.rows) {
			console.log(`- ${row.policyname}`)
		}

		console.log(
			'\nPostgREST schema cache refreshes automatically; if queries still fail, restart the Supabase project or wait ~1 minute.',
		)
	} finally {
		await verifyClient.end()
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
