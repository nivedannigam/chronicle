import type { BetaExperience } from '@/features/ask/beta/beta-experiences'
import type { ClinicalAnswer } from '@/features/ask/clinical/clinical-response.types'
import type {
	AskConversationTurn,
	EvidenceCitation,
} from '@/features/ask/types'
import { documentsKnowledgeRetriever } from '@/features/knowledge/retrieval/documents-knowledge-retriever'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import { getKnowledgeItems } from '@/features/knowledge/services/knowledge.service'
import type { KnowledgeItem } from '@/features/knowledge/types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'
import { buildTrustResponse } from '@/features/ask/trust/trust-response.builder'
import {
	parseConfidenceLevel,
	toConfidenceLevel,
} from '@/features/intelligence/types/confidence.types'

const ABNORMAL = new Set(['low', 'high', 'critical', 'borderline'])

function formatDate(value: string | null | undefined): string {
	if (!value) {
		return 'date unknown'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function sanitizeSnippet(
	text: string | null | undefined,
	maxLength = 140,
): string {
	if (!text?.trim()) {
		return ''
	}

	const cleaned = text.replace(/\s+/g, ' ').trim()

	if (cleaned.length <= maxLength) {
		return cleaned
	}

	return `${cleaned.slice(0, maxLength - 1)}…`
}

function emptyRankedEvidence(): ClinicalAnswer['rankedEvidence'] {
	return {
		metrics: [],
		trends: [],
		insights: [],
		alerts: [],
		reports: [],
		reportCount: 0,
		singleReport: false,
		latestReportLabel: null,
		abnormalCount: 0,
		normalCount: 0,
	}
}

function buildClinicalAnswer(input: {
	intent: ClinicalAnswer['intent']
	executiveSummary: string
	keyFindings: string[]
	recommendations: string[]
	limitations: string[]
}): ClinicalAnswer {
	return {
		intent: input.intent,
		executiveSummary: input.executiveSummary,
		keyFindings: input.keyFindings,
		recommendations: input.recommendations,
		limitations: input.limitations,
		rankedEvidence: emptyRankedEvidence(),
		importantMetricIds: [],
		showTrendCards: false,
		showComparisonLanguage: false,
	}
}

function documentCitations(documents: ChronicleDocument[]): EvidenceCitation[] {
	return documents.slice(0, 6).map((document) => ({
		reportId: document.id,
		reportTitle: document.title,
		hospital: document.issuer ?? 'Document',
		date: document.issue_date ?? document.uploaded_at,
		source: 'documents',
	}))
}

function knowledgeCitations(items: KnowledgeItem[]): EvidenceCitation[] {
	return items.slice(0, 6).map((item) => ({
		reportId: item.id,
		reportTitle: item.title,
		hospital: item.source,
		date: item.createdAt,
		source: 'documents',
	}))
}

function assembleTurn(input: {
	question: string
	member: IntelligenceMemberContext
	domains: AskConversationTurn['domains']
	clinical: ClinicalAnswer
	citations: EvidenceCitation[]
	confidence: number
	dataAvailable: boolean
	betaExperienceId: BetaExperience['id']
	knowledge?: RetrievedKnowledge | null
}): AskConversationTurn {
	const timestamp = new Date().toISOString()
	const displayTimestamp = new Date(timestamp).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})

	const answerParts = [
		input.clinical.executiveSummary,
		'',
		'Key findings:',
		...input.clinical.keyFindings.map((item) => `• ${item}`),
		'',
		'Recommendations:',
		...input.clinical.recommendations.map((item) => `• ${item}`),
	]

	if (input.clinical.limitations.length > 0) {
		answerParts.push(
			'',
			'Limitations:',
			...input.clinical.limitations.map((l) => `• ${l}`),
		)
	}

	const answer = answerParts.join('\n')
	const confidenceLevel =
		parseConfidenceLevel(input.confidence) ??
		toConfidenceLevel(input.confidence)
	const knowledge =
		input.knowledge ??
		({
			domain: input.domains[0] ?? 'documents',
			intent: input.clinical.intent,
			reports: [],
			metrics: [],
			timelines: [],
			trends: [],
			observations: [],
			relationships: [],
			insights: input.clinical.keyFindings,
			alerts: [],
			summaryLines: input.clinical.keyFindings,
			comparisons: [],
		} satisfies RetrievedKnowledge)

	const trust = buildTrustResponse({
		answer,
		question: input.question,
		knowledge,
		dataAvailable: input.dataAvailable,
		evidence: input.clinical.keyFindings,
		citations: input.citations,
		relatedReports: input.citations.map((citation) => ({
			id: citation.reportId,
			title: citation.reportTitle,
			date: citation.date,
		})),
		relatedMetrics: [],
		followUpQuestions: [],
		intentConfidence: input.confidence,
		clinicalAnswer: input.clinical,
	})

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: trust.directAnswer,
		clinicalAnswer: input.clinical,
		cards: [],
		relatedReports: trust.supportingReports,
		relatedMetrics: [],
		citations: input.citations,
		evidence: input.clinical.keyFindings,
		followUpQuestions: [],
		memberId: input.member.memberId,
		memberName: input.member.memberName,
		domains: input.domains,
		dataAvailable: input.dataAvailable,
		confidence: input.confidence,
		confidenceLevel,
		trust,
		timestamp,
		displayTimestamp,
		betaExperienceId: input.betaExperienceId,
	}
}

