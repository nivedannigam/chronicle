import { HEALTH_REPORT_MAX_FILE_SIZE_BYTES } from '@/features/health-import/constants/import-limits'
import { supabase } from '@/lib/supabase'
import {
	enqueueHealthReportProcessing,
	processHealthReport,
} from '@/features/health/services/health-processing.service'
import {
	HEALTH_REPORTS_BUCKET,
	type UploadedHealthReport,
} from '@/features/health/types'

function sanitizeFileName(fileName: string): string {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function fetchUploadedHealthReports(): Promise<
	UploadedHealthReport[]
> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.order('uploaded_at', { ascending: false })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []) as UploadedHealthReport[]
}

export async function uploadHealthReport(
	userId: string,
	file: File,
	familyMemberId?: string | null,
): Promise<UploadedHealthReport> {
	if (file.type !== 'application/pdf') {
		throw new Error('Only PDF files are supported.')
	}

	if (file.size > HEALTH_REPORT_MAX_FILE_SIZE_BYTES) {
		const limitMb = HEALTH_REPORT_MAX_FILE_SIZE_BYTES / (1024 * 1024)
		throw new Error(`File must be ${limitMb} MB or smaller.`)
	}

	const reportId = crypto.randomUUID()
	const storagePath = `${userId}/${reportId}_${sanitizeFileName(file.name)}`

	const { error: uploadError } = await supabase.storage
		.from(HEALTH_REPORTS_BUCKET)
		.upload(storagePath, file, {
			contentType: 'application/pdf',
			upsert: false,
		})

	if (uploadError) {
		throw new Error(uploadError.message)
	}

	const { data, error: insertError } = await supabase
		.from('health_reports')
		.insert({
			user_id: userId,
			family_member_id: familyMemberId ?? null,
			file_name: file.name,
			storage_path: storagePath,
			report_date: new Date().toISOString().slice(0, 10),
			report_type: 'general',
			status: 'uploaded',
		})
		.select('*')
		.single()

	if (insertError) {
		await supabase.storage.from(HEALTH_REPORTS_BUCKET).remove([storagePath])
		throw new Error(insertError.message)
	}

	const report = data as UploadedHealthReport

	try {
		await enqueueHealthReportProcessing(userId, report.id)
	} catch (queueError) {
		await supabase.from('health_reports').delete().eq('id', report.id)
		await supabase.storage.from(HEALTH_REPORTS_BUCKET).remove([storagePath])
		throw queueError instanceof Error
			? queueError
			: new Error('Could not enqueue report for processing.')
	}

	void processHealthReport(report.id).catch(() => {
		// Status is persisted as failed by the processing service
	})

	return report
}

export async function getHealthReportSignedUrl(
	storagePath: string,
): Promise<string> {
	const { data, error } = await supabase.storage
		.from(HEALTH_REPORTS_BUCKET)
		.createSignedUrl(storagePath, 3600)

	if (error) {
		throw new Error(error.message)
	}

	if (!data?.signedUrl) {
		throw new Error('Could not open report.')
	}

	return data.signedUrl
}

export function formatUploadedReportDate(uploadedAt: string): string {
	return new Date(uploadedAt).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}
