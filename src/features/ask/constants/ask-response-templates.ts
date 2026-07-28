import type { AskIntent } from '@/features/knowledge/retrieval/knowledge-retriever.types'

/** Response opening templates — human-first, never raw data. */
export const ASK_RESPONSE_TEMPLATES = {
	noData: {
		direct: "I don't have that in your Chronicle records yet.",
		explanation:
			'Chronicle searches across your health reports, documents, and family context. When matching records exist, I can summarize, compare, and explain them.',
		recommendations: [
			'Import health reports or sync documents from Google Drive.',
			'Try naming a family member or document type in your question.',
		],
	},
	uncertain: {
		direct: "I couldn't confidently determine that from the available records.",
		explanation:
			'The uploaded scan or metadata may be incomplete. I only answer from what Chronicle has processed.',
	},
	expiringDocuments: {
		direct:
			'Here are the documents that need attention based on expiry dates in your records.',
		recommendations: [
			'Review expiring items early to avoid last-minute renewals.',
			'Set a reminder before the expiry date.',
		],
	},
	healthCompare: {
		direct: 'Here is how your latest results compare with earlier reports.',
		recommendations: [
			'Discuss significant changes with your healthcare provider.',
			'Ask for a trend view if you want to see longer history.',
		],
	},
} as const

/** Prompt instructions appended per intent category. */
export function intentResponseGuidance(intent: AskIntent | string): string {
	switch (intent) {
		case 'summarize_report':
		case 'latest_report':
			return 'Lead with a plain-language summary. Mention date and lab. Avoid listing every metric.'
		case 'compare_reports':
		case 'metric_trend':
			return 'Lead with what changed. Explain whether the change is meaningful. Do not dump raw numbers first.'
		case 'find_document':
		case 'document_expiry':
			return 'Lead with the document name and what it means. Mention owner and expiry if known.'
		case 'explain_response':
			return 'Explain your reasoning clearly. Reference specific sources without technical jargon.'
		default:
			return 'Lead with a direct answer. Follow with brief context. End with actionable recommendations when relevant.'
	}
}
