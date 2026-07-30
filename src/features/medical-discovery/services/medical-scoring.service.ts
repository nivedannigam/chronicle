import type { DiscoveryCategory } from '@/features/medical-discovery/types/medical-discovery.types'

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
	'test',
	'complete',
	'panel',
	'results',
	'lft',
	'kft',
	'biochemistry',
	'profile',
	'checkup',
	'check-up',
	'annual',
	'medical',
]

const REVIEW_KEYWORDS = ['invoice', 'bill', 'receipt', 'payment', 'statement']

const IGNORED_EXTENSIONS = [
	'.zip',
	'.mp4',
	'.mov',
	'.avi',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	'.ppt',
	'.pptx',
]

import { isSupportedHealthReportMimeType } from '@chronicle/core-ocr'

const LIKELY_MEDICAL_THRESHOLD = 45
const NEEDS_REVIEW_THRESHOLD = 25
const ASSIGNED_HEALTH_FOLDER_BOOST = 25

export interface ScoreMedicalFileInput {
	fileName: string
	mimeType: string
	folderPath: string
	isAssignedHealthFolder?: boolean
}

export interface MedicalFileScore {
	confidence: number
	reason: string
	category: DiscoveryCategory
	matchedKeywords: string[]
}

function normalize(value: string): string {
	return value.toLowerCase()
}

function extractKeywords(text: string): string[] {
	const normalized = normalize(text)
	return MEDICAL_KEYWORDS.filter((keyword) => normalized.includes(keyword))
}

export function isSupportedMedicalMime(mimeType: string): boolean {
	return isSupportedHealthReportMimeType(mimeType)
}

export function isIgnoredFile(input: ScoreMedicalFileInput): boolean {
	const name = normalize(input.fileName)
	const mime = normalize(input.mimeType)

	if (!isSupportedMedicalMime(mime)) {
		return true
	}

	if (IGNORED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
		return true
	}

	if (
		mime.startsWith('video/') ||
		mime.includes('zip') ||
		mime.includes('officedocument')
	) {
		return true
	}

	return false
}

function keywordScore(keyword: string): number {
	return keyword.length >= 5 ? 12 : 8
}

export function scoreMedicalFile(
	input: ScoreMedicalFileInput,
): MedicalFileScore {
	if (isIgnoredFile(input)) {
		return {
			confidence: 0,
			reason: 'Unsupported file type',
			category: 'ignored',
			matchedKeywords: [],
		}
	}

	const searchable = `${input.fileName} ${input.folderPath}`
	const matchedKeywords = extractKeywords(input.fileName)
	const folderKeywords = extractKeywords(input.folderPath)
	const allKeywords = [...new Set([...matchedKeywords, ...folderKeywords])]
	const hasBillingTerms = REVIEW_KEYWORDS.some((keyword) =>
		normalize(searchable).includes(keyword),
	)

	let confidence = 0
	const reasons: string[] = []

	if (normalize(input.mimeType) === 'application/pdf') {
		confidence += 15
		reasons.push('PDF document')
	} else if (normalize(input.mimeType).startsWith('image/')) {
		confidence += 10
		reasons.push('Medical image format')
	}

	for (const keyword of allKeywords) {
		confidence += keywordScore(keyword)
	}

	if (input.isAssignedHealthFolder) {
		confidence += ASSIGNED_HEALTH_FOLDER_BOOST
		reasons.push('Assigned health folder')
	}

	if (folderKeywords.length > 0) {
		reasons.push(`Folder match: ${folderKeywords.join(', ')}`)
	}

	if (matchedKeywords.length > 0) {
		reasons.push(`Filename keywords: ${matchedKeywords.join(', ')}`)
	}

	if (hasBillingTerms) {
		confidence = Math.max(confidence - 20, 0)
		reasons.push('Contains billing/invoice terms')
	}

	confidence = Math.min(confidence, 99)

	let category: DiscoveryCategory = 'ignored'

	if (hasBillingTerms && matchedKeywords.length === 0) {
		category = 'ignored'
	} else if (confidence >= LIKELY_MEDICAL_THRESHOLD) {
		category = 'likely_medical'
	} else if (confidence >= NEEDS_REVIEW_THRESHOLD) {
		category = 'needs_review'
	}

	return {
		confidence,
		reason:
			reasons.length > 0 ? reasons.join(' · ') : 'No strong medical signals',
		category,
		matchedKeywords: allKeywords,
	}
}
