import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

interface OcrRequestBody {
	storagePath: string
	fileName: string
	mimeType: string
	bucket: string
}

const OCR_NOT_CONFIGURED_MESSAGE =
	'Google Document AI is not configured. Set GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_DOCUMENT_AI_ACCESS_TOKEN in Supabase edge function secrets, then redeploy document-ocr.'

async function processWithGoogleDocumentAI(
	pdfBytes: Uint8Array,
	body: OcrRequestBody,
	startedAt: number,
) {
	const projectId = Deno.env.get('GOOGLE_DOCUMENT_AI_PROJECT_ID')
	const processorId = Deno.env.get('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')
	const location = Deno.env.get('GOOGLE_DOCUMENT_AI_LOCATION') ?? 'us'
	const accessToken = Deno.env.get('GOOGLE_DOCUMENT_AI_ACCESS_TOKEN')

	if (!projectId || !processorId || !accessToken) {
		return new Response(JSON.stringify({ error: OCR_NOT_CONFIGURED_MESSAGE }), {
			status: 503,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			rawDocument: {
				content: btoa(String.fromCharCode(...pdfBytes)),
				mimeType: body.mimeType,
			},
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Google Document AI failed: ${errorText}`)
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
			},
			processingTimeMs: Date.now() - startedAt,
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

		const { data: fileData, error: downloadError } = await adminClient.storage
			.from(body.bucket)
			.download(body.storagePath)

		if (downloadError || !fileData) {
			throw new Error(downloadError?.message ?? 'Could not download document.')
		}

		const pdfBytes = new Uint8Array(await fileData.arrayBuffer())
		return await processWithGoogleDocumentAI(pdfBytes, body, startedAt)
	} catch (error) {
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : 'OCR processing failed.',
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		)
	}
})
