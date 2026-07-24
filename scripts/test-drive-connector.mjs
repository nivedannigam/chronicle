#!/usr/bin/env node
/**
 * Smoke-test drive-connector CORS + health response.
 *
 * Usage:
 *   node scripts/test-drive-connector.mjs
 *   DRIVE_CONNECTOR_URL=http://127.0.0.1:54321/functions/v1/drive-connector node scripts/test-drive-connector.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
const functionUrl =
	process.env.DRIVE_CONNECTOR_URL ??
	(supabaseUrl ? `${supabaseUrl}/functions/v1/drive-connector` : null)

if (!functionUrl || !anonKey) {
	console.error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
	process.exit(1)
}

async function testOptions() {
	const response = await fetch(functionUrl, { method: 'OPTIONS' })
	const headers = Object.fromEntries(response.headers.entries())

	console.log('OPTIONS', response.status)
	console.log('  Access-Control-Allow-Origin:', headers['access-control-allow-origin'] ?? '(missing)')

	if (!headers['access-control-allow-origin']) {
		throw new Error('OPTIONS response is missing CORS headers')
	}
}

async function testPost() {
	const response = await fetch(functionUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: anonKey,
			Authorization: `Bearer ${anonKey}`,
		},
		body: JSON.stringify({ action: 'ping' }),
	})

	const headers = Object.fromEntries(response.headers.entries())
	const body = await response.json()

	console.log('POST', response.status, JSON.stringify(body))

	if (!headers['access-control-allow-origin']) {
		throw new Error('POST response is missing CORS headers')
	}

	if (response.status === 404) {
		throw new Error('Function not deployed (HTTP 404)')
	}

	if (response.status !== 200) {
		throw new Error(`Expected HTTP 200, got ${response.status}`)
	}

	if (body.success !== true || body.message !== 'Drive connector is alive') {
		throw new Error('Unexpected ping response body')
	}
}

async function main() {
	console.log('Testing', functionUrl)
	await testOptions()
	await testPost()
	console.log('drive-connector health check passed')
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
