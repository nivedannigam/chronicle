import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
	computeTokenExpiresAt,
	GoogleAuthExpiredError,
	GOOGLE_AUTH_EXPIRED_MESSAGE,
	isGoogleAuthExpiredError,
	isGoogleUnauthorizedResponse,
	logOAuth,
	resolveGoogleAccessToken,
} from './google-oauth-token.ts'

const corsHeaders: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Max-Age': '86400',
}

const CONNECTOR_ID = 'google-drive'
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
const FOLDER_MIME = 'application/vnd.google-apps.folder'

interface DriveConnectorRequest {
	action?:
		| 'connect'
		| 'browse'
		| 'discover'
		| 'import'
		| 'download'
		| 'disconnect'
		| 'ping'
	userId?: string
	accessToken?: string
	refreshToken?: string | null
	scopes?: string[]
	folderId?: string
	folderIds?: string[]
	pageToken?: string | null
	recursive?: boolean
	modifiedSince?: string | null
	externalFileId?: string
	fileName?: string
}

interface DiscoveryDocument {
	fileId: string
	name: string
	mimeType: string
	modifiedTime: string
	size: string
	folderId: string
	folderPath: string
	confidence: number
	reason: string[]
}

interface GoogleUserInfo {
	email?: string
}

interface GoogleTokenResponse {
	access_token: string
	expires_in: number
}

interface GoogleDriveFile {
	id: string
	name: string
	mimeType: string
	modifiedTime?: string
	createdTime?: string
	size?: string
	iconLink?: string
	parents?: string[]
}

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	})
}

function requireEnv(name: string): string {
	const value = Deno.env.get(name)

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

function getServiceClient() {
	return createClient(
		requireEnv('SUPABASE_URL'),
		requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
	)
}

async function parseRequestBody(
	request: Request,
): Promise<DriveConnectorRequest> {
	const contentType = request.headers.get('content-type') ?? ''

	if (!contentType.includes('application/json')) {
		return { action: 'ping' }
	}

	const body = await request.json()

	if (!body || typeof body !== 'object') {
		throw new Error('Invalid request body')
	}

	return body as DriveConnectorRequest
}

async function verifyGoogleAccessToken(accessToken: string): Promise<void> {
	const response = await fetch(
		`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
	)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Google access token verification failed: ${errorText}`)
	}

	const tokenInfo = (await response.json()) as { scope?: string }

	if (
		!tokenInfo.scope?.includes('drive.readonly') &&
		!tokenInfo.scope?.includes('drive')
	) {
		throw new Error('Google access token is missing Drive read scope')
	}
}

async function fetchGoogleUserEmail(
	accessToken: string,
): Promise<string | null> {
	const response = await fetch(
		'https://www.googleapis.com/oauth2/v2/userinfo',
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	)

	if (!response.ok) {
		return null
	}

	const userInfo = (await response.json()) as GoogleUserInfo
	return userInfo.email ?? null
}

async function loadConnectorConnection(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
) {
	const { data, error } = await serviceClient
		.from('connector_connections')
		.select('status, connector_id, scopes, connected_at, last_error')
		.eq('user_id', userId)
		.eq('connector_id', CONNECTOR_ID)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data
}

async function loadOAuthTokens(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
) {
	const { data, error } = await serviceClient
		.from('connector_oauth_tokens')
		.select('access_token, refresh_token, token_expires_at, scopes')
		.eq('user_id', userId)
		.eq('connector_id', CONNECTOR_ID)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data
}