function searchDocuments(input: {
	question: string
	documents: ChronicleDocument[]
	member: IntelligenceMemberContext
	intent: RetrievedKnowledge['intent']
}): RetrievedKnowledge {
	return documentsKnowledgeRetriever.retrieve({
		userId: 'beta',
		question: input.question,
		resolvedQuestion: input.question,
		intent: input.intent,
		member: {
			memberId: input.member.memberId,
			memberName: input.member.memberName,
			familyMemberNames: input.member.familyMemberNames ?? [],
		},
		documents: input.documents,
	})
}

function handleFindDocument(input: {
	experience: BetaExperience
	question: string
	member: IntelligenceMemberContext
	documents: ChronicleDocument[]
}): AskConversationTurn {
	const knowledge = searchDocuments({
		question: input.question,
		documents: input.documents,
		member: input.member,
		intent: 'find_document',
	})

	const match = knowledge.reports[0]
	const prefix = input.member.memberName
		? `${input.member.memberName}'s `
		: 'Your '

	if (!match) {
		const clinical = buildClinicalAnswer({
			intent: 'find_document',
			executiveSummary: `I couldn't find a matching document in ${prefix}Chronicle library yet.`,
			keyFindings: [
				'No document title or tag matched this search.',
				`${input.documents.length} total document${input.documents.length === 1 ? '' : 's'} in library.`,
			],
			recommendations: [
				'Upload or import the document into Chronicle Documents.',
				'Try searching with a simpler keyword like "passport" or "insurance".',
			],
			limitations: [
				'Chronicle searches indexed metadata — not external email or cloud folders unless connected.',
			],
		})

		return assembleTurn({
			question: input.question,
			member: input.member,
			domains: ['documents'],
			clinical,
			citations: [],
			confidence: 0.45,
			dataAvailable: false,
			betaExperienceId: input.experience.id,
			knowledge,
		})
	}

	const clinical = buildClinicalAnswer({
		intent: 'find_document',
		executiveSummary: `Found ${match.title} in ${prefix}records.`,
		keyFindings: [
			`Category: ${match.category ?? match.lab}.`,
			match.summary ? match.summary : `Issued ${formatDate(match.date)}.`,
		].filter(Boolean),
		recommendations: [
			'Open the original in Documents to verify details before travel or renewal.',
			'Set a reminder if this document has an expiry date.',
		],
		limitations: [
			'Location is based on your Chronicle library — not physical storage.',
		],
	})

	return assembleTurn({
		question: input.question,
		member: input.member,
		domains: ['documents'],
		clinical,
		citations: documentCitations(
			input.documents.filter((document) => document.id === match.id),
		),
		confidence: 0.88,
		dataAvailable: true,
		betaExperienceId: input.experience.id,
		knowledge,
	})
}

