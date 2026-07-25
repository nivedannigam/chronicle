import { describe, expect, it, beforeEach } from 'vitest'
import { contextBuilder } from '@/features/intelligence/context/context-builder'
import { createEmptyContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import type { ChronicleKnowledgeProvider } from '@/features/intelligence/contracts/knowledge-provider.contract'
import { mergeProviderPackages } from '@/features/intelligence/orchestrator/context-merger'
import { runKnowledgeOrchestrator } from '@/features/intelligence/orchestrator/knowledge-orchestrator'
import {
	clearKnowledgeProviders,
	getRegisteredProviderIds,
	registerKnowledgeProvider,
} from '@/features/intelligence/registry/intelligence-registry'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import type { IntentDetectionResult } from '@/features/ask/retrieval/intent-detector'

const MEMBER = {
	memberId: 'member-1',
	memberName: 'Alex',
	familyMemberNames: ['Alex'],
}

function mockDetection(
	overrides: Partial<IntentDetectionResult> = {},
): IntentDetectionResult {
	return {
		intent: 'general_health',
		confidence: 0.9,
		...overrides,
	}
}

function createMockProvider(input: {
	id: string
	domain: 'health' | 'finance'
	supports: boolean
	shouldThrow?: boolean
	documentTitle?: string
}): ChronicleKnowledgeProvider {
	return {
		id: input.id,
		domain: input.domain,
		label: input.domain,
		priority: input.domain === 'health' ? 10 : 20,
		supports: () => input.supports,
		search: () =>
			input.supports
				? ([
						{
							id: `${input.id}-hit`,
							domain: input.domain,
							kind: 'report',
							title: input.documentTitle ?? `${input.domain} report`,
							snippet: 'sample snippet',
							score: 0.8,
							reportId: `${input.id}-doc-1`,
							date: '2026-01-15',
						},
					] satisfies SemanticSearchHit[])
				: [],
		retrieveContext: () => {
			if (input.shouldThrow) {
				throw new Error(`${input.id} failed`)
			}

			if (!input.supports) {
				return {
					providerId: input.id,
					domain: input.domain,
					available: false,
					package: null,
				}
			}

			const pkg = createEmptyContextPackage()
			pkg.documents.push({
				id: `${input.id}-doc-1`,
				title: input.documentTitle ?? `${input.domain} report`,
				date: '2026-01-15',
				category: input.domain,
				summary: `${input.domain} summary`,
				sourceProvider: input.id,
				sourceDomain: input.domain,
			})
			pkg.metrics.push({
				id: `${input.id}-metric-1`,
				canonicalId: 'hemoglobin',
				displayName: 'Hemoglobin',
				value: '13.5',
				unit: 'g/dL',
				status: 'normal',
				referenceRange: '12-16',
				trend: 'stable',
				observedAt: '2026-01-15',
				documentId: `${input.id}-doc-1`,
				documentTitle: input.documentTitle ?? `${input.domain} report`,
				sourceProvider: input.id,
			})
			pkg.references.push({
				id: `${input.id}-ref-1`,
				documentId: `${input.id}-doc-1`,
				documentTitle: input.documentTitle ?? `${input.domain} report`,
				metricName: 'Hemoglobin',
				date: '2026-01-15',
				source: input.domain,
				sourceProvider: input.id,
			})
			pkg.summaryLines.push(`${input.domain} context ready`)

			return {
				providerId: input.id,
				domain: input.domain,
				available: true,
				package: pkg,
			}
		},
		retrieveTimeline: () => [],
		retrieveEntities: (query) =>
			createMockProvider(input).retrieveContext(query).package?.documents ?? [],
		retrieveMetrics: (query) =>
			createMockProvider(input).retrieveContext(query).package?.metrics ?? [],
		retrieveEvidence: (query) =>
			createMockProvider(input).retrieveContext(query).package?.references ??
			[],
	}
}

describe('Knowledge Platform architecture', () => {
	beforeEach(() => {
		clearKnowledgeProviders()
	})

	it('registers providers dynamically via self-registration', () => {
		registerKnowledgeProvider(
			createMockProvider({ id: 'alpha', domain: 'health', supports: true }),
		)
		registerKnowledgeProvider(
			createMockProvider({ id: 'beta', domain: 'finance', supports: true }),
		)

		expect(getRegisteredProviderIds()).toEqual(['alpha', 'beta'])
	})

	it('orchestrator invokes multiple providers and merges context', () => {
		registerKnowledgeProvider(
			createMockProvider({
				id: 'health',
				domain: 'health',
				supports: true,
				documentTitle: 'CBC Report',
			}),
		)
		registerKnowledgeProvider(
			createMockProvider({
				id: 'finance',
				domain: 'finance',
				supports: true,
				documentTitle: 'Tax Statement',
			}),
		)

		const result = runKnowledgeOrchestrator({
			query: {
				userId: 'user-1',
				question: 'Summarize my records',
				member: MEMBER,
				sources: {
					health: { uploadedReports: [{}] },
					finance: { accounts: [{}] },
				},
			},
			resolvedQuestion: 'Summarize my records',
			detection: mockDetection(),
		})

		expect(result.activeDomains).toEqual(['health', 'finance'])
		expect(result.mergedKnowledge?.reports).toHaveLength(2)
		expect(result.dataAvailable).toBe(true)
	})

	it('context builder preserves citations after ranking and trimming', () => {
		const pkg = createEmptyContextPackage()
		pkg.documents.push({
			id: 'doc-1',
			title: 'Latest Report',
			date: '2026-03-01',
			category: 'health',
			summary: 'summary',
			sourceProvider: 'health',
			sourceDomain: 'health',
		})
		pkg.references.push({
			id: 'ref-1',
			documentId: 'doc-1',
			documentTitle: 'Latest Report',
			date: '2026-03-01',
			source: 'health',
			sourceProvider: 'health',
		})

		const built = contextBuilder.build({
			package: pkg,
			searchHits: [
				{
					id: 'hit-1',
					domain: 'health',
					kind: 'report',
					title: 'Latest Report',
					snippet: 'snippet',
					score: 0.9,
					reportId: 'doc-1',
					date: '2026-03-01',
				},
			],
			activeDomains: ['health'],
		})

		expect(
			built.citations.some((citation) => citation.documentId === 'doc-1'),
		).toBe(true)
		expect(built.contextJson).toContain('Latest Report')
	})

	it('merges provider packages without duplicate documents', () => {
		const pkg = createEmptyContextPackage()
		pkg.documents.push({
			id: 'shared-doc',
			title: 'Shared',
			date: '2026-01-01',
			category: 'health',
			summary: 'one',
			sourceProvider: 'health',
			sourceDomain: 'health',
		})

		const merged = mergeProviderPackages([
			{
				providerId: 'health',
				domain: 'health',
				available: true,
				package: pkg,
			},
			{
				providerId: 'health-copy',
				domain: 'health',
				available: true,
				package: {
					...createEmptyContextPackage(),
					documents: [{ ...pkg.documents[0]! }],
				},
			},
		])

		expect(merged.package.documents).toHaveLength(1)
	})

	it('isolates provider failures without breaking orchestration', () => {
		registerKnowledgeProvider(
			createMockProvider({
				id: 'healthy',
				domain: 'health',
				supports: true,
			}),
		)
		registerKnowledgeProvider(
			createMockProvider({
				id: 'broken',
				domain: 'finance',
				supports: true,
				shouldThrow: true,
			}),
		)

		const result = runKnowledgeOrchestrator({
			query: {
				userId: 'user-1',
				question: 'Show records',
				member: MEMBER,
				sources: {
					health: { uploadedReports: [{}] },
					finance: { accounts: [{}] },
				},
			},
			resolvedQuestion: 'Show records',
			detection: mockDetection(),
		})

		expect(result.providerErrors).toHaveLength(1)
		expect(result.providerErrors[0]?.providerId).toBe('broken')
		expect(result.activeDomains).toEqual(['health'])
		expect(result.dataAvailable).toBe(true)
	})
})
