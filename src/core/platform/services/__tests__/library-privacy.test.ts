import { describe, expect, it } from 'vitest'
import { buildFullQaDataset } from '@/qa/seed/build-qa-dataset'
import { QA_MEMBER_IDS } from '@/qa/qa-constants'
import { QA_PRIVACY_MARKERS } from '@/qa/seed/build-qa-privacy-trust'
import { filterDocumentsForMember } from '@/features/documents/services/document.service'

describe('library privacy filtering', () => {
	it('hides another member private documents for selected member scope', () => {
		const dataset = buildFullQaDataset()
		const scopedDocuments = filterDocumentsForMember(
			dataset.documents,
			QA_MEMBER_IDS.nivedan,
			QA_MEMBER_IDS.nivedan,
		)

		expect(
			scopedDocuments.some((doc) => doc.title.includes('Priya QA Private')),
		).toBe(false)
		expect(
			scopedDocuments.some(
				(doc) => doc.title === QA_PRIVACY_MARKERS.sharedFamilyTitle,
			),
		).toBe(true)
	})
})