function handleExplainDocument(input: {
	experience: BetaExperience
	question: string
	member: IntelligenceMemberContext
	documents: ChronicleDocument[]
}): AskConversationTurn {
	const knowledge = searchDocuments({
		question: input.question,
		documents: input.documents,
		member: input.member,
		intent: 'document_summary',
	})

	const matchDocument =
		input.documents.find((document) =>
			new RegExp(document.title, 'i').test(input.question),
		) ??
		input.documents.find((document) => {
			const body = [
				document.title,
				document.tags.join(' '),
				document.extracted_text ?? '',
			].join(' ')

			return new RegExp(
				input.question
					.replace(/explain|summarize|what does|my|the|document/gi, '')
					.trim(),
				'i',
			).test(body)
		}) ??
		input.documents[0]

	const prefix = input.member.memberName
		? `${input.member.memberName}'s `
		: 'Your '

	if (!matchDocument) {
		const clinical = buildClinicalAnswer({
			intent: 'document_summary',
			executiveSummary: `I don't have a document to explain in ${prefix}library yet.`,
			keyFindings: ['No indexed document matched this question.'],
			recommendations: [
				'Upload the document to Chronicle Documents first.',
				'Then ask "Explain my [document name]".',
			],
			limitations: ['Explanations use indexed metadata — never raw OCR dumps.'],
		})

		return assembleTurn({
			question: input.question,
			member: input.member,
			domains: ['documents'],
			clinical,
			citations: [],
			confidence: 0.4,
			dataAvailable: false,
			betaExperienceId: input.experience.id,
			knowledge,
		})
	}

	const snippet = sanitizeSnippet(matchDocument.extracted_text)
	const metadataSummary = [
		matchDocument.issuer ? `Issuer: ${matchDocument.issuer}` : null,
		matchDocument.document_number
			? `Reference: ${matchDocument.document_number}`
			: null,
		matchDocument.issue_date
			? `Issued: ${formatDate(matchDocument.issue_date)}`
			: null,
		matchDocument.expiry_date
			? `Expires: ${formatDate(matchDocument.expiry_date)}`
			: null,
		matchDocument.tags.length ? `Tags: ${matchDocument.tags.join(', ')}` : null,
	].filter(Boolean)

	const clinical = buildClinicalAnswer({
		intent: 'document_summary',
		executiveSummary: `${matchDocument.title} — ${prefix}indexed summary.`,
		keyFindings: [
			...metadataSummary,
			snippet
				? `Indexed excerpt: "${snippet}"`
				: 'No text excerpt indexed yet.',
		].filter((line): line is string => Boolean(line)),
		recommendations: [
			'Review the original file in Documents for complete wording.',
			matchDocument.expiry_date
				? `Renew before ${formatDate(matchDocument.expiry_date)} if applicable.`
				: 'Add an expiry date if this document expires.',
		],
		limitations: [
			'This summary uses structured metadata and a short excerpt — not the full document text.',
		],
	})

	return assembleTurn({
		question: input.question,
		member: input.member,
		domains: ['documents'],
		clinical,
		citations: documentCitations([matchDocument]),
		confidence: snippet ? 0.82 : 0.68,
		dataAvailable: true,
		betaExperienceId: input.experience.id,
		knowledge,
	})
}

function handleMonthlyFinancialSummary(input: {
	experience: BetaExperience
	question: string
	member: IntelligenceMemberContext
	userId: string
	documents: ChronicleDocument[]
}): AskConversationTurn {
	const items = getKnowledgeItems(input.userId)
	const financeItems = items.filter(
		(item) =>
			item.type === 'Finance' ||
			item.type === 'Task' ||
			item.tags.includes('finance') ||
			item.tags.includes('bill'),
	)
	const financialDocs = input.documents.filter((document) =>
		/finance|bank|tax|mortgage|credit|statement|invoice|bill/i.test(
			`${document.title} ${document.tags.join(' ')}`,
		),
	)

	const keyFindings: string[] = []

	for (const item of financeItems.slice(0, 4)) {
		keyFindings.push(`${item.title}: ${item.summary}`)
	}

	for (const document of financialDocs.slice(0, 3)) {
		keyFindings.push(
			`${document.title} (${formatDate(document.issue_date ?? document.uploaded_at)}).`,
		)
	}

	const dataAvailable = keyFindings.length > 0
	const prefix = input.member.memberName
		? `${input.member.memberName}'s `
		: 'Your '

	const clinical = buildClinicalAnswer({
		intent: 'general_health',
		executiveSummary: dataAvailable
			? `${prefix}monthly financial snapshot from Chronicle records.`
			: `I don't have enough financial records to summarize ${prefix}monthly spending yet.`,
		keyFindings: dataAvailable
			? keyFindings
			: [
					'No finance items or statements indexed yet.',
					'Connect accounts or upload bank statements to Documents.',
				],
		recommendations: dataAvailable
			? [
					'Review upcoming bills flagged in your timeline.',
					'Upload recent statements for a more complete monthly picture.',
					'Ask about a specific account or bill by name.',
				]
			: [
					'Import bank statements or credit card summaries into Documents.',
					'Enable finance connectors when available.',
				],
		limitations: [
			'This is an informational summary — not tax or investment advice.',
			'Amounts come from indexed Chronicle items, not live bank feeds unless connected.',
		],
	})

	return assembleTurn({
		question: input.question,
		member: input.member,
		domains: ['finance'],
		clinical,
		citations: [
			...knowledgeCitations(financeItems),
			...documentCitations(financialDocs),
		],
		confidence: dataAvailable ? 0.75 : 0.42,
		dataAvailable,
		betaExperienceId: input.experience.id,
	})
}