async function refreshGoogleAccessToken(
	refreshToken: string,
): Promise<GoogleTokenResponse> {
	const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
	const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

	if (!clientId || !clientSecret) {
		throw new Error('Google OAuth credentials are not configured on the server')
	}

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Google token refresh failed: ${errorText}`)
	}

	return (await response.json()) as GoogleTokenResponse
}

async function persistOAuthAccessToken(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	input: { accessToken: string; expiresAt: string; refreshToken?: string },
) {
	const updatePayload: Record<string, string> = {
		access_token: input.accessToken,
		token_expires_at: input.expiresAt,
		updated_at: new Date().toISOString(),
	}

	if (input.refreshToken) {
		updatePayload.refresh_token = input.refreshToken
	}

	const { error } = await serviceClient
		.from('connector_oauth_tokens')
		.update(updatePayload)
		.eq('user_id', userId)
		.eq('connector_id', CONNECTOR_ID)

	if (error) {
		throw new Error(error.message)
	}
}

async function getValidAccessToken(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
): Promise<string> {
	return resolveGoogleAccessToken({
		userId,
		loadConnection: () => loadConnectorConnection(serviceClient, userId),
		loadTokens: () => loadOAuthTokens(serviceClient, userId),
		refreshAccessToken: refreshGoogleAccessToken,
		persistAccessToken: (input) =>
			persistOAuthAccessToken(serviceClient, userId, input),
	})
}

async function driveApiGet<T>(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	path: string,
	params: Record<string, string> = {},
): Promise<T> {
	const accessToken = await getValidAccessToken(serviceClient, userId)
	return driveApiGetWithToken(serviceClient, userId, accessToken, path, params)
}

async function driveApiGetWithToken<T>(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	accessToken: string,
	path: string,
	params: Record<string, string> = {},
	retryOnUnauthorized = true,
): Promise<T> {
	const url = new URL(`https://www.googleapis.com/drive/v3/${path}`)

	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value)
	}

	logOAuth('google_api_request', {
		userId,
		method: 'GET',
		path,
	})

	const response = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${accessToken}` },
	})

	logOAuth('google_api_response', {
		userId,
		path,
		status: response.status,
	})

	if (response.ok) {
		return (await response.json()) as T
	}

	const errorText = await response.text()

	if (
		retryOnUnauthorized &&
		isGoogleUnauthorizedResponse(response.status, errorText)
	) {
		logOAuth('google_api_unauthorized_retry', { userId, path })

		const existingTokens = await loadOAuthTokens(serviceClient, userId)

		if (!existingTokens?.refresh_token) {
			throw new GoogleAuthExpiredError()
		}

		const refreshed = await refreshGoogleAccessToken(
			existingTokens.refresh_token,
		)
		const expiresAt = computeTokenExpiresAt(refreshed.expires_in)

		await persistOAuthAccessToken(serviceClient, userId, {
			accessToken: refreshed.access_token,
			expiresAt,
		})

		return driveApiGetWithToken(
			serviceClient,
			userId,
			refreshed.access_token,
			path,
			params,
			false,
		)
	}

	if (isGoogleUnauthorizedResponse(response.status, errorText)) {
		throw new GoogleAuthExpiredError()
	}

	throw new Error(`Google Drive API failed: ${errorText}`)
}

async function getFolderContext(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	folderId: string,
) {
	if (folderId === 'root') {
		return {
			currentFolderId: 'root',
			currentFolderName: 'My Drive',
			parentFolderId: null as string | null,
		}
	}

	const folder = await driveApiGet<GoogleDriveFile>(
		serviceClient,
		userId,
		`files/${folderId}`,
		{
			fields: 'id,name,parents',
			supportsAllDrives: 'true',
		},
	)

	return {
		currentFolderId: folder.id,
		currentFolderName: folder.name,
		parentFolderId: folder.parents?.[0] ?? 'root',
	}
}

async function handleBrowse(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	body: DriveConnectorRequest,
) {
	const folderId = body.folderId ?? 'root'
	const context = await getFolderContext(serviceClient, userId, folderId)

	const listResult = await driveApiGet<{
		files: GoogleDriveFile[]
		nextPageToken?: string
	}>(serviceClient, userId, 'files', {
		q: `'${folderId}' in parents and trashed=false`,
		fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,iconLink)',
		orderBy: 'folder,name_natural',
		pageSize: '100',
		supportsAllDrives: 'true',
		includeItemsFromAllDrives: 'true',
		...(body.pageToken ? { pageToken: body.pageToken } : {}),
	})

	const folders = listResult.files
		.filter((file) => file.mimeType === FOLDER_MIME)
		.map((file) => ({
			id: file.id,
			name: file.name,
			parentId: folderId,
		}))

	const files = listResult.files
		.filter((file) => file.mimeType !== FOLDER_MIME)
		.map((file) => ({
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			modifiedAt: file.modifiedTime ?? new Date().toISOString(),
			iconUrl: file.iconLink ?? null,
		}))

	return json({
		success: true,
		folders,
		files,
		currentFolderId: context.currentFolderId,
		currentFolderName: context.currentFolderName,
		parentFolderId: context.parentFolderId,
		nextPageToken: listResult.nextPageToken ?? null,
	})
}

function logDiscovery(event: string, payload: Record<string, unknown>) {
	console.log(JSON.stringify({ service: 'drive-connector', event, ...payload }))
}

const MEDICAL_KEYWORDS = [
	'blood',
	'cbc',
	'mri',
	'ct',
	'lipid',
	'sugar',
	'vitamin',
	'hba1c',
	'health',
	'report',
	'prescription',
	'hospital',
	'lab',
	'diagnostic',
	'pathology',
	'thyroid',
	'cholesterol',
	'glucose',
	'hemoglobin',
	'urine',
	'xray',
	'x-ray',
	'ultrasound',
	'ecg',
	'ekg',
	'scan',
	'biopsy',
	'serum',
	'plasma',
	'creatinine',
	'tsh',
	'esr',
	'ggt',
	'sgot',
	'sgpt',
	'ldl',
	'hdl',
	'triglyceride',
]

const REVIEW_KEYWORDS = ['invoice', 'bill', 'receipt', 'payment', 'statement']

function scoreMedicalDocument(input: {
	fileName: string
	mimeType: string
	folderPath: string
}): { confidence: number; reason: string[] } {
	const normalizedName = input.fileName.toLowerCase()
	const normalizedPath = input.folderPath.toLowerCase()
	const searchable = `${normalizedName} ${normalizedPath}`
	const mime = input.mimeType.toLowerCase()

	const matchedKeywords = MEDICAL_KEYWORDS.filter((keyword) =>
		searchable.includes(keyword),
	)
	const folderKeywords = MEDICAL_KEYWORDS.filter((keyword) =>
		normalizedPath.includes(keyword),
	)
	const allKeywords = [...new Set([...matchedKeywords, ...folderKeywords])]

	let confidence = 0
	const reasons: string[] = []

	if (mime === 'application/pdf') {
		confidence += 15
		reasons.push('PDF document')
	} else if (mime.startsWith('image/')) {
		confidence += 10
		reasons.push('Medical image format')
	}

	for (const keyword of allKeywords) {
		confidence += keyword.length >= 5 ? 12 : 8
		const source = normalizedName.includes(keyword) ? 'Filename' : 'Folder path'
		reasons.push(`${source} contains ${keyword.toUpperCase()}`)
	}

	if (REVIEW_KEYWORDS.some((keyword) => searchable.includes(keyword))) {
		confidence = Math.max(confidence - 20, 25)
		reasons.push('Contains billing or invoice terms')
	}

	if (reasons.length === 0) {
		reasons.push('No strong medical signals')
	}

	return { confidence: Math.min(confidence, 99), reason: reasons }
}

function isAllowedMedicalMime(mimeType: string): boolean {
	const mime = mimeType.toLowerCase()
	return (
		mime === 'application/pdf' ||
		mime === 'image/jpeg' ||
		mime === 'image/png' ||
		mime === 'image/jpg'
	)
}

async function listFolderChildren(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	folderId: string,
	pageToken?: string | null,
) {
	return driveApiGet<{
		files: GoogleDriveFile[]
		nextPageToken?: string
	}>(serviceClient, userId, 'files', {
		q: `'${folderId}' in parents and trashed=false`,
		fields:
			'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,size,parents)',
		orderBy: 'folder,name_natural',
		pageSize: '100',
		supportsAllDrives: 'true',
		includeItemsFromAllDrives: 'true',
		...(pageToken ? { pageToken } : {}),
	})
}

async function getFolderName(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	folderId: string,
): Promise<string> {
	if (folderId === 'root') {
		return 'My Drive'
	}

	const folder = await driveApiGet<GoogleDriveFile>(
		serviceClient,
		userId,
		`files/${folderId}`,
		{
			fields: 'name',
			supportsAllDrives: 'true',
		},
	)

	return folder.name
}

async function collectFilesRecursive(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	rootFolderIds: string[],
	modifiedSince: string | null,
): Promise<{
	items: Array<{
		externalFileId: string
		fileName: string
		mimeType: string
		fileSize: number
		checksum: string
		externalCreatedAt: string
		externalModifiedAt: string
		folderExternalId: string
		folderPath: string
	}>
	foldersScanned: number
}> {
	const items: Array<{
		externalFileId: string
		fileName: string
		mimeType: string
		fileSize: number
		checksum: string
		externalCreatedAt: string
		externalModifiedAt: string
		folderExternalId: string
		folderPath: string
	}> = []

	const queue: Array<{ folderId: string; folderPath: string }> = []

	for (const folderId of rootFolderIds) {
		const name = await getFolderName(serviceClient, userId, folderId)
		queue.push({ folderId, folderPath: name })
	}

	const visited = new Set<string>()
	let foldersScanned = 0

	while (queue.length > 0) {
		const current = queue.shift()!

		if (visited.has(current.folderId)) {
			continue
		}

		visited.add(current.folderId)
		foldersScanned += 1

		let pageToken: string | undefined

		do {
			const listResult = await driveApiGet<{
				files: GoogleDriveFile[]
				nextPageToken?: string
			}>(serviceClient, userId, 'files', {
				q: `'${current.folderId}' in parents and trashed=false`,
				fields:
					'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,size,parents)',
				orderBy: 'folder,name_natural',
				pageSize: '100',
				supportsAllDrives: 'true',
				includeItemsFromAllDrives: 'true',
				...(pageToken ? { pageToken } : {}),
			})

			for (const file of listResult.files) {
				if (file.mimeType === FOLDER_MIME) {
					queue.push({
						folderId: file.id,
						folderPath: `${current.folderPath}/${file.name}`,
					})
					continue
				}

				if (!isAllowedMedicalMime(file.mimeType)) {
					continue
				}

				const modifiedAt = file.modifiedTime ?? new Date().toISOString()

				if (
					modifiedSince &&
					Date.parse(modifiedAt) <= Date.parse(modifiedSince)
				) {
					continue
				}

				const createdAt = file.createdTime ?? modifiedAt
				const fileSize = Number(file.size ?? 0)

				items.push({
					externalFileId: file.id,
					fileName: file.name,
					mimeType: file.mimeType,
					fileSize,
					checksum: `${file.id}:${modifiedAt}:${fileSize}`,
					externalCreatedAt: createdAt,
					externalModifiedAt: modifiedAt,
					folderExternalId: current.folderId,
					folderPath: current.folderPath,
				})
			}

			pageToken = listResult.nextPageToken
		} while (pageToken)
	}

	return { items, foldersScanned }
}

function mapRawFilesToDocuments(
	rawItems: Array<{
		externalFileId: string
		fileName: string
		mimeType: string
		fileSize: number
		checksum: string
		externalCreatedAt: string
		externalModifiedAt: string
		folderExternalId: string
		folderPath: string
	}>,
): DiscoveryDocument[] {
	return rawItems.map((item) => {
		const score = scoreMedicalDocument({
			fileName: item.fileName,
			mimeType: item.mimeType,
			folderPath: item.folderPath,
		})

		return {
			fileId: item.externalFileId,
			name: item.fileName,
			mimeType: item.mimeType,
			modifiedTime: item.externalModifiedAt,
			size: String(item.fileSize),
			folderId: item.folderExternalId,
			folderPath: item.folderPath,
			confidence: score.confidence,
			reason: score.reason,
		}
	})
}

async function handleDiscover(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	body: DriveConnectorRequest,
) {
	const startedAt = Date.now()
	const folderIds = body.folderIds ?? []
	const recursive = body.recursive ?? true
	const modifiedSince = body.modifiedSince ?? null

	logDiscovery('discovery_start', {
		userId,
		folderIds,
		recursive,
		modifiedSince,
		pageToken: body.pageToken ?? null,
	})

	if (folderIds.length === 0) {
		return json(
			{
				success: false,
				error: 'folderIds is required and must contain at least one folder ID',
			},
			400,
		)
	}

	try {
		let rawItems: Array<{
			externalFileId: string
			fileName: string
			mimeType: string
			fileSize: number
			checksum: string
			externalCreatedAt: string
			externalModifiedAt: string
			folderExternalId: string
			folderPath: string
		}> = []
		let foldersScanned = 0
		let nextPageToken: string | null = null

		if (recursive) {
			const result = await collectFilesRecursive(
				serviceClient,
				userId,
				folderIds,
				modifiedSince,
			)
			rawItems = result.items
			foldersScanned = result.foldersScanned
		} else {
			for (const folderId of folderIds) {
				foldersScanned += 1
				const folderPath = await getFolderName(serviceClient, userId, folderId)
				const listResult = await listFolderChildren(
					serviceClient,
					userId,
					folderId,
					body.pageToken ?? null,
				)
				nextPageToken = listResult.nextPageToken ?? null

				for (const file of listResult.files) {
					if (
						file.mimeType === FOLDER_MIME ||
						!isAllowedMedicalMime(file.mimeType)
					) {
						continue
					}

					const modifiedAt = file.modifiedTime ?? new Date().toISOString()

					if (
						modifiedSince &&
						Date.parse(modifiedAt) <= Date.parse(modifiedSince)
					) {
						continue
					}

					const createdAt = file.createdTime ?? modifiedAt
					const fileSize = Number(file.size ?? 0)

					rawItems.push({
						externalFileId: file.id,
						fileName: file.name,
						mimeType: file.mimeType,
						fileSize,
						checksum: `${file.id}:${modifiedAt}:${fileSize}`,
						externalCreatedAt: createdAt,
						externalModifiedAt: modifiedAt,
						folderExternalId: folderId,
						folderPath,
					})
				}
			}
		}

		const documents = mapRawFilesToDocuments(rawItems)
		const medicalCandidates = documents.filter(
			(doc) => doc.confidence >= 30,
		).length
		const executionTimeMs = Date.now() - startedAt

		logDiscovery('discovery_complete', {
			userId,
			foldersScanned,
			filesScanned: documents.length,
			medicalCandidates,
			executionTimeMs,
		})

		// Legacy items shape for existing frontend discovery engine
		const items = rawItems.map((item) => {
			const doc = documents.find(
				(entry) => entry.fileId === item.externalFileId,
			)
			return {
				externalFileId: item.externalFileId,
				fileName: item.fileName,
				mimeType: item.mimeType,
				fileSize: item.fileSize,
				checksum: item.checksum,
				externalCreatedAt: item.externalCreatedAt,
				externalModifiedAt: item.externalModifiedAt,
				folderExternalId: item.folderExternalId,
				folderPath: item.folderPath,
				confidence: doc?.confidence ?? 0,
				reason: doc?.reason ?? [],
			}
		})

		return json({
			success: true,
			documents,
			items,
			hasMore: nextPageToken != null,
			nextPageToken,
		})
	} catch (error) {
		if (isGoogleAuthExpiredError(error)) {
			logDiscovery('discovery_auth_expired', { userId })

			return json({ success: false, error: GOOGLE_AUTH_EXPIRED_MESSAGE }, 401)
		}

		const message = error instanceof Error ? error.message : 'Discovery failed'

		logDiscovery('discovery_error', {
			userId,
			error: message,
			executionTimeMs: Date.now() - startedAt,
		})

		return json({ success: false, error: message }, 500)
	}
}

async function sha256Hex(data: Uint8Array): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	return [...new Uint8Array(hashBuffer)]
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

async function fetchDriveFileBytes(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	accessToken: string,
	externalFileId: string,
	mimeType: string,
	retryOnUnauthorized = true,
): Promise<Uint8Array> {
	const downloadUrl = mimeType.startsWith('application/vnd.google-apps')
		? `https://www.googleapis.com/drive/v3/files/${externalFileId}/export?mimeType=application/pdf`
		: `https://www.googleapis.com/drive/v3/files/${externalFileId}?alt=media`

	const response = await fetch(downloadUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	})

	if (response.ok) {
		return new Uint8Array(await response.arrayBuffer())
	}

	const errorText = await response.text()

	if (
		retryOnUnauthorized &&
		isGoogleUnauthorizedResponse(response.status, errorText)
	) {
		logOAuth('download_unauthorized_retry', { userId, externalFileId })

		const existingTokens = await loadOAuthTokens(serviceClient, userId)

		if (!existingTokens?.refresh_token) {
			throw new GoogleAuthExpiredError()
		}

		const refreshed = await refreshGoogleAccessToken(
			existingTokens.refresh_token,
		)
		const expiresAt = computeTokenExpiresAt(refreshed.expires_in)

		await persistOAuthAccessToken(serviceClient, userId, {
			accessToken: refreshed.access_token,
			expiresAt,
		})

		return fetchDriveFileBytes(
			serviceClient,
			userId,
			refreshed.access_token,
			externalFileId,
			mimeType,
			false,
		)
	}

	if (isGoogleUnauthorizedResponse(response.status, errorText)) {
		throw new GoogleAuthExpiredError()
	}

	throw new Error(
		`Google Drive download failed (${response.status}): ${errorText.slice(0, 200)}`,
	)
}

