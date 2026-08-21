import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import { QA_MEMBER_IDS, QA_USER_ID } from '@/qa/qa-constants'
import type { QaDataset } from '@/qa/seed/build-qa-dataset'

const NOW = '2026-08-01T10:00:00.000Z'

/** Stable secret values used by privacy trust tests — QA only. */
export const QA_PRIVACY_MARKERS = {
	nivedanLdl: '118',
	priyaLdl: '99',
	nivedanPassport: 'QA1234567',
	advikaPassport: 'QA7654321',
	raviPassport: 'RAVI-PASS-5544',
	priyaInsurancePolicy: 'PRIYA-INS-PRIVATE-001',
	sharedFamilyTitle: 'QA Shared Family Insurance Summary',
} as const

function trustDoc(
	input: Partial<ChronicleDocument> &
		Pick<ChronicleDocument, 'id' | 'category_id' | 'title' | 'file_name'>,
): ChronicleDocument {
	return {
		user_id: QA_USER_ID,
		family_member_id: QA_MEMBER_IDS.nivedan,
		sub_category_id: null,
		storage_path: `qa/trust/${input.id}.pdf`,
		mime_type: 'application/pdf',
		issue_date: '2026-01-15',
		expiry_date: null,
		issuer: 'QA Trust Issuer',
		document_number: null,
		tags: ['qa', 'privacy-trust'],
		notes: null,
		status: 'active',
		source: 'upload',
		connector_id: null,
		external_file_id: null,
		connector_registry_id: null,
		extracted_text: 'Synthetic privacy trust document.',
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: NOW,
		created_at: NOW,
		updated_at: NOW,
		...input,
	}
}

export function enrichQaDatasetForPrivacyTrust(dataset: QaDataset): QaDataset {
	const priyaHealthReport: UploadedHealthReport = {
		user_id: QA_USER_ID,
		family_member_id: QA_MEMBER_IDS.wife,
		storage_path: 'qa/trust/priya-lipid.pdf',
		report_date: '2026-07-01',
		report_type: 'lipid',
		uploaded_at: NOW,
		created_at: NOW,
		status: 'completed',
		extracted_text: 'Priya private lipid panel',
		parsed_data: {
			metrics: [
				{
					canonicalId: 'ldl',
					displayName: 'LDL Cholesterol',
					value: QA_PRIVACY_MARKERS.priyaLdl,
					unit: 'mg/dL',
					status: 'normal',
				},
			],
			metadata: { reportDate: '2026-07-01', laboratory: 'QA Labs' },
		},
		ocr_page_count: 1,
		ocr_confidence: 0.95,
		ocr_provider: 'qa',
		ocr_processing_time_ms: 100,
		ocr_metadata: {},
		processed_at: NOW,
		processing_error: null,
		id: 'qa-trust-priya-lipid-report',
		file_name: 'Priya-Lipid-Jul-2026.pdf',
	}

	const priyaMetric: StoredHealthMetric = {
		id: 'qa-trust-metric-priya-ldl',
		user_id: QA_USER_ID,
		family_member_id: QA_MEMBER_IDS.wife,
		report_id: 'qa-trust-priya-lipid-report',
		workflow_item_id: null,
		canonical_metric_id: 'ldl',
		display_name: 'LDL Cholesterol',
		raw_name: 'LDL',
		value: QA_PRIVACY_MARKERS.priyaLdl,
		numeric_value: 99,
		unit: 'mg/dL',
		reference_range_raw: '< 100',
		reference_lower: null,
		reference_upper: 100,
		status: 'normal',
		category: 'heart',
		report_date: '2026-07-01',
		observed_at: '2026-07-01T00:00:00.000Z',
		confidence: 0.9,
		source: 'parser',
		created_at: NOW,
	}

	const trustDocuments: ChronicleDocument[] = [
		trustDoc({
			id: 'qa-trust-priya-insurance',
			category_id: 'insurance',
			sub_category_id: 'health-insurance',
			title: 'Priya QA Private Health Policy',
			file_name: 'priya-private-health.pdf',
			family_member_id: QA_MEMBER_IDS.wife,
			document_number: QA_PRIVACY_MARKERS.priyaInsurancePolicy,
			expiry_date: '2027-06-30',
		}),
		trustDoc({
			id: 'qa-trust-ravi-passport',
			category_id: 'identity',
			sub_category_id: 'passport',
			title: 'Ravi QA Passport',
			file_name: 'ravi-passport.pdf',
			family_member_id: QA_MEMBER_IDS.parent,
			document_number: QA_PRIVACY_MARKERS.raviPassport,
			expiry_date: '2029-01-01',
		}),
		trustDoc({
			id: 'qa-trust-priya-finance',
			category_id: 'financial',
			sub_category_id: 'bank-statement',
			title: 'Priya QA Private Savings Statement',
			file_name: 'priya-savings.pdf',
			family_member_id: QA_MEMBER_IDS.wife,
			extracted_metadata: {
				financeDisplayLabel: 'Priya Private Savings',
				accountBalance: '88000',
			},
		}),
		trustDoc({
			id: 'qa-trust-ravi-property',
			category_id: 'property',
			sub_category_id: 'registration',
			title: 'Ravi QA Property Deed',
			file_name: 'ravi-property-deed.pdf',
			family_member_id: QA_MEMBER_IDS.parent,
		}),
		trustDoc({
			id: 'qa-trust-priya-vehicle',
			category_id: 'vehicles',
			sub_category_id: 'registration-certificate',
			title: 'Priya QA Vehicle RC',
			file_name: 'priya-vehicle-rc.pdf',
			family_member_id: QA_MEMBER_IDS.wife,
			extracted_metadata: { vehicleName: 'Priya City Run' },
		}),
		trustDoc({
			id: 'qa-trust-shared-family-insurance',
			category_id: 'insurance',
			sub_category_id: 'health-insurance',
			title: QA_PRIVACY_MARKERS.sharedFamilyTitle,
			file_name: 'shared-family-insurance.pdf',
			family_member_id: null,
			extracted_metadata: { privacyScope: 'shared' },
			expiry_date: '2026-12-31',
		}),
	]

	return {
		...dataset,
		documents: [...dataset.documents, ...trustDocuments],
		healthReports: [...dataset.healthReports, priyaHealthReport],
		healthMetrics: [...dataset.healthMetrics, priyaMetric],
	}
}
