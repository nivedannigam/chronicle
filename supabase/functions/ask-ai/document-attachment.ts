import {
	createClient,
	type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import type { AskAiDocumentAttachment } from './types.ts'

const ALLOWED_BUCKETS = new Set(['health-reports', 'personal-documents'])

export async function assertDocumentAttachmentOwnership(
	adminClient: SupabaseClient,
	userId: string,
	attachment: AskAiDocumentAttachment,
): Promise<void> {
	if (!ALLOWED_BUCKETS.has(attachment.bucket)) {
		throw new Error(`Unsupported storage bucket: ${attachment.bucket}`)
	}

	if (attachment.storagePath.startsWith(`${userId}/`)) {
		return
	}

	const [{ data: report }, { data: document }] = await Promise.all([
		adminClient
			.from('health_reports')
			.select('id')
			.eq('user_id', userId)
			.eq('storage_path', attachment.storagePath)
			.maybeSingle(),
		adminClient
			.from('chronicle_documents')
			.select('id')
			.eq('user_id', userId)
			.eq('storage_path', attachment.storagePath)
			.maybeSingle(),
	])

	if (!report && !document) {
		throw new Error('Forbidden: storage object does not belong to this user.')
	}
}

function inferMimeType(attachment: AskAiDocumentAttachment): string {
	if (attachment.mimeType?.trim()) {
		return attachment.mimeType.trim()
	}

	const fileName = attachment.fileName ?? attachment.storagePath
	const lower = fileName.toLowerCase()

	if (lower.endsWith('.pdf')) {
		return 'application/pdf'
	}

	if (lower.endsWith('.png')) {
		return 'image/png'
	}

	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
		return 'image/jpeg'
	}

	return 'application/pdf'
}

export async function downloadDocumentAttachmentBytes(input: {
	supabaseUrl: string
	serviceRoleKey: string
	userId: string
	attachment: AskAiDocumentAttachment
}): Promise<{ bytes: Uint8Array; mimeType: string }> {
	const adminClient = createClient(input.supabaseUrl, input.serviceRoleKey)

	await assertDocumentAttachmentOwnership(
		adminClient,
		input.userId,
		input.attachment,
	)

	const { data: fileData, error: downloadError } = await adminClient.storage
		.from(input.attachment.bucket)
		.download(input.attachment.storagePath)

	if (downloadError || !fileData) {
		throw new Error(downloadError?.message ?? 'Could not download document.')
	}

	return {
		bytes: new Uint8Array(await fileData.arrayBuffer()),
		mimeType: inferMimeType(input.attachment),
	}
}

export function encodeBytesToBase64(bytes: Uint8Array): string {
	let binary = ''

	for (let index = 0; index < bytes.length; index += 1) {
		binary += String.fromCharCode(bytes[index]!)
	}

	return btoa(binary)
}
