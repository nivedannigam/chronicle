import { describe, expect, it } from 'vitest'
import {
	buildAttentionItems,
	buildCommandCenterBriefing,
	buildUnifiedSearchResults,
} from '@/features/command-center/services/command-center.service'
import {
	getCommandCenterWidgets,
	getDefaultQuickActions,
} from '@/features/command-center/widgets/widget-registry'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { UploadedHealthReport } from '@/features/health/types'

function createMember(
	overrides: Partial<FamilyMemberWithAliases> = {},
): FamilyMemberWithAliases {
	return {
		id: 'member-1',
		familyId: 'family-1',
		displayName: 'Alex',
		relationship: 'Self',
		roleId: 'owner',
		isAccountOwner: true,
		status: 'active',
		avatarUrl: null,
		dateOfBirth: null,
		aliases: [],
		...overrides,
	} as FamilyMemberWithAliases
}

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
		...overrides,
	} as UploadedHealthReport
}

function createDocument(
	overrides: Partial<ChronicleDocument> = {},
): ChronicleDocument {
	const expiry = new Date()
	expiry.setDate(expiry.getDate() + 45)

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
		expiry_date: expiry.toISOString().slice(0, 10),
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

describe('command center widget registry', () => {
	it('includes enabled module widgets', () => {
		const widgets = getCommandCenterWidgets()
		expect(
			widgets.some(
				(widget) => widget.id === 'health' || widget.id === 'documents',
			),
		).toBe(true)
		expect(widgets.some((widget) => widget.id === 'documents')).toBe(true)
		expect(widgets.some((widget) => widget.id === 'timeline')).toBe(true)
	})

	it('provides quick actions for enabled modules', () => {
		const actions = getDefaultQuickActions()
		expect(actions.some((action) => action.id === 'ask')).toBe(true)
		expect(actions.some((action) => action.id === 'import-documents')).toBe(
			true,
		)
	})
})

describe('command center briefing', () => {
	it('builds member summaries and attention items', () => {
		const briefing = buildCommandCenterBriefing({
			userId: 'user-1',
			familyName: 'Patel Family',
			members: [createMember()],
			reports: [],
			documents: [createDocument()],
			metricHistories: [],
			loading: {
				family: false,
				health: false,
				documents: false,
				timeline: false,
			},
		})

		expect(briefing.memberSummaries).toHaveLength(1)
		expect(briefing.memberSummaries[0]?.documentCount).toBe(1)
		expect(
			briefing.attentionItems.some((item) => item.module === 'documents'),
		).toBe(true)
	})

	it('flags missing health reports in attention center', () => {
		const items = buildAttentionItems({
			members: [createMember()],
			reports: [],
			documents: [],
			metricHistories: [],
			accountOwnerMemberId: 'member-1',
		})

		expect(items.some((item) => item.id.startsWith('missing-health-'))).toBe(
			true,
		)
	})
})

describe('unified search', () => {
	it('finds passport and health terms across domains', () => {
		const results = buildUnifiedSearchResults({
			query: 'passport',
			reports: [createReport()],
			documents: [createDocument()],
			userId: 'user-1',
		})

		expect(results.some((result) => result.source === 'documents')).toBe(true)
	})
})