function handleTripAssistant(input: {
	experience: BetaExperience
	question: string
	member: IntelligenceMemberContext
	userId: string
	documents: ChronicleDocument[]
}): AskConversationTurn {
	const items = getKnowledgeItems(input.userId)
	const travelItems = items.filter(
		(item) =>
			item.type === 'Trip' ||
			item.type === 'Insurance' ||
			item.tags.includes('travel'),
	)
	const travelDocs = input.documents.filter((document) =>
		/passport|visa|ticket|itinerary|travel|insurance/i.test(
			`${document.title} ${document.tags.join(' ')}`,
		),
	)

	const keyFindings: string[] = []

	for (const item of travelItems.slice(0, 4)) {
		keyFindings.push(`${item.title}: ${item.summary}`)
	}

	for (const document of travelDocs.slice(0, 4)) {
		const expiry = document.expiry_date
			? ` — expires ${formatDate(document.expiry_date)}`
			: ''
		keyFindings.push(`${document.title}${expiry}.`)
	}

	const dataAvailable = keyFindings.length > 0
	const prefix = input.member.memberName
		? `${input.member.memberName}'s `
		: 'Your '

	const clinical = buildClinicalAnswer({
		intent: 'find_document',
		executiveSummary: dataAvailable
			? `Here's ${prefix}travel context from Chronicle.`
			: `I don't have trip details indexed for ${prefix}upcoming travel yet.`,
		keyFindings: dataAvailable
			? keyFindings
			: [
					'No trips, visas, or travel documents found.',
					'Add flight confirmations or passport scans to Documents.',
				],
		recommendations: dataAvailable
			? [
					'Verify passport and visa expiry dates before departure.',
					'Review travel insurance coverage for your destination.',
					'Ask "Where is my passport?" to locate identity documents.',
				]
			: [
					'Upload passport and visa documents to Chronicle.',
					'Add your trip dates to keep everything in one place.',
				],
		limitations: [
			'Trip planning uses your indexed records — not live flight or hotel APIs.',
		],
	})

	return assembleTurn({
		question: input.question,
		member: input.member,
		domains: ['travel'],
		clinical,
		citations: [
			...knowledgeCitations(travelItems),
			...documentCitations(travelDocs),
		],
		confidence: dataAvailable ? 0.8 : 0.45,
		dataAvailable,
		betaExperienceId: input.experience.id,
	})
}