async function handleDownload(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	body: DriveConnectorRequest,
) {
	if (!body.externalFileId || !body.fileName) {
		return json(
			{ success: false, error: 'Missing externalFileId or fileName' },
			400,
		)
	}

	logOAuth('download_started', {
		userId,
		externalFileId: body.externalFileId,
		fileName: body.fileName,
	})

	try {
		const accessToken = await getValidAccessToken(serviceClient, userId)

		const meta = await driveApiGet<GoogleDriveFile>(
			serviceClient,
			userId,
			`files/${body.externalFileId}`,
			{
				fields: 'id,name,mimeType,size',
				supportsAllDrives: 'true',
			},
		)

		const fileBytes = await fetchDriveFileBytes(
			serviceClient,
			userId,
			accessToken,
			body.externalFileId,
			meta.mimeType,
		)

		const checksum = await sha256Hex(fileBytes)
		const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
		const storagePath = `${userId}/${Date.now()}-${safeName}`

		const { error: uploadError } = await serviceClient.storage
			.from('health-reports')
			.upload(storagePath, fileBytes, {
				contentType: meta.mimeType.startsWith('application/vnd.google-apps')
					? 'application/pdf'
					: meta.mimeType,
				upsert: false,
			})

		if (uploadError) {
			throw new Error(
				`Storage upload to health-reports failed: ${uploadError.message}`,
			)
		}

		return json({
			success: true,
			storagePath,
			fileSize: fileBytes.length,
			sha256Checksum: checksum,
		})
	} catch (error) {
		if (isGoogleAuthExpiredError(error)) {
			return json({ success: false, error: GOOGLE_AUTH_EXPIRED_MESSAGE }, 401)
		}

		const message =
			error instanceof Error ? error.message : 'Google Drive download failed'

		if (message.includes('Google Drive download failed (')) {
			const statusMatch = message.match(
				/Google Drive download failed \((\d+)\)/,
			)
			const status = statusMatch ? Number(statusMatch[1]) : 500

			return json(
				{ success: false, error: message },
				status === 401 ? 401 : 500,
			)
		}

		throw error
	}
}

