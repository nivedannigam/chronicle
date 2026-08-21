import { describe, expect, it } from 'vitest'
import {
	runModuleDocumentIntegrityAudit,
	runPlatformIntegrityAudit,
	formatPlatformIntegrityAuditReport,
} from '@/core/platform/services/platform-integrity-audit.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

describe('platform integrity audit', () => {
	it('reports aligned counts when library and module counts match', () => {
		const documents = [
			{
				id: 'doc-1',
				category_id: 'financial',
				family_member_id: null,
			},
		] as ChronicleDocument[]

		const result = runModuleDocumentIntegrityAudit({
			moduleId: 'finance',
			documents,
			moduleDocumentCount: 1,
		})

		expect(result.libraryDocumentCount).toBe(1)
		expect(result.countsAligned).toBe(true)
	})

	it('builds a cross-module platform audit report', () => {
		const result = runPlatformIntegrityAudit({
			documents: [],
		})

		expect(result.modules).toHaveLength(6)
		expect(formatPlatformIntegrityAuditReport(result)).toContain(
			'Chronicle Platform Integrity Audit',
		)
	})
})
