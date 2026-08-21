import { describe, expect, it } from 'vitest'
import {
	MODULE_LIFECYCLE_ALIASES,
	MODULE_UX_COPY,
	DOCUMENT_CONSUMER_STATUS_LABELS,
	resolveConsumerDocumentStatusLabel,
	moduleAttentionCountMessage,
	moduleEmptyMessage,
	moduleOrganizingMessage,
} from '@/features/modules/contracts/module-ux.contract'

describe('module-ux.contract', () => {
	it('defines consumer-friendly organizing copy without pipeline jargon', () => {
		expect(MODULE_UX_COPY.organizing.short).not.toMatch(
			/OCR|pipeline|processing|indexed/i,
		)
		expect(MODULE_UX_COPY.organizingPolicies.body).not.toMatch(
			/processing completes/i,
		)
	})

	it('maps hub card states to lifecycle states', () => {
		expect(MODULE_LIFECYCLE_ALIASES.setup_required).toBe('NOT_SETUP')
		expect(MODULE_LIFECYCLE_ALIASES.active).toBe('READY')
		expect(MODULE_LIFECYCLE_ALIASES.organizing).toBe('ORGANIZING')
	})

	it('builds domain-appropriate helper messages', () => {
		expect(moduleOrganizingMessage('policies')).toBe(
			'Organizing your policies…',
		)
		expect(moduleEmptyMessage('insurance policies')).toBe(
			'No insurance policies found yet.',
		)
		expect(moduleAttentionCountMessage(2, 'document')).toBe(
			'2 documents need attention',
		)
	})

	it('maps library status labels to consumer-friendly copy', () => {
		expect(resolveConsumerDocumentStatusLabel('Needs Help')).toBe(
			DOCUMENT_CONSUMER_STATUS_LABELS.needsReview,
		)
		expect(resolveConsumerDocumentStatusLabel('Still Organizing')).toBe(
			DOCUMENT_CONSUMER_STATUS_LABELS.organizing,
		)
		expect(DOCUMENT_CONSUMER_STATUS_LABELS.organizing).not.toMatch(
			/OCR|pipeline|processing/i,
		)
	})
})