async function saveOAuthTokens(
	serviceClient: ReturnType<typeof createClient>,
	input: {
		userId: string
		accessToken: string
		refreshToken: string
		scopes: string[]
		expiresAt?: string
	},
) {
	const tokenExpiresAt = input.expiresAt ?? computeTokenExpiresAt(3600)

	const { error } = await serviceClient.from('connector_oauth_tokens').upsert(
		{
			user_id: input.userId,
			connector_id: CONNECTOR_ID,
			access_token: input.accessToken,
			refresh_token: input.refreshToken,
			token_expires_at: tokenExpiresAt,
			scopes: input.scopes,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,connector_id' },
	)

	if (error) {
		throw new Error(error.message)
	}
}

async function upsertConnectionRecord(
	serviceClient: ReturnType<typeof createClient>,
	input: {
		userId: string
		scopes: string[]
		googleEmail?: string | null
	},
) {
	const settings = input.googleEmail ? { googleEmail: input.googleEmail } : {}

	const { error } = await serviceClient.from('connector_connections').upsert(
		{
			user_id: input.userId,
			connector_id: CONNECTOR_ID,
			status: 'connected',
			scopes: input.scopes,
			connected_at: new Date().toISOString(),
			last_error: null,
			settings,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,connector_id' },
	)

	if (error) {
		throw new Error(error.message)
	}
}

async function handleVerify(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
) {
	const connection = await loadConnectorConnection(serviceClient, userId)

	if (!connection || connection.status !== 'connected') {
		return json({
			success: true,
			connected: false,
			error: 'Google Drive is not connected.',
		})
	}

	try {
		await getValidAccessToken(serviceClient, userId)

		return json({
			success: true,
			connected: true,
		})
	} catch (error) {
		if (isGoogleAuthExpiredError(error)) {
			return json(
				{
					success: false,
					connected: false,
					error: GOOGLE_AUTH_EXPIRED_MESSAGE,
				},
				401,
			)
		}

		return json(
			{
				success: false,
				connected: false,
				error:
					error instanceof Error
						? error.message
						: 'Google Drive verification failed',
			},
			400,
		)
	}
}

async function handleConnect(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
	body: DriveConnectorRequest,
) {
	if (!body.accessToken) {
		return json(
			{ success: false, connected: false, error: 'Missing accessToken' },
			400,
		)
	}

	if (!body.refreshToken) {
		const existingTokens = await loadOAuthTokens(serviceClient, userId)

		if (!existingTokens?.refresh_token) {
			return json(
				{
					success: false,
					connected: false,
					error:
						'Missing refreshToken. Reconnect with Google consent to issue a refresh token.',
				},
				400,
			)
		}
	}

	const scopes = body.scopes?.length ? body.scopes : DEFAULT_SCOPES
	const existingTokens = await loadOAuthTokens(serviceClient, userId)
	const refreshToken = body.refreshToken ?? existingTokens?.refresh_token

	if (!refreshToken) {
		return json(
			{
				success: false,
				connected: false,
				error:
					'Missing refreshToken. Reconnect with Google consent to issue a refresh token.',
			},
			400,
		)
	}

	await verifyGoogleAccessToken(body.accessToken)
	const googleEmail = await fetchGoogleUserEmail(body.accessToken)

	logOAuth('connect_refreshing_token', { userId })

	let activeAccessToken = body.accessToken
	let activeExpiresAt = computeTokenExpiresAt(3600)

	try {
		const refreshed = await refreshGoogleAccessToken(refreshToken)
		activeAccessToken = refreshed.access_token
		activeExpiresAt = computeTokenExpiresAt(refreshed.expires_in)

		await persistOAuthAccessToken(serviceClient, userId, {
			accessToken: activeAccessToken,
			expiresAt: activeExpiresAt,
		})
	} catch (refreshError) {
		logOAuth('connect_refresh_failed_using_session_token', {
			userId,
			error:
				refreshError instanceof Error ? refreshError.message : 'refresh failed',
		})
	}

	await saveOAuthTokens(serviceClient, {
		userId,
		accessToken: activeAccessToken,
		refreshToken,
		scopes,
		expiresAt: activeExpiresAt,
	})

	await upsertConnectionRecord(serviceClient, {
		userId,
		scopes,
		googleEmail,
	})

	return json({
		success: true,
		connected: true,
		provider: CONNECTOR_ID,
	})
}

async function handleDisconnect(
	serviceClient: ReturnType<typeof createClient>,
	userId: string,
) {
	const { error: tokenError } = await serviceClient
		.from('connector_oauth_tokens')
		.delete()
		.eq('user_id', userId)
		.eq('connector_id', CONNECTOR_ID)

	if (tokenError) {
		throw new Error(tokenError.message)
	}

	const { error: connectionError } = await serviceClient
		.from('connector_connections')
		.upsert(
			{
				user_id: userId,
				connector_id: CONNECTOR_ID,
				status: 'disconnected',
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id,connector_id' },
		)

	if (connectionError) {
		throw new Error(connectionError.message)
	}

	return json({
		success: true,
		disconnected: true,
		provider: CONNECTOR_ID,
	})
}

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	if (request.method !== 'POST') {
		return json({ success: false, error: 'Method not allowed' }, 405)
	}

	try {
		const authHeader = request.headers.get('Authorization')

		if (!authHeader) {
			return json({ success: false, error: 'Unauthorized' }, 401)
		}

		const supabase = createClient(
			requireEnv('SUPABASE_URL'),
			requireEnv('SUPABASE_ANON_KEY'),
			{ global: { headers: { Authorization: authHeader } } },
		)

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser()

		if (authError) {
			return json({ success: false, error: authError.message }, 401)
		}

		if (!user) {
			return json({ success: false, error: 'Unauthorized' }, 401)
		}

		const body = await parseRequestBody(request)

		if (!body.action || body.action === 'ping') {
			return json({
				success: true,
				message: 'Drive connector is alive',
			})
		}

		if (body.userId && body.userId !== user.id) {
			return json({ success: false, error: 'Forbidden' }, 403)
		}

		const serviceClient = getServiceClient()

		if (body.action === 'connect') {
			return await handleConnect(serviceClient, user.id, body)
		}

		if (body.action === 'verify') {
			return await handleVerify(serviceClient, user.id)
		}

		if (body.action === 'browse') {
			return await handleBrowse(serviceClient, user.id, body)
		}

		if (body.action === 'discover') {
			return await handleDiscover(serviceClient, user.id, body)
		}

		if (body.action === 'import' || body.action === 'download') {
			return await handleDownload(serviceClient, user.id, body)
		}

		if (body.action === 'disconnect') {
			return await handleDisconnect(serviceClient, user.id)
		}

		return json(
			{
				success: false,
				error: `Unknown action: ${body.action ?? 'none'}. Supported actions: connect, verify, browse, discover, import, download, disconnect`,
			},
			400,
		)
	} catch (error) {
		if (isGoogleAuthExpiredError(error)) {
			console.error('drive-connector auth expired:', error.message)

			return json({ success: false, error: GOOGLE_AUTH_EXPIRED_MESSAGE }, 401)
		}

		console.error(
			'drive-connector error:',
			error instanceof Error ? error.message : error,
		)

		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : 'Drive connector failed',
			},
			500,
		)
	}
})
