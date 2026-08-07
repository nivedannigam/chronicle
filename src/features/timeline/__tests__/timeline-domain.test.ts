import { describe, expect, it } from 'vitest'
import { detectIntent } from '@/features/ask/retrieval/intent-detector'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { TimelineKnowledgeProvider } from '@/features/intelligence/providers/timeline-knowledge.provider'
import { getRegisteredTimelineProviderIds } from '@/features/timeline/registry/timeline-registry'
import '@/features/timeline/providers/register-timeline-providers'
import {
	buildTimelineEvents,
	buildTimelinePreview,
	filterTimelineEvents,
	groupTimelineByMonth,
	resolveTimelineYearFilter,
} from '@/features/timeline'

function createReport(
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: 'cbc_report.pdf',
		storage_path: 'user-1/report-1.pdf',
		status: 'completed',
		report_type: 'Complete Blood Count',
		report_date: '2025-06-15',
		uploaded_at: '2025-06-16T10:00:00.000Z',
		processed_at: '2025-06-16T11:00:00.000Z',
		source: 'upload',
		external_file_id: null,
		connector_id: null,
		connector_registry_id: null,
		ocr_text: null,
		ocr_metadata: {},
		parsed_report: null,
		parsed_data: {
			metrics: [
				{
					canonicalId: 'ldl',
					displayName: 'LDL',
					value: '100',
					unit: 'mg/dL',
					status: 'normal',
				},
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportType: 'Complete Blood Count',
			},
		},
		...overrides,
	} as UploadedHealthReport
}

function createDocument(
	overrides: Partial<ChronicleDocument> = {},
): ChronicleDocument {
	return {
		id: 'doc-1',
		user_id: 'user-1',
		family_member_id: 'member-1',
		category_id: 'identity',
		sub_category_id: 'passport',
		title: 'Passport (N1234567)',
		file_name: 'passport.pdf',
		storage_path: 'user-1/doc-1_passport.pdf',
		mime_type: 'application/pdf',
		issue_date: '2020-01-15',
		expiry_date: '2030-06-30',
		issuer: 'Passport Office',
		document_number: 'N1234567',
		tags: ['travel'],
		notes: null,
		status: 'active',
		source: 'upload',
		connector_id: null,
		external_file_id: null,
		connector_registry_id: null,
		extracted_text: null,
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: '2026-01-10T10:00:00.000Z',
		created_at: '2026-01-10T10:00:00.000Z',
		updated_at: '2026-01-10T10:00:00.000Z',
		...overrides,
	}
}

describe('timeline provider registry', () => {
	it('registers health and documents timeline providers', () => {
		expect(getRegisteredTimelineProviderIds()).toEqual(
			expect.arrayContaining(['health', 'documents']),
		)
	})
})

describe('timeline engine', () => {
	it('merges health and document events chronologically', () => {
		const result = buildTimelineEvents({
			userId: 'user-1',
			memberId: 'member-1',
			sources: {
				health: { uploadedReports: [createReport()] },
				documents: { uploadedDocuments: [createDocument()] },
			},
		})

		expect(result.totalCount).toBeGreaterThan(0)
		expect(result.events.some((event) => event.sourceModule === 'health')).toBe(
			true,
		)
		expect(
			result.events.some((event) => event.sourceModule === 'documents'),
		).toBe(true)
		expect(
			result.events.every((event) => event.eventType !== 'report_imported'),
		).toBe(true)
	})

	it('filters events by module and search query', () => {
		const events = buildTimelineEvents({
			userId: 'user-1',
			sources: {
				health: { uploadedReports: [createReport()] },
				documents: {
					uploadedDocuments: [createDocument({ title: 'Passport (N1234567)' })],
				},
			},
		}).events

		const passportMatches = filterTimelineEvents(events, {
			searchQuery: 'passport',
		})

		expect(
			passportMatches.every((event) =>
				/passport/i.test(event.summary + event.title),
			),
		).toBe(true)

		const healthOnly = filterTimelineEvents(events, {
			modules: ['health'],
		})

		expect(healthOnly.every((event) => event.sourceModule === 'health')).toBe(
			true,
		)
	})

	it('groups events by month', () => {
		const events = buildTimelineEvents({
			userId: 'user-1',
			sources: {
				documents: { uploadedDocuments: [createDocument()] },
			},
		}).events

		const groups = groupTimelineByMonth(events)

		expect(groups.length).toBeGreaterThan(0)
		expect(groups[0]?.events.length).toBeGreaterThan(0)
	})

	it('builds a meaningful preview set', () => {
		const preview = buildTimelinePreview({
			userId: 'user-1',
			sources: {
				health: { uploadedReports: [createReport()] },
				documents: { uploadedDocuments: [createDocument()] },
			},
		})

		expect(preview.length).toBeLessThanOrEqual(5)
		expect(preview.length).toBeGreaterThan(0)
	})

	it('resolves year filters from natural language', () => {
		expect(resolveTimelineYearFilter('What happened last year')).toEqual({
			fromDate: `${new Date().getFullYear() - 1}-01-01`,
			toDate: `${new Date().getFullYear() - 1}-12-31`,
		})

		expect(resolveTimelineYearFilter('What changed in 2025')).toEqual({
			fromDate: '2025-01-01',
			toDate: '2025-12-31',
		})
	})
})

describe('timeline ask intents', () => {
	it('detects timeline questions', () => {
		expect(detectIntent('What happened last year?').intent).toBe(
			'timeline_query',
		)
		expect(detectIntent('Show everything related to my passport').intent).toBe(
			'timeline_search',
		)
		expect(detectIntent('When was my last health check?').intent).toBe(
			'timeline_last_event',
		)
	})
})

describe('timeline knowledge provider', () => {
	const provider = new TimelineKnowledgeProvider()

	it('supports timeline intents when events exist', () => {
		const query = {
			userId: 'user-1',
			question: 'What happened last year?',
			resolvedQuestion: 'What happened last year?',
			intent: 'timeline_query' as const,
			sources: {
				health: { uploadedReports: [createReport()] },
				documents: { uploadedDocuments: [createDocument()] },
			},
			member: {
				memberId: 'member-1',
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
		}

		expect(provider.supports(query)).toBe(true)

		const context = provider.retrieveContext(query)

		expect(context.available).toBe(true)
		expect(context.package?.summaryLines.length).toBeGreaterThan(0)
	})
})
