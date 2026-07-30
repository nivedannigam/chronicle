const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DOCUMENT_AI_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

interface ServiceAccountKey {
	client_email: string
	private_key: string
	token_uri?: string
}

function base64UrlEncode(input: string | Uint8Array): string {
	const bytes =
		typeof input === 'string' ? new TextEncoder().encode(input) : input
	let binary = ''

	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(
	payload: Record<string, unknown>,
	privateKeyPem: string,
): Promise<string> {
	const header = { alg: 'RS256', typ: 'JWT' }
	const encodedHeader = base64UrlEncode(JSON.stringify(header))
	const encodedPayload = base64UrlEncode(JSON.stringify(payload))
	const unsignedToken = `${encodedHeader}.${encodedPayload}`

	const pemBody = privateKeyPem
		.replace('-----BEGIN PRIVATE KEY-----', '')
		.replace('-----END PRIVATE KEY-----', '')
		.replace(/\s+/g, '')
	const binaryDer = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0))

	const cryptoKey = await crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	)

	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		cryptoKey,
		new TextEncoder().encode(unsignedToken),
	)

	return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function fetchAccessTokenFromServiceAccount(
	serviceAccount: ServiceAccountKey,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000)
	const jwt = await signJwt(
		{
			iss: serviceAccount.client_email,
			sub: serviceAccount.client_email,
			aud: serviceAccount.token_uri ?? TOKEN_URL,
			iat: now,
			exp: now + 3600,
			scope: DOCUMENT_AI_SCOPE,
		},
		serviceAccount.private_key,
	)

	const response = await fetch(serviceAccount.token_uri ?? TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwt,
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Google service account token exchange failed: ${errorText}`,
		)
	}

	const payload = await response.json()

	if (!payload.access_token) {
		throw new Error(
			'Google service account token exchange returned no access_token',
		)
	}

	return payload.access_token as string
}

/** Resolve a Google Cloud access token for Document AI. */
export async function resolveDocumentAiAccessToken(): Promise<string | null> {
	const staticToken = Deno.env.get('GOOGLE_DOCUMENT_AI_ACCESS_TOKEN')?.trim()

	if (staticToken) {
		return staticToken
	}

	const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')?.trim()

	if (!serviceAccountJson) {
		return null
	}

	try {
		const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccountKey

		if (!serviceAccount.client_email || !serviceAccount.private_key) {
			throw new Error(
				'GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key',
			)
		}

		return await fetchAccessTokenFromServiceAccount(serviceAccount)
	} catch (error) {
		throw new Error(
			error instanceof Error
				? error.message
				: 'Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON',
		)
	}
}

export function bytesToBase64(bytes: Uint8Array): string {
	const chunkSize = 8192
	let binary = ''

	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, index + chunkSize)
		binary += String.fromCharCode(...chunk)
	}

	return btoa(binary)
}

export function createCorrelationId(): string {
	return crypto.randomUUID()
}

export function logStructured(event: string, fields: Record<string, unknown>) {
	console.log(
		JSON.stringify({
			service: 'document-ocr',
			event,
			timestamp: new Date().toISOString(),
			...fields,
		}),
	)
}