function handleFamilyHealthSummary(input: {
	experience: BetaExperience
	question: string
	member: IntelligenceMemberContext
	userId: string
	uploadedReports: UploadedHealthReport[]
	storedMetrics: StoredHealthMetric[]
	familyMembers: FamilyMemberWithAliases[]
}): AskConversationTurn {
	const completedReports = input.uploadedReports.filter(
		(report) => report.status === 'completed',
	)

	const memberSummaries: string[] = []
	const citations: EvidenceCitation[] = []
	let abnormalTotal = 0

	for (const familyMember of input.familyMembers) {
		const memberReports = completedReports.filter(
			(report) =>
				report.family_member_id === familyMember.id ||
				(!report.family_member_id && familyMember.isAccountOwner),
		)

		if (memberReports.length === 0) {
			memberSummaries.push(
				`${familyMember.displayName}: no health reports imported yet.`,
			)
			continue
		}

		const sorted = [...memberReports].sort(
			(a, b) =>
				Date.parse(b.report_date ?? b.uploaded_at) -
				Date.parse(a.report_date ?? a.uploaded_at),
		)
		const latest = sorted[0]!
		let memberAbnormal = 0

		const parsed = getParsedHealthReport(latest)

		if (parsed) {
			for (const metric of parsed.metrics) {
				if (ABNORMAL.has(metric.status)) {
					memberAbnormal += 1
					abnormalTotal += 1
				}
			}
		}

		memberSummaries.push(
			`${familyMember.displayName}: ${sorted.length} report${sorted.length === 1 ? '' : 's'}, latest ${formatDate(latest.report_date ?? latest.uploaded_at)}${memberAbnormal > 0 ? `, ${memberAbnormal} flagged metric${memberAbnormal === 1 ? '' : 's'}` : ', no flagged metrics'}.`,
		)

		citations.push({
			reportId: latest.id,
			reportTitle: latest.file_name ?? 'Health report',
			hospital: latest.report_type || 'Lab',
			date: latest.report_date ?? latest.uploaded_at,
			source: 'health',
		})
	}

	const dataAvailable = completedReports.length > 0

	const clinical = buildClinicalAnswer({
		intent: 'summarize_health',
		executiveSummary: dataAvailable
			? `Family health overview across ${input.familyMembers.length} member${input.familyMembers.length === 1 ? '' : 's'}.`
			: 'No family health reports are imported yet.',
		keyFindings: dataAvailable
			? [
					...memberSummaries,
					abnormalTotal > 0
						? `${abnormalTotal} flagged metric${abnormalTotal === 1 ? '' : 's'} across the family need review.`
						: 'No flagged metrics detected in latest reports.',
				]
			: [
					'Import lab reports for each family member to enable comparisons.',
					'Ask about a specific person by name once reports are added.',
				],
		recommendations: dataAvailable
			? [
					abnormalTotal > 0
						? 'Review abnormal findings for each family member individually.'
						: 'Schedule routine check-ups based on each member’s latest report dates.',
					'Ask "Summarize [name]\'s latest report" for a deeper dive.',
				]
			: [
					'Upload health reports from the Health module.',
					'Assign each report to the correct family member.',
				],
		limitations: [
			'Family summary uses imported reports only — not live clinical records.',
			'This is informational and not medical advice.',
		],
	})

	return assembleTurn({
		question: input.question,
		member: input.member,
		domains: ['health'],
		clinical,
		citations,
		confidence: dataAvailable ? 0.78 : 0.4,
		dataAvailable,
		betaExperienceId: input.experience.id,
	})
}

export function buildBetaExperienceTurn(input: {
	experience: BetaExperience
	question: string
	userId: string
	member: IntelligenceMemberContext
	documents?: ChronicleDocument[]
	uploadedReports?: UploadedHealthReport[]
	storedMetrics?: StoredHealthMetric[]
	familyMembers?: FamilyMemberWithAliases[]
	onStream?: (partial: string) => void
}): AskConversationTurn | null {
	if (input.experience.route !== 'grounded') {
		return null
	}

	let turn: AskConversationTurn

	switch (input.experience.id) {
		case 'find-document':
			turn = handleFindDocument({
				experience: input.experience,
				question: input.question,
				member: input.member,
				documents: input.documents ?? [],
			})
			break
		case 'explain-document':
			turn = handleExplainDocument({
				experience: input.experience,
				question: input.question,
				member: input.member,
				documents: input.documents ?? [],
			})
			break
		case 'monthly-financial-summary':
			turn = handleMonthlyFinancialSummary({
				experience: input.experience,
				question: input.question,
				member: input.member,
				userId: input.userId,
				documents: input.documents ?? [],
			})
			break
		case 'trip-assistant':
			turn = handleTripAssistant({
				experience: input.experience,
				question: input.question,
				member: input.member,
				userId: input.userId,
				documents: input.documents ?? [],
			})
			break
		case 'family-health-summary':
			turn = handleFamilyHealthSummary({
				experience: input.experience,
				question: input.question,
				member: input.member,
				userId: input.userId,
				uploadedReports: input.uploadedReports ?? [],
				storedMetrics: input.storedMetrics ?? [],
				familyMembers: input.familyMembers ?? [],
			})
			break
		default:
			return null
	}

	if (input.onStream) {
		input.onStream(turn.answer)
	}

	return turn
}
