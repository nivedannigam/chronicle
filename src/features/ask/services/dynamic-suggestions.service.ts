import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'

export interface DynamicSuggestionChip {
	id: string
	label: string
	question: string
	category: 'health' | 'documents' | 'timeline' | 'general'
}

export function buildDynamicSuggestionChips(input: {
	uploadedReports: UploadedHealthReport[]
	documents?: ChronicleDocument[]
	memberName?: string | null
	members?: Array<{ displayName: string }>
}): DynamicSuggestionChip[] {
	const chips: DynamicSuggestionChip[] = []
	const reports = input.uploadedReports.filter(
		(report) => report.status === 'completed',
	)
	const sorted = [...reports].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)
	const latest = sorted[0]
	const childMember = input.members?.find((member) =>
		/daughter|son|child|advika|kid/i.test(member.displayName),
	)
	const spouseMember = input.members?.find((member) =>
		/wife|husband|spouse|partner/i.test(member.displayName),
	)

	if (latest) {
		chips.push({
			id: 'summarize-latest',
			label: 'Summarize latest health report',
			question: 'Summarize my latest health report.',
			category: 'health',
		})
	}

	if (reports.length >= 2) {
		chips.push({
			id: 'what-changed',
			label: 'What changed since last test?',
			question: 'What changed since my last blood test?',
			category: 'health',
		})
	}

	const hasCholesterol = reports.some((report) => {
		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			/cholesterol|ldl|hdl/i.test(metric.displayName),
		)
	})

	if (hasCholesterol) {
		chips.push({
			id: 'compare-cholesterol',
			label: 'Compare cholesterol over 3 years',
			question: 'Compare my cholesterol over the last three years.',
			category: 'health',
		})
	}

	const hasVitaminD = reports.some((report) => {
		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			/vitamin d|vit d|25-oh/i.test(metric.displayName),
		)
	})

	if (hasVitaminD) {
		chips.push({
			id: 'vitamin-d',
			label: 'Vitamin D deficiency',
			question: 'Which reports mention Vitamin D deficiency?',
			category: 'health',
		})
	}

	const hasLiver = reports.some((report) => {
		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			/alt|ast|liver|sgpt|sgot/i.test(metric.displayName),
		)
	})

	if (hasLiver) {
		chips.push({
			id: 'liver-history',
			label: 'Compare liver health',
			question: 'Compare my liver health over the last three reports.',
			category: 'health',
		})
	}

	const documents = input.documents ?? []
	const hasPassport = documents.some((document) =>
		/passport/i.test(document.title),
	)

	if (hasPassport) {
		chips.push({
			id: 'passport-expiry',
			label: 'When does my passport expire?',
			question: 'When does my passport expire?',
			category: 'documents',
		})
	}

	const hasProperty = documents.some((document) =>
		/property|house|home|registration/i.test(document.title),
	)

	if (hasProperty) {
		chips.push({
			id: 'property-docs',
			label: 'Documents related to my house',
			question: 'Show documents related to my house.',
			category: 'documents',
		})
	}

	if (documents.length > 0) {
		chips.push({
			id: 'expiring-docs',
			label: 'Insurance expiring this year',
			question: 'Which insurance policies expire this year?',
			category: 'documents',
		})
	}

	if (childMember) {
		chips.push({
			id: 'child-vaccination',
			label: `${childMember.displayName.split(' ')[0]}'s vaccination records`,
			question: `Show ${childMember.displayName}'s vaccination records.`,
			category: 'general',
		})
	}

	if (spouseMember && documents.length > 0) {
		chips.push({
			id: 'family-renewals',
			label: 'Pending document renewals',
			question: 'Which family member has pending document renewals?',
			category: 'documents',
		})
	}

	const hasAbnormal = reports.some((report) => {
		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			['low', 'high', 'critical'].includes(metric.status),
		)
	})

	if (hasAbnormal) {
		chips.push({
			id: 'unresolved-findings',
			label: 'Should I be concerned?',
			question: 'Should I be concerned about my latest results?',
			category: 'health',
		})
	}

	if (chips.length === 0) {
		chips.push(
			{
				id: 'attention',
				label: 'What needs attention?',
				question: 'What should I pay attention to?',
				category: 'general',
			},
			{
				id: 'summarize-health',
				label: 'Summarize my health',
				question: 'Summarize my health reports.',
				category: 'general',
			},
			{
				id: 'find-passport',
				label: 'Find my passport',
				question: 'Where is my passport?',
				category: 'documents',
			},
		)
	}

	return chips.slice(0, 8)
}
