import {
	createClient,
	type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import {
	bytesToBase64,
	createCorrelationId,
	logStructured,
	resolveDocumentAiAccessToken,
} from './google-auth.ts'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BUCKETS = new Set(['health-reports', 'personal-documents'])

interface OcrRequestBody {
	storagePath: string
	fileName: string
	mimeType: string
	bucket: string
}

const OCR_NOT_CONFIGURED_MESSAGE =
	'Google Document AI is not configured. Set GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_DOCUMENT_AI_ACCESS_TOKEN in Supabase edge function secrets, then redeploy document-ocr.'

async function assertStorageOwnership(
	adminClient: SupabaseClient,
	userId: string,
	bucket: string,
	storagePath: string,
): Promise<void> {
	if (!ALLOWED_BUCKETS.has(bucket)) {
		throw new Error(`Unsupported storage bucket: ${bucket}`)
	}

	if (storagePath.startsWith(`${userId}/`)) {
		return
	}

	const [{ data: report }, { data: document }] = await Promise.all([
		adminClient
			.from('health_reports')
			.select('id')
			.eq('user_id', userId)
			.eq('storage_path', storagePath)
			.maybeSingle(),
		adminClient
			.from('chronicle_documents')
			.select('id')
			.eq('user_id', userId)
			.eq('storage_path', storagePath)
			.maybeSingle(),
	])

	if (!report && !document) {
		throw new Error('Forbidden: storage object does not belong to this user.')
	}
}

async function processWithGoogleDocumentAI(
	pdfBytes: Uint8Array,
	body: OcrRequestBody,
	startedAt: number,
	correlationId: string,
) {
	const projectId = Deno.env.get('GOOGLE_DOCUMENT_AI_PROJECT_ID')
	const processorId = Deno.env.get('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')
	const location = Deno.env.get('GOOGLE_DOCUMENT_AI_LOCATION') ?? 'us'
	const accessToken = await resolveDocumentAiAccessToken()

	if (!projectId || !processorId || !accessToken) {
		logStructured('ocr_not_configured', {
			correlationId,
			projectIdPresent: Boolean(projectId),
			processorIdPresent: Boolean(processorId),
			accessTokenPresent: Boolean(accessToken),
		})

		return new Response(JSON.stringify({ error: OCR_NOT_CONFIGURED_MESSAGE }), {
			status: 503,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

	logStructured('ocr_request_started', {
		correlationId,
		fileName: body.fileName,
		bucket: body.bucket,
		byteLength: pdfBytes.length,
		mimeType: body.mimeType,
	})

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			rawDocument: {
				content: bytesToBase64(pdfBytes),
				mimeType: body.mimeType,
			},
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		logStructured('ocr_provider_failed', {
			correlationId,
			status: response.status,
			error: errorText.slice(0, 500),
		})
		throw new Error(
			`Google Document AI failed (${response.status}): ${errorText}`,
		)
	}

	const payload = await response.json()
	const document = payload.document
	const rawText = document?.text ?? ''
	const pages = (document?.pages ?? []).map(
		(page: { pageNumber?: number }, index: number) => ({
			pageNumber: page.pageNumber ?? index + 1,
			text: rawText,
			confidence: 0.95,
		}),
	)

	const processingTimeMs = Date.now() - startedAt

	logStructured('ocr_request_succeeded', {
		correlationId,
		pageCount: pages.length,
		characters: rawText.length,
		processingTimeMs,
	})

	return new Response(
		JSON.stringify({
			rawText,
			pages,
			tables: [],
			confidence: 0.95,
			metadata: {
				provider: 'google-document-ai',
				mimeType: body.mimeType,
				fileName: body.fileName,
				pageCount: pages.length,
				tableCount: 0,
				correlationId,
			},
			processingTimeMs,
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		},
	)
}

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	const startedAt = Date.now()
	const correlationId = createCorrelationId()

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL')!
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
		const authHeader = request.headers.get('Authorization')

		if (!authHeader) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			})
		}

		const body = (await request.json()) as OcrRequestBody
		const adminClient = createClient(supabaseUrl, serviceRoleKey)
		const userClient = createClient(
			supabaseUrl,
			Deno.env.get('SUPABASE_ANON_KEY')!,
			{
				global: { headers: { Authorization: authHeader } },
			},
		)

		const {
			data: { user },
		} = await userClient.auth.getUser()

		if (!user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			})
		}

		await assertStorageOwnership(
			adminClient,
			user.id,
			body.bucket,
			body.storagePath,
		)

		const { data: fileData, error: downloadError } = await adminClient.storage
			.from(body.bucket)
			.download(body.storagePath)

		if (downloadError || !fileData) {
			throw new Error(downloadError?.message ?? 'Could not download document.')
		}

		const pdfBytes = new Uint8Array(await fileData.arrayBuffer())

		return await processWithGoogleDocumentAI(
			pdfBytes,
			body,
			startedAt,
			correlationId,
		)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'OCR processing failed.'

		logStructured('ocr_request_failed', {
			correlationId,
			error: message,
			durationMs: Date.now() - startedAt,
		})

		const status = message.startsWith('Forbidden:') ? 403 : 500

		return new Response(JSON.stringify({ error: message, correlationId }), {
			status,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}
})
