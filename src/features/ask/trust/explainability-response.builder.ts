import type { AskConversationTurn } from '@/features/ask/types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'

function formatEvidenceList(trust: TrustResponse): string {
	if (trust.evidenceItems.length === 0 && trust.evidence.length === 0) {
		return 'No linked evidence items were recorded for the previous answer.'
	}

	const lines = trust.evidenceItems.map((item) => {
		const parts = [
			item.reportTitle,
			item.reportDate,
			item.metricName
				? `${item.metricName}: ${item.metricValue ?? 'recorded'}`
				: null,
			item.hospital,
		].filter(Boolean)

		return `- ${parts.join(' · ')}`
	})

	if (trust.evidence.length > 0) {
		lines.push(...trust.evidence.map((line) => `- ${line}`))
	}

	return lines.join('\n')
}

function formatReportsList(trust: TrustResponse): string {
	if (trust.supportingReports.length === 0) {
		return 'No supporting reports were linked to the previous answer.'
	}

	return trust.supportingReports
		.map((report) => `- ${report.title} (${report.date})`)
		.join('\n')
}

function formatMissingList(trust: TrustResponse): string {
	if (trust.missingInformation.length === 0) {
		return 'Chronicle did not flag specific gaps for the previous answer.'
	}

	return trust.missingInformation.map((line) => `- ${line}`).join('\n')
}

export function buildExplainabilityAnswer(input: {
	question: string
	previousTurn: AskConversationTurn | null
}): string | null {
	const trust = input.previousTurn?.trust

	if (!trust) {
		return 'I do not have a previous answer in this conversation to explain yet. Ask a health question first, then use an explainability prompt.'
	}

	const normalized = input.question.trim().toLowerCase()

	if (/why did you say/i.test(normalized)) {
		return [
			'Here is why I said that:',
			'',
			trust.directAnswer.split('\n\nThis is informational')[0]?.trim() ??
				input.previousTurn!.answer,
			trust.disagreements.length > 0
				? `Note: ${trust.disagreements.length} conflicting value(s) were surfaced in your records.`
				: '',
		]
			.filter(Boolean)
			.join('\n')
	}

	if (/what evidence supports/i.test(normalized)) {
		return [
			'Evidence supporting the previous answer:',
			'',
			formatEvidenceList(trust),
		].join('\n')
	}

	if (/which reports contributed/i.test(normalized)) {
		return [
			'Reports that contributed to the previous answer:',
			'',
			formatReportsList(trust),
		].join('\n')
	}

	if (/what information is missing/i.test(normalized)) {
		return [
			'Information Chronicle does not have (or flagged as limited) for the previous answer:',
			'',
			formatMissingList(trust),
		].join('\n')
	}

	return null
}

export function buildExplainabilityTurn(input: {
	question: string
	previousTurn: AskConversationTurn | null
	memberId: string | null
	memberName: string | null
}): AskConversationTurn | null {
	const answer = buildExplainabilityAnswer(input)

	if (!answer || !input.previousTurn?.trust) {
		return null
	}

	const timestamp = new Date().toISOString()
	const priorTrust = input.previousTurn.trust

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer,
		cards: [],
		relatedReports: priorTrust.supportingReports,
		relatedMetrics: input.previousTurn.relatedMetrics,
		citations: input.previousTurn.citations,
		evidence: priorTrust.evidence,
		followUpQuestions: priorTrust.followUpQuestions,
		memberId: input.memberId,
		memberName: input.memberName,
		domains: input.previousTurn.domains,
		dataAvailable: input.previousTurn.dataAvailable,
		confidence: priorTrust.confidence.score,
		confidenceLevel: priorTrust.confidence.level,
		trust: {
			...priorTrust,
			directAnswer: answer,
			explainabilityPrompts: priorTrust.explainabilityPrompts,
		},
		timestamp,
		displayTimestamp: 'Now',
	}
}
