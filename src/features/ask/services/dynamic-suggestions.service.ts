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

	if (latest) {
		chips.push({
			id: 'summarize-latest',
			label: 'Summarize latest report',
			question: 'Summarize my latest report.',
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
			label: 'Compare cholesterol',
			question: 'Compare cholesterol over time.',
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
			label: 'Show liver history',
			question: 'Show my liver history.',
			category: 'health',
		})
	}

	const hasHba1c = reports.some((report) => {
		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			/hba1c|a1c/i.test(metric.displayName),
		)
	})

	if (hasHba1c) {
		chips.push({
			id: 'explain-hba1c',
			label: 'Explain HbA1c',
			question: 'Explain HbA1c.',
			category: 'health',
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
			label: 'Unresolved findings',
			question: 'Show unresolved findings.',
			category: 'health',
		})
	}

	if ((input.documents?.length ?? 0) > 0) {
		chips.push({
			id: 'expiring-docs',
			label: 'Expiring documents',
			question: 'Which documents expire this year?',
			category: 'documents',
		})
	}

	if (reports.length >= 2) {
		chips.push({
			id: 'what-changed',
			label: 'What changed?',
			question: 'What changed since my last report?',
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
				label: 'Summarize health',
				question: 'Summarize my health.',
				category: 'general',
			},
		)
	}

	return chips.slice(0, 6)
}
