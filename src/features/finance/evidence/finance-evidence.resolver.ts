import { compareFinancialDates } from '@/features/finance-knowledge/services/finance-observation.service'
import type {
	FinanceCurrentFact,
	FinanceObservation,
} from '@/features/finance-knowledge/types/finance-history.types'
import type {
	FinanceDocumentRef,
	FinanceEntityBase,
	FinanceKnowledge,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { FinanceAskScope } from '@/features/finance/types/finance-ask.types'
import {
	formatSnapshotMoney,
	parseMoneyValue,
} from '@/features/finance-knowledge/utils/finance-money.util'
import type {
	EvidenceBundle,
	EvidenceBundleMetric,
	EvidenceBundleReport,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'finance.evidence_resolver.v1'

const CURRENT_FACT_TYPES = {
	bank_account: 'closing_balance',
	credit_card: 'total_amount_due',
	loan: 'outstanding_principal',
	investment_account: 'market_value',
} as const

type FinanceEntityKind = keyof typeof CURRENT_FACT_TYPES

interface FinanceEntityRef {
	entity: FinanceEntityBase
	kind: FinanceEntityKind
}

function listEntities(knowledge: FinanceKnowledge): FinanceEntityRef[] {
	return [
		...knowledge.bankAccounts.map((entity) => ({
			entity,
			kind: 'bank_account' as const,
		})),
		...knowledge.creditCards.map((entity) => ({
			entity,
			kind: 'credit_card' as const,
		})),
		...knowledge.loans.map((entity) => ({ entity, kind: 'loan' as const })),
		...knowledge.investmentAccounts.map((entity) => ({
			entity,
			kind: 'investment_account' as const,
		})),
	]
}

function normalizeText(value: string): string {
	return value.toLowerCase().replace(/\s+/g, ' ')
}

function entityMatchesQuestion(
	entity: FinanceEntityRef,
	question: string,
): boolean {
	const normalized = normalizeText(question)
	const tokens = [
		entity.entity.displayName,
		entity.entity.institutionName,
		entity.entity.maskedIdentifier,
	].filter(Boolean)

	return tokens.some((token) => normalized.includes(normalizeText(token!)))
}

function resolveEntityScope(
	knowledge: FinanceKnowledge,
	question: string,
	scope?: FinanceAskScope,
): FinanceEntityRef | null {
	const entities = listEntities(knowledge)

	if (scope?.entityId) {
		return entities.find((entry) => entry.entity.id === scope.entityId) ?? null
	}

	const matched = entities.filter((entry) =>
		entityMatchesQuestion(entry, question),
	)
	if (matched.length === 1) {
		return matched[0]!
	}

	if (question.includes('loan') || question.includes('home loan')) {
		return entities.find((entry) => entry.kind === 'loan') ?? null
	}

	if (question.includes('credit card') || question.includes('card')) {
		return entities.find((entry) => entry.kind === 'credit_card') ?? null
	}

	if (question.includes('investment') || question.includes('mutual fund')) {
		return entities.find((entry) => entry.kind === 'investment_account') ?? null
	}

	if (
		question.includes('bank') ||
		question.includes('account') ||
		question.includes('balance')
	) {
		return entities.find((entry) => entry.kind === 'bank_account') ?? null
	}

	return null
}

function resolveDocument(
	knowledge: FinanceKnowledge,
	documentId: string | undefined,
): FinanceDocumentRef | null {
	if (!documentId) {
		return null
	}

	return (
		knowledge.documents.find(
			(document) =>
				document.chronicleDocumentId === documentId ||
				document.id === documentId,
		) ?? null
	)
}

function getCurrentFact(
	entity: FinanceEntityBase,
	factType: string,
): FinanceCurrentFact | null {
	const candidates = entity.currentFacts.filter(
		(fact) =>
			fact.factType === factType &&
			fact.value &&
			!fact.hasConflict &&
			(fact.confidence === 'high' || fact.confidence === 'medium'),
	)

	return (
		[...candidates].sort((left, right) =>
			compareFinancialDates(left.asOfDate, right.asOfDate),
		)[0] ?? null
	)
}

function formatFactValue(value: string | null | undefined): string {
	if (!value) {
		return 'Not available yet'
	}

	const parsed = parseMoneyValue(value)
	if (parsed) {
		return formatSnapshotMoney(parsed.amount, parsed.currency)
	}

	return value
}

function documentLabel(document: FinanceDocumentRef | null): string {
	return document?.displayLabel ?? document?.title ?? 'Source document'
}

function documentFinancialDate(document: FinanceDocumentRef): string {
	return (
		document.statementPeriodEnd ??
		document.statementDate ??
		document.uploadedAt ??
		''
	)
}

function documentToReport(document: FinanceDocumentRef): EvidenceBundleReport {
	return {
		id: document.chronicleDocumentId,
		title: document.displayLabel,
		date: documentFinancialDate(document),
		lab: document.institutionName ?? 'Finance',
		metricCount: 0,
		reportType: document.subCategoryId,
	}
}

function factToMetric(input: {
	entity: FinanceEntityBase
	kind: FinanceEntityKind
	fact: FinanceCurrentFact
	document: FinanceDocumentRef | null
	temporalRole?: EvidenceBundleMetric['temporalRole']
}): EvidenceBundleMetric {
	return {
		id: `${input.entity.id}:${input.fact.factType}:${input.fact.asOfDate ?? 'current'}`,
		canonicalId: input.fact.factType,
		displayName: `${input.entity.displayName} · ${input.fact.factType.replace(/_/g, ' ')}`,
		value: formatFactValue(input.fact.value),
		unit: null,
		status: input.fact.hasConflict ? 'conflict' : 'known',
		referenceRange: input.document?.subCategoryLabel ?? '',
		observedAt: input.fact.asOfDate ?? '',
		reportId:
			input.fact.sourceDocumentId ?? input.document?.chronicleDocumentId ?? '',
		reportTitle: documentLabel(input.document),
		temporalRole: input.temporalRole ?? 'latest',
	}
}

function observationToMetric(input: {
	entity: FinanceEntityBase
	kind: FinanceEntityKind
	observation: FinanceObservation
	document: FinanceDocumentRef | null
	temporalRole: EvidenceBundleMetric['temporalRole']
}): EvidenceBundleMetric {
	return {
		id: input.observation.id,
		canonicalId: input.observation.factType,
		displayName: `${input.entity.displayName} · ${input.observation.factType.replace(/_/g, ' ')}`,
		value: formatFactValue(input.observation.value),
		unit: input.observation.unit,
		status: input.observation.isConflicting ? 'conflict' : 'known',
		referenceRange: input.document?.subCategoryLabel ?? '',
		observedAt: input.observation.asOfDate ?? '',
		reportId: input.observation.sourceDocumentId,
		reportTitle: documentLabel(input.document),
		temporalRole: input.temporalRole,
	}
}

function dedupeMetrics(
	metrics: EvidenceBundleMetric[],
): EvidenceBundleMetric[] {
	const seen = new Set<string>()
	const result: EvidenceBundleMetric[] = []

	for (const metric of metrics) {
		const key = `${metric.canonicalId}:${metric.observedAt}:${metric.value}:${metric.reportId}`
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		result.push(metric)
	}

	return result
}

function dedupeReports(
	reports: EvidenceBundleReport[],
): EvidenceBundleReport[] {
	const seen = new Set<string>()
	return reports.filter((report) => {
		if (seen.has(report.id)) {
			return false
		}

		seen.add(report.id)
		return true
	})
}

function resolveDocumentForEntity(
	knowledge: FinanceKnowledge,
	entity: FinanceEntityBase,
	documentId?: string | null,
): FinanceDocumentRef | null {
	if (documentId) {
		return resolveDocument(knowledge, documentId)
	}

	const linked = entity.sourceDocumentIds
		.map((id) => resolveDocument(knowledge, id))
		.filter((document): document is FinanceDocumentRef => document != null)
		.sort((left, right) =>
			documentFinancialDate(right).localeCompare(documentFinancialDate(left)),
		)

	return linked[0] ?? null
}

function buildCoverageLimitations(knowledge: FinanceKnowledge): string[] {
	return [
		...new Set([
			...knowledge.limitations,
			...knowledge.snapshot.coverage.limitations,
		]),
	]
}

function buildStatusOverview(
	knowledge: FinanceKnowledge,
	scopeEntity: FinanceEntityRef | null,
): EvidenceBundle {
	const entities = scopeEntity ? [scopeEntity] : listEntities(knowledge)
	const metrics: EvidenceBundleMetric[] = []
	const reports: EvidenceBundleReport[] = []
	const lines: string[] = []

	if (knowledge.snapshot.showNetWorth && knowledge.snapshot.netWorth != null) {
		lines.push(
			`Known net worth: ${formatSnapshotMoney(knowledge.snapshot.netWorth, knowledge.snapshot.currency ?? 'INR')}`,
		)
	}

	if (knowledge.snapshot.assetsTotal != null) {
		lines.push(
			`Known assets: ${formatSnapshotMoney(knowledge.snapshot.assetsTotal, knowledge.snapshot.currency ?? 'INR')}`,
		)
	}

	if (knowledge.snapshot.liabilitiesTotal != null) {
		lines.push(
			`Known liabilities: ${formatSnapshotMoney(knowledge.snapshot.liabilitiesTotal, knowledge.snapshot.currency ?? 'INR')}`,
		)
	}

	for (const entry of entities) {
		const factType = CURRENT_FACT_TYPES[entry.kind]
		const current = getCurrentFact(entry.entity, factType)
		if (!current) {
			continue
		}

		const document = resolveDocumentForEntity(
			knowledge,
			entry.entity,
			current.sourceDocumentId,
		)
		metrics.push(
			factToMetric({
				entity: entry.entity,
				kind: entry.kind,
				fact: current,
				document,
			}),
		)

		if (document) {
			reports.push(documentToReport(document))
		}

		lines.push(
			`${entry.entity.displayName}: ${formatFactValue(current.value)}${current.asOfDate ? ` · as of ${current.asOfDate}` : ''}`,
		)
	}

	const recentTimeline = [...knowledge.timeline]
		.sort((left, right) =>
			compareFinancialDates(right.eventDate, left.eventDate),
		)
		.slice(0, 5)

	for (const event of recentTimeline) {
		lines.push(`Recent change: ${event.title} · ${event.eventDate}`)
	}

	return {
		reports: dedupeReports(reports),
		metrics: dedupeMetrics(metrics),
		trends: [],
		timeline: recentTimeline.map((event) => ({
			id: event.id,
			type: event.eventType,
			title: event.title,
			description: event.entityDisplayName ?? event.description,
			date: event.eventDate,
			reportId: event.sourceDocumentIds[0],
		})),
		summary: {
			headline: scopeEntity
				? `${scopeEntity.entity.displayName} overview`
				: knowledge.snapshot.headline || knowledge.summary.headline,
			lines,
			healthScore: null,
			limitations: buildCoverageLimitations(knowledge),
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildFactLookup(
	knowledge: FinanceKnowledge,
	scopeEntity: FinanceEntityRef | null,
): EvidenceBundle {
	if (!scopeEntity) {
		return {
			reports: [],
			metrics: [],
			trends: [],
			timeline: [],
			summary: {
				headline: 'Finance fact lookup',
				lines: [],
				healthScore: null,
				limitations: [
					'Could not identify which account or loan this question refers to.',
				],
			},
			metadata: {
				questionType: 'FACT_LOOKUP',
				resolver: RESOLVER_ID,
				excluded: [],
			},
		}
	}

	const factType = CURRENT_FACT_TYPES[scopeEntity.kind]
	const current = getCurrentFact(scopeEntity.entity, factType)
	const document = resolveDocumentForEntity(
		knowledge,
		scopeEntity.entity,
		current?.sourceDocumentId,
	)

	const lines = current
		? [
				`${scopeEntity.entity.displayName}: ${formatFactValue(current.value)}`,
				current.asOfDate
					? `As of ${current.asOfDate}`
					: 'As-of date not available yet',
				document
					? `Source: ${documentLabel(document)}`
					: 'Source document not linked yet',
			]
		: ['We have not found a current value for this account yet.']

	return {
		reports: document ? [documentToReport(document)] : [],
		metrics: current
			? [
					factToMetric({
						entity: scopeEntity.entity,
						kind: scopeEntity.kind,
						fact: current,
						document,
					}),
				]
			: [],
		trends: [],
		timeline: [],
		summary: {
			headline: scopeEntity.entity.displayName,
			lines,
			healthScore: null,
			limitations: current ? buildCoverageLimitations(knowledge) : [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildEntityLookup(
	knowledge: FinanceKnowledge,
	question: string,
): EvidenceBundle {
	const normalized = normalizeText(question)
	let entities = listEntities(knowledge)

	if (normalized.includes('loan')) {
		entities = entities.filter((entry) => entry.kind === 'loan')
	} else if (normalized.includes('investment')) {
		entities = entities.filter((entry) => entry.kind === 'investment_account')
	} else if (
		normalized.includes('credit card') ||
		normalized.includes('card')
	) {
		entities = entities.filter((entry) => entry.kind === 'credit_card')
	} else if (normalized.includes('bank') || normalized.includes('account')) {
		entities = entities.filter((entry) => entry.kind === 'bank_account')
	}

	const metrics: EvidenceBundleMetric[] = []
	const reports: EvidenceBundleReport[] = []
	const lines: string[] = []

	for (const entry of entities) {
		const factType = CURRENT_FACT_TYPES[entry.kind]
		const current = getCurrentFact(entry.entity, factType)
		const document = resolveDocumentForEntity(
			knowledge,
			entry.entity,
			current?.sourceDocumentId,
		)

		if (current) {
			metrics.push(
				factToMetric({
					entity: entry.entity,
					kind: entry.kind,
					fact: current,
					document,
				}),
			)
		}

		if (document) {
			reports.push(documentToReport(document))
		}

		lines.push(
			current
				? `${entry.entity.displayName}: ${formatFactValue(current.value)}`
				: `${entry.entity.displayName}: current value not available yet`,
		)
	}

	return {
		reports: dedupeReports(reports),
		metrics: dedupeMetrics(metrics),
		trends: [],
		timeline: [],
		summary: {
			headline: 'Known financial entities',
			lines,
			healthScore: null,
			limitations: buildCoverageLimitations(knowledge),
		},
		metadata: {
			questionType: 'ENTITY_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildTrend(
	knowledge: FinanceKnowledge,
	scopeEntity: FinanceEntityRef | null,
): EvidenceBundle {
	if (!scopeEntity) {
		return {
			reports: [],
			metrics: [],
			trends: [],
			timeline: [],
			summary: {
				headline: 'Financial trend',
				lines: ['Could not identify which account or loan to trend.'],
				healthScore: null,
				limitations: buildCoverageLimitations(knowledge),
			},
			metadata: {
				questionType: 'TREND',
				resolver: RESOLVER_ID,
				excluded: [],
			},
		}
	}

	const factType = CURRENT_FACT_TYPES[scopeEntity.kind]
	const observations = scopeEntity.entity.historicalObservations
		.filter(
			(observation) =>
				observation.factType === factType &&
				observation.verified &&
				!observation.isConflicting &&
				observation.asOfDate,
		)
		.sort((left, right) => compareFinancialDates(left.asOfDate, right.asOfDate))

	if (observations.length < 2) {
		return {
			reports: [],
			metrics: [],
			trends: [],
			timeline: [],
			summary: {
				headline: `${scopeEntity.entity.displayName} trend`,
				lines: ['Not enough historical observations yet to describe a trend.'],
				healthScore: null,
				limitations: buildCoverageLimitations(knowledge),
			},
			metadata: {
				questionType: 'TREND',
				resolver: RESOLVER_ID,
				excluded: [],
			},
		}
	}

	const metrics = observations.map((observation, index) =>
		observationToMetric({
			entity: scopeEntity.entity,
			kind: scopeEntity.kind,
			observation,
			document: resolveDocumentForEntity(
				knowledge,
				scopeEntity.entity,
				observation.sourceDocumentId,
			),
			temporalRole:
				index === observations.length - 1
					? 'latest'
					: index === observations.length - 2
						? 'previous'
						: 'history',
		}),
	)

	const reports = dedupeReports(
		observations
			.map((observation) =>
				resolveDocumentForEntity(
					knowledge,
					scopeEntity.entity,
					observation.sourceDocumentId,
				),
			)
			.filter((document): document is FinanceDocumentRef => document != null)
			.map(documentToReport),
	)

	const first = observations[0]!
	const last = observations[observations.length - 1]!
	const lines = observations.map(
		(observation) =>
			`${observation.asOfDate}: ${formatFactValue(observation.value)}`,
	)

	const firstParsed = parseMoneyValue(first.value)
	const lastParsed = parseMoneyValue(last.value)
	const changePercent =
		firstParsed &&
		lastParsed &&
		firstParsed.currency === lastParsed.currency &&
		firstParsed.amount !== 0
			? ((lastParsed.amount - firstParsed.amount) / firstParsed.amount) * 100
			: null

	return {
		reports,
		metrics: dedupeMetrics(metrics),
		trends: [
			{
				metricId: `${scopeEntity.entity.id}:${factType}`,
				displayName: `${scopeEntity.entity.displayName} ${factType.replace(/_/g, ' ')}`,
				direction:
					changePercent == null
						? 'unknown'
						: changePercent > 0
							? 'up'
							: changePercent < 0
								? 'down'
								: 'stable',
				changePercent,
				dataPointCount: observations.length,
				isActionable: false,
			},
		],
		timeline: knowledge.timeline
			.filter((event) => event.entityId === scopeEntity.entity.id)
			.map((event) => ({
				id: event.id,
				type: event.eventType,
				title: event.title,
				description: event.entityDisplayName ?? event.description,
				date: event.eventDate,
				reportId: event.sourceDocumentIds[0],
			})),
		summary: {
			headline: `${scopeEntity.entity.displayName} trend`,
			lines,
			healthScore: null,
			limitations: buildCoverageLimitations(knowledge),
		},
		metadata: {
			questionType: 'TREND',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildCompare(knowledge: FinanceKnowledge): EvidenceBundle {
	const current = knowledge.snapshot
	const previous = current.historyPreview
	const entityCountNow =
		knowledge.bankAccounts.length +
		knowledge.investmentAccounts.length +
		knowledge.loans.length +
		knowledge.creditCards.length

	const coverageChanged =
		previous == null ||
		current.coverage.knownAssets !== current.assetContributions.length ||
		current.coverage.knownLiabilities !== current.liabilityContributions.length

	const lines = [
		current.assetsTotal != null
			? `Current known assets: ${formatSnapshotMoney(current.assetsTotal, current.currency ?? 'INR')}`
			: 'Current known assets: not fully available',
		current.liabilitiesTotal != null
			? `Current known liabilities: ${formatSnapshotMoney(current.liabilitiesTotal, current.currency ?? 'INR')}`
			: 'Current known liabilities: not fully available',
	]

	if (previous) {
		lines.push(
			previous.previousAssetsTotal != null
				? `Previous known assets: ${formatSnapshotMoney(previous.previousAssetsTotal, previous.currency ?? 'INR')}`
				: 'Previous known assets: not available',
			previous.previousLiabilitiesTotal != null
				? `Previous known liabilities: ${formatSnapshotMoney(previous.previousLiabilitiesTotal, previous.currency ?? 'INR')}`
				: 'Previous known liabilities: not available',
		)
	}

	const limitations = buildCoverageLimitations(knowledge)
	if (coverageChanged || entityCountNow <= 1) {
		limitations.unshift(
			'Coverage changed enough that a direct net-worth comparison may be misleading.',
		)
	}

	return {
		reports: dedupeReports(
			knowledge.documents
				.slice()
				.sort((left, right) =>
					documentFinancialDate(right).localeCompare(
						documentFinancialDate(left),
					),
				)
				.slice(0, 6)
				.map(documentToReport),
		),
		metrics: dedupeMetrics(
			listEntities(knowledge)
				.map((entry) => {
					const currentFact = getCurrentFact(
						entry.entity,
						CURRENT_FACT_TYPES[entry.kind],
					)
					if (!currentFact) {
						return null
					}

					return factToMetric({
						entity: entry.entity,
						kind: entry.kind,
						fact: currentFact,
						document: resolveDocumentForEntity(
							knowledge,
							entry.entity,
							currentFact.sourceDocumentId,
						),
					})
				})
				.filter((metric): metric is EvidenceBundleMetric => metric != null),
		),
		trends: [],
		timeline: knowledge.timeline.slice(0, 5).map((event) => ({
			id: event.id,
			type: event.eventType,
			title: event.title,
			description: event.entityDisplayName ?? event.description,
			date: event.eventDate,
			reportId: event.sourceDocumentIds[0],
		})),
		summary: {
			headline: 'Financial position comparison',
			lines,
			healthScore: null,
			limitations,
		},
		metadata: {
			questionType: 'COMPARE',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildLatestReport(
	knowledge: FinanceKnowledge,
	scopeEntity: FinanceEntityRef | null,
): EvidenceBundle {
	const documents = knowledge.documents
		.filter((document) => {
			if (scopeEntity) {
				return scopeEntity.entity.sourceDocumentIds.includes(
					document.chronicleDocumentId,
				)
			}

			return true
		})
		.sort((left, right) =>
			documentFinancialDate(right).localeCompare(documentFinancialDate(left)),
		)

	const latest = documents[0] ?? null
	const lines = latest
		? [
				latest.displayLabel,
				latest.subCategoryLabel ?? 'Financial document',
				documentFinancialDate(latest)
					? `Statement date ${documentFinancialDate(latest)}`
					: 'Statement date not available yet',
				latest.linkedEntityName ? `Entity: ${latest.linkedEntityName}` : '',
			].filter(Boolean)
		: ['No financial statements found yet.']

	return {
		reports: latest ? [documentToReport(latest)] : [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: latest
				? 'Latest financial statement'
				: 'Latest financial statement',
			lines,
			healthScore: null,
			limitations: buildCoverageLimitations(knowledge),
		},
		metadata: {
			questionType: 'LATEST_REPORT',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildExplain(knowledge: FinanceKnowledge): EvidenceBundle {
	const snapshot = knowledge.snapshot
	const lines = [
		snapshot.assetsTotal != null
			? `Known assets: ${formatSnapshotMoney(snapshot.assetsTotal, snapshot.currency ?? 'INR')}`
			: 'Known assets: not fully available',
		snapshot.liabilitiesTotal != null
			? `Known liabilities: ${formatSnapshotMoney(snapshot.liabilitiesTotal, snapshot.currency ?? 'INR')}`
			: 'Known liabilities: not fully available',
	]

	if (
		snapshot.historyPreview?.previousNetWorth != null &&
		snapshot.netWorth != null
	) {
		lines.push(
			`Known net worth moved from ${formatSnapshotMoney(snapshot.historyPreview.previousNetWorth, snapshot.currency ?? 'INR')} to ${formatSnapshotMoney(snapshot.netWorth, snapshot.currency ?? 'INR')}`,
		)
	}

	for (const event of knowledge.timeline.slice(-5)) {
		if (event.metadata.previousValue && event.metadata.currentValue) {
			lines.push(
				`${event.title}: ${formatFactValue(event.metadata.previousValue)} → ${formatFactValue(event.metadata.currentValue)}`,
			)
		}
	}

	return {
		reports: dedupeReports(
			knowledge.documents.slice(0, 5).map(documentToReport),
		),
		metrics: dedupeMetrics(
			listEntities(knowledge)
				.map((entry) => {
					const current = getCurrentFact(
						entry.entity,
						CURRENT_FACT_TYPES[entry.kind],
					)
					if (!current) {
						return null
					}

					return factToMetric({
						entity: entry.entity,
						kind: entry.kind,
						fact: current,
						document: resolveDocumentForEntity(
							knowledge,
							entry.entity,
							current.sourceDocumentId,
						),
					})
				})
				.filter((metric): metric is EvidenceBundleMetric => metric != null),
		),
		trends: [],
		timeline: knowledge.timeline.slice(-5).map((event) => ({
			id: event.id,
			type: event.eventType,
			title: event.title,
			description: event.entityDisplayName ?? event.description,
			date: event.eventDate,
			reportId: event.sourceDocumentIds[0],
		})),
		summary: {
			headline: 'What changed in your finances',
			lines,
			healthScore: null,
			limitations: [
				...buildCoverageLimitations(knowledge),
				'Chronicle reports observed changes only; it does not infer causes beyond the evidence.',
			],
		},
		metadata: {
			questionType: 'EXPLAIN',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildCoverage(knowledge: FinanceKnowledge): EvidenceBundle {
	const unclassified = knowledge.documents.filter(
		(document) =>
			document.subCategoryId === 'other' ||
			document.classificationConfidence === 'low' ||
			document.consumerStatus === 'organizing',
	)

	const lines = [
		`${knowledge.documentCount} financial document${knowledge.documentCount === 1 ? '' : 's'} organized`,
		`${knowledge.bankAccounts.length} bank account${knowledge.bankAccounts.length === 1 ? '' : 's'}`,
		`${knowledge.investmentAccounts.length} investment account${knowledge.investmentAccounts.length === 1 ? '' : 's'}`,
		`${knowledge.loans.length} loan${knowledge.loans.length === 1 ? '' : 's'}`,
		`${knowledge.creditCards.length} credit card${knowledge.creditCards.length === 1 ? '' : 's'}`,
		knowledge.coverage.incompleteDocumentCount > 0
			? `${knowledge.coverage.incompleteDocumentCount} record${knowledge.coverage.incompleteDocumentCount === 1 ? '' : 's'} still need review`
			: 'No incomplete records flagged',
		knowledge.coverage.ambiguousEntityCount > 0
			? `${knowledge.coverage.ambiguousEntityCount} account${knowledge.coverage.ambiguousEntityCount === 1 ? '' : 's'} need ownership review`
			: 'No ownership ambiguity flagged',
		unclassified.length > 0
			? `${unclassified.length} unclassified financial document${unclassified.length === 1 ? '' : 's'}`
			: 'No unclassified financial documents flagged',
	]

	return {
		reports: dedupeReports(
			knowledge.documents.slice(0, 8).map(documentToReport),
		),
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Finance coverage',
			lines,
			healthScore: null,
			limitations: [
				...buildCoverageLimitations(knowledge),
				'Chronicle only knows what is present in organized financial records.',
			],
		},
		metadata: {
			questionType: 'COVERAGE',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

export function resolveFinanceEvidence(input: {
	knowledge: FinanceKnowledge
	request: EvidenceRequest
	scope?: FinanceAskScope
}): EvidenceBundle {
	const scopeEntity = resolveEntityScope(
		input.knowledge,
		input.request.question,
		input.scope,
	)

	switch (input.request.questionType) {
		case 'FACT_LOOKUP':
			return buildFactLookup(input.knowledge, scopeEntity)
		case 'ENTITY_LOOKUP':
			return buildEntityLookup(input.knowledge, input.request.question)
		case 'TREND':
			return buildTrend(input.knowledge, scopeEntity)
		case 'COMPARE':
			return buildCompare(input.knowledge)
		case 'LATEST_REPORT':
			return buildLatestReport(input.knowledge, scopeEntity)
		case 'EXPLAIN':
			return buildExplain(input.knowledge)
		case 'COVERAGE':
			return buildCoverage(input.knowledge)
		case 'STATUS_OVERVIEW':
		default:
			return buildStatusOverview(input.knowledge, scopeEntity)
	}
}

export function supportsFinanceEvidenceQuestion(
	questionType: QuestionType,
): boolean {
	return [
		'STATUS_OVERVIEW',
		'FACT_LOOKUP',
		'ENTITY_LOOKUP',
		'TREND',
		'COMPARE',
		'LATEST_REPORT',
		'EXPLAIN',
		'COVERAGE',
	].includes(questionType)
}

export function isFinanceCoverageQuestion(question: string): boolean {
	return /do you have all|everything covered|all my financial|missing categories|complete financial|all my investments here|all my financial information/i.test(
		question,
	)
}

export function isFinanceEntityLookupQuestion(question: string): boolean {
	return /what loans|what investments|what credit cards|what accounts|what banks|major liabilities|list my loans|list my investments/i.test(
		question,
	)
}
