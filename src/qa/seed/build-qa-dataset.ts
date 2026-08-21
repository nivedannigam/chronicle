import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'
import type { VehicleKnowledgeRawData } from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'
import {
	buildEmptyQaVehicleKnowledgeRawData,
	buildFullQaVehicleKnowledgeRawData,
} from '@/qa/seed/build-qa-vehicle-knowledge'
import { enrichQaDatasetForPrivacyTrust } from '@/qa/seed/build-qa-privacy-trust'
import { QA_FAMILY_ID, QA_MEMBER_IDS, QA_USER_ID } from '@/qa/qa-constants'

const NOW = '2026-08-01T10:00:00.000Z'

function doc(
	input: Partial<ChronicleDocument> &
		Pick<ChronicleDocument, 'id' | 'category_id' | 'title' | 'file_name'>,
): ChronicleDocument {
	return {
		user_id: QA_USER_ID,
		family_member_id: QA_MEMBER_IDS.nivedan,
		sub_category_id: null,
		storage_path: `qa/${input.id}.pdf`,
		mime_type: 'application/pdf',
		issue_date: '2026-01-15',
		expiry_date: null,
		issuer: 'QA Synthetic Issuer',
		document_number: null,
		tags: ['qa'],
		notes: null,
		status: 'active',
		source: 'upload',
		connector_id: null,
		external_file_id: null,
		connector_registry_id: null,
		extracted_text: 'Synthetic QA document body.',
		extracted_metadata: {},
		knowledge_refs: [],
		audit: [],
		uploaded_at: NOW,
		created_at: NOW,
		updated_at: NOW,
		...input,
	}
}

function healthReport(
	overrides: Partial<UploadedHealthReport> & { id: string; file_name: string },
): UploadedHealthReport {
	return {
		user_id: QA_USER_ID,
		family_member_id: QA_MEMBER_IDS.nivedan,
		storage_path: `qa/health/${overrides.id}.pdf`,
		report_date: '2026-07-15',
		report_type: 'general',
		uploaded_at: NOW,
		created_at: NOW,
		status: 'completed',
		extracted_text: 'Synthetic lab report',
		parsed_data: { metrics: [], metadata: { laboratory: 'QA Labs' } },
		ocr_page_count: 1,
		ocr_confidence: 0.95,
		ocr_provider: 'qa',
		ocr_processing_time_ms: 100,
		ocr_metadata: {},
		processed_at: NOW,
		processing_error: null,
		...overrides,
	}
}

export interface QaDataset {
	members: FamilyMemberWithAliases[]
	documents: ChronicleDocument[]
	healthReports: UploadedHealthReport[]
	healthMetrics: StoredHealthMetric[]
	folderAssignments: ModuleFolderAssignment[]
	vehicleKnowledge: VehicleKnowledgeRawData | null
	flags: {
		driveConnected: boolean
		aiFailure: boolean
		providerDelayMs: number
	}
}

export function buildEmptyQaDataset(): QaDataset {
	const members = buildQaFamilyMembers()

	return {
		members,
		documents: [],
		healthReports: [],
		healthMetrics: [],
		folderAssignments: [],
		vehicleKnowledge: buildEmptyQaVehicleKnowledgeRawData(
			members.map((member) => ({
				id: member.id,
				displayName: member.displayName,
				relationship: member.relationship,
				isAccountOwner: member.isAccountOwner,
			})),
		),
		flags: { driveConnected: false, aiFailure: false, providerDelayMs: 0 },
	}
}

export function buildQaFamilyMembers(): FamilyMemberWithAliases[] {
	return [
		{
			id: QA_MEMBER_IDS.nivedan,
			userId: QA_USER_ID,
			familyId: QA_FAMILY_ID,
			displayName: 'Nivedan QA',
			relationship: 'self',
			isAccountOwner: true,
			roleId: 'adult',
			dateOfBirth: '1985-04-12',
			gender: 'male',
			status: 'active',
			avatarUrl: null,
			sortOrder: 0,
			aliases: ['Nivedan'],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: QA_MEMBER_IDS.wife,
			userId: QA_USER_ID,
			familyId: QA_FAMILY_ID,
			displayName: 'Priya QA',
			relationship: 'spouse',
			isAccountOwner: false,
			roleId: 'adult',
			dateOfBirth: '1987-08-20',
			gender: 'female',
			status: 'active',
			avatarUrl: null,
			sortOrder: 1,
			aliases: ['Priya', 'Wife'],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: QA_MEMBER_IDS.daughter,
			userId: QA_USER_ID,
			familyId: QA_FAMILY_ID,
			displayName: 'Advika QA',
			relationship: 'daughter',
			isAccountOwner: false,
			roleId: 'child',
			dateOfBirth: '2016-02-03',
			gender: 'female',
			status: 'active',
			avatarUrl: null,
			sortOrder: 2,
			aliases: ['Advika'],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: QA_MEMBER_IDS.parent,
			userId: QA_USER_ID,
			familyId: QA_FAMILY_ID,
			displayName: 'Ravi QA',
			relationship: 'parent',
			isAccountOwner: false,
			roleId: 'adult',
			dateOfBirth: '1958-11-30',
			gender: 'male',
			status: 'active',
			avatarUrl: null,
			sortOrder: 3,
			aliases: ['Ravi', 'Parent'],
			createdAt: NOW,
			updatedAt: NOW,
		},
	]
}

export function buildFullQaDataset(): QaDataset {
	const members = buildQaFamilyMembers()

	const documents: ChronicleDocument[] = [
		// Property — Pune Home
		doc({
			id: 'qa-doc-pune-registration',
			category_id: 'property',
			sub_category_id: 'registration',
			title: 'Pune Home Registration',
			file_name: 'pune-registration.pdf',
			family_member_id: QA_MEMBER_IDS.nivedan,
			issue_date: '2019-03-15',
			extracted_metadata: {
				folderPath: 'Home/Pune Home/Registration/deed.pdf',
			},
		}),
		doc({
			id: 'qa-doc-pune-tax',
			category_id: 'property',
			sub_category_id: 'property-tax',
			title: 'Pune Property Tax 2026',
			file_name: 'pune-tax-2026.pdf',
			extracted_metadata: { folderPath: 'Home/Pune Home/Property Tax/tax.pdf' },
		}),
		doc({
			id: 'qa-doc-pune-insurance',
			category_id: 'property',
			sub_category_id: 'property-insurance',
			title: 'Pune Home Insurance',
			file_name: 'pune-home-insurance.pdf',
			expiry_date: '2026-12-31',
			extracted_metadata: { folderPath: 'Home/Pune Home/Insurance/policy.pdf' },
		}),
		doc({
			id: 'qa-doc-pune-loan',
			category_id: 'property',
			sub_category_id: 'home-loan',
			title: 'HDFC Home Loan Statement',
			file_name: 'hdfc-home-loan.pdf',
			extracted_metadata: {
				folderPath: 'Home/Pune Home/Loan/statement.pdf',
				financeDisplayLabel: 'HDFC Home Loan',
				loanBalance: '8245000',
			},
		}),
		doc({
			id: 'qa-doc-nagpur-sale',
			category_id: 'property',
			sub_category_id: 'purchase-sale',
			title: 'Nagpur Plot Sale Agreement',
			file_name: 'nagpur-sale.pdf',
			extracted_metadata: {
				folderPath: 'Home/Nagpur Home/Purchase/agreement.pdf',
			},
		}),
		// Vehicles — XEV 9e
		doc({
			id: 'qa-doc-xev-rc',
			category_id: 'vehicles',
			sub_category_id: 'registration-certificate',
			title: 'XEV 9e Registration Certificate',
			file_name: 'xev9e-rc.pdf',
			extracted_metadata: {
				vehicleName: 'XEV 9e',
				folderPath: 'Vehicles/XEV 9e/RC.pdf',
			},
		}),
		doc({
			id: 'qa-doc-xev-insurance',
			category_id: 'vehicles',
			sub_category_id: 'vehicle-insurance',
			title: 'XEV 9e Insurance',
			file_name: 'xev9e-insurance.pdf',
			expiry_date: '2026-09-30',
			extracted_metadata: {
				vehicleName: 'XEV 9e',
				policyId: 'qa-policy-vehicle-1',
			},
		}),
		doc({
			id: 'qa-doc-xev-puc',
			category_id: 'vehicles',
			sub_category_id: 'puc',
			title: 'XEV 9e PUC',
			file_name: 'xev9e-puc.pdf',
			expiry_date: '2026-06-01',
			extracted_metadata: { vehicleName: 'XEV 9e' },
		}),
		doc({
			id: 'qa-doc-alt-car-rc',
			category_id: 'vehicles',
			sub_category_id: 'registration-certificate',
			title: 'City Compact RC',
			file_name: 'city-compact-rc.pdf',
			extracted_metadata: { vehicleName: 'City Compact' },
		}),
		// Identity
		doc({
			id: 'qa-doc-nivedan-passport',
			category_id: 'identity',
			sub_category_id: 'passport',
			title: 'Nivedan QA Passport',
			file_name: 'nivedan-passport.pdf',
			document_number: 'QA1234567',
			expiry_date: '2031-05-20',
			family_member_id: QA_MEMBER_IDS.nivedan,
		}),
		doc({
			id: 'qa-doc-advika-passport',
			category_id: 'identity',
			sub_category_id: 'passport',
			title: 'Advika QA Passport',
			file_name: 'advika-passport.pdf',
			document_number: 'QA7654321',
			expiry_date: '2027-08-10',
			family_member_id: QA_MEMBER_IDS.daughter,
		}),
		doc({
			id: 'qa-doc-nivedan-pan',
			category_id: 'identity',
			sub_category_id: 'pan',
			title: 'Nivedan QA PAN',
			file_name: 'nivedan-pan.pdf',
			document_number: 'QAAPA1234Q',
			family_member_id: QA_MEMBER_IDS.nivedan,
		}),
		doc({
			id: 'qa-doc-nivedan-aadhaar',
			category_id: 'identity',
			sub_category_id: 'aadhaar',
			title: 'Nivedan QA Aadhaar',
			file_name: 'nivedan-aadhaar.pdf',
			document_number: '1234-5678-9012',
			family_member_id: QA_MEMBER_IDS.nivedan,
		}),
		doc({
			id: 'qa-doc-nivedan-licence',
			category_id: 'identity',
			sub_category_id: 'driving-licence',
			title: 'Nivedan QA Driving Licence',
			file_name: 'nivedan-licence.pdf',
			expiry_date: '2028-03-01',
			family_member_id: QA_MEMBER_IDS.nivedan,
		}),
		// Insurance
		doc({
			id: 'qa-doc-health-insurance',
			category_id: 'insurance',
			sub_category_id: 'health-insurance',
			title: 'QA Health Shield Policy',
			file_name: 'health-shield.pdf',
			expiry_date: '2026-12-31',
			extracted_metadata: { policyId: 'qa-policy-health-1' },
		}),
		doc({
			id: 'qa-doc-term-insurance',
			category_id: 'insurance',
			sub_category_id: 'term-insurance',
			title: 'QA Term Life Policy',
			file_name: 'term-life.pdf',
			expiry_date: '2046-01-01',
			extracted_metadata: { policyId: 'qa-policy-term-1' },
		}),
		doc({
			id: 'qa-doc-home-insurance',
			category_id: 'insurance',
			sub_category_id: 'home-insurance',
			title: 'QA Home Insurance Policy',
			file_name: 'home-insurance.pdf',
			expiry_date: '2026-04-01',
			extracted_metadata: { policyId: 'qa-policy-home-1' },
		}),
		// Finance
		doc({
			id: 'qa-doc-hdfc-statement',
			category_id: 'financial',
			sub_category_id: 'bank-statement',
			title: 'HDFC Savings Statement Jul 2026',
			file_name: 'hdfc-jul-2026.pdf',
			extracted_metadata: {
				financeDisplayLabel: 'HDFC Savings',
				accountBalance: '245000',
				type: 'bank-account',
			},
		}),
		doc({
			id: 'qa-doc-hdfc-loan',
			category_id: 'financial',
			sub_category_id: 'loan-statement',
			title: 'HDFC Home Loan Jul 2026',
			file_name: 'hdfc-loan-jul-2026.pdf',
			extracted_metadata: {
				financeDisplayLabel: 'HDFC Home Loan',
				loanBalance: '8245000',
				type: 'loan',
			},
		}),
		doc({
			id: 'qa-doc-amex-card',
			category_id: 'financial',
			sub_category_id: 'credit-card-statement',
			title: 'Amex Card Statement',
			file_name: 'amex-jul-2026.pdf',
			extracted_metadata: {
				financeDisplayLabel: 'Amex QA Card',
				type: 'credit-card',
			},
		}),
		doc({
			id: 'qa-doc-mf-statement',
			category_id: 'financial',
			sub_category_id: 'investment-statement',
			title: 'Mutual Fund Statement',
			file_name: 'mf-statement.pdf',
			extracted_metadata: {
				financeDisplayLabel: 'QA MF Portfolio',
				type: 'investment',
			},
		}),
		// Failed document for retry test
		doc({
			id: 'qa-doc-failed',
			category_id: 'personal',
			title: 'Failed QA Document',
			file_name: 'failed-doc.pdf',
			status: 'failed',
		}),
	]

	const healthReports: UploadedHealthReport[] = [
		healthReport({
			id: 'qa-report-cbc-2026',
			file_name: 'CBC-Mar-2026.pdf',
			report_date: '2026-03-09',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'hemoglobin',
						displayName: 'Hemoglobin',
						value: '14.2',
						unit: 'g/dL',
						status: 'normal',
					},
					{
						canonicalId: 'wbc',
						displayName: 'WBC',
						value: '7.1',
						unit: '10^3/uL',
						status: 'normal',
					},
				],
				metadata: { laboratory: 'QA Labs', reportDate: '2026-03-09' },
			},
		}),
		healthReport({
			id: 'qa-report-lipid-2026',
			file_name: 'Lipid-Jul-2026.pdf',
			report_date: '2026-07-15',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'ldl',
						displayName: 'LDL Cholesterol',
						value: '118',
						unit: 'mg/dL',
						status: 'high',
					},
					{
						canonicalId: 'hdl',
						displayName: 'HDL Cholesterol',
						value: '42',
						unit: 'mg/dL',
						status: 'normal',
					},
				],
				metadata: { laboratory: 'QA Labs', reportDate: '2026-07-15' },
			},
		}),
		healthReport({
			id: 'qa-report-thyroid-2025',
			file_name: 'Thyroid-Dec-2025.pdf',
			report_date: '2025-12-10',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'tsh',
						displayName: 'TSH',
						value: '2.4',
						unit: 'mIU/L',
						status: 'normal',
					},
				],
				metadata: { reportDate: '2025-12-10' },
			},
		}),
		healthReport({
			id: 'qa-report-liver-2026',
			file_name: 'Liver-Jun-2026.pdf',
			report_date: '2026-06-01',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'alt',
						displayName: 'ALT',
						value: '52',
						unit: 'U/L',
						status: 'high',
					},
					{
						canonicalId: 'ast',
						displayName: 'AST',
						value: '38',
						unit: 'U/L',
						status: 'normal',
					},
				],
				metadata: { reportDate: '2026-06-01' },
			},
		}),
		healthReport({
			id: 'qa-report-vitd-2026',
			file_name: 'VitaminD-May-2026.pdf',
			report_date: '2026-05-20',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'vitamin-d',
						displayName: 'Vitamin D',
						value: '18',
						unit: 'ng/mL',
						status: 'low',
					},
				],
				metadata: { reportDate: '2026-05-20' },
			},
		}),
		healthReport({
			id: 'qa-report-hba1c-2026',
			file_name: 'HbA1c-Apr-2026.pdf',
			report_date: '2026-04-12',
			parsed_data: {
				metrics: [
					{
						canonicalId: 'hba1c',
						displayName: 'HbA1c',
						value: '5.9',
						unit: '%',
						status: 'borderline',
					},
				],
				metadata: { reportDate: '2026-04-12' },
			},
		}),
	]

	const healthMetrics: StoredHealthMetric[] = [
		{
			id: 'qa-metric-ldl',
			user_id: QA_USER_ID,
			family_member_id: QA_MEMBER_IDS.nivedan,
			report_id: 'qa-report-lipid-2026',
			workflow_item_id: null,
			canonical_metric_id: 'ldl',
			display_name: 'LDL Cholesterol',
			raw_name: 'LDL',
			value: '118',
			numeric_value: 118,
			unit: 'mg/dL',
			reference_range_raw: '< 100',
			reference_lower: null,
			reference_upper: 100,
			status: 'high',
			category: 'heart',
			report_date: '2026-07-15',
			observed_at: '2026-07-15T00:00:00.000Z',
			confidence: 0.92,
			source: 'parser',
			created_at: NOW,
		},
	]

	const folderAssignments: ModuleFolderAssignment[] = [
		{
			id: 'qa-folder-health',
			userId: QA_USER_ID,
			moduleId: 'health',
			connectorId: 'google-drive',
			folderId: 'qa-health-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-health-folder',
			folderName: 'Health',
			folderPath: 'Health',
			assignedAt: NOW,
			enabled: true,
		},
		{
			id: 'qa-folder-insurance',
			userId: QA_USER_ID,
			moduleId: 'insurance',
			connectorId: 'google-drive',
			folderId: 'qa-insurance-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-insurance-folder',
			folderName: 'Insurance',
			folderPath: 'Insurance',
			assignedAt: NOW,
			enabled: true,
		},
		{
			id: 'qa-folder-vehicles',
			userId: QA_USER_ID,
			moduleId: 'vehicles',
			connectorId: 'google-drive',
			folderId: 'qa-vehicles-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-vehicles-folder',
			folderName: 'Vehicles',
			folderPath: 'Vehicles',
			assignedAt: NOW,
			enabled: true,
		},
		{
			id: 'qa-folder-identity',
			userId: QA_USER_ID,
			moduleId: 'identity',
			connectorId: 'google-drive',
			folderId: 'qa-identity-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-identity-folder',
			folderName: 'Identity',
			folderPath: 'Identity',
			assignedAt: NOW,
			enabled: true,
		},
		{
			id: 'qa-folder-finance',
			userId: QA_USER_ID,
			moduleId: 'finance',
			connectorId: 'google-drive',
			folderId: 'qa-finance-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-finance-folder',
			folderName: 'Finance',
			folderPath: 'Finance',
			assignedAt: NOW,
			enabled: true,
		},
		{
			id: 'qa-folder-property',
			userId: QA_USER_ID,
			moduleId: 'property',
			connectorId: 'google-drive',
			folderId: 'qa-property-folder',
			familyMemberId: QA_MEMBER_IDS.nivedan,
			familyMemberName: 'Nivedan QA',
			memberLabel: 'Nivedan',
			externalFolderId: 'qa-property-folder',
			folderName: 'Home',
			folderPath: 'Home',
			assignedAt: NOW,
			enabled: true,
		},
	]

	return enrichQaDatasetForPrivacyTrust({
		members,
		documents,
		healthReports,
		healthMetrics,
		folderAssignments,
		vehicleKnowledge: buildFullQaVehicleKnowledgeRawData(
			members.map((member) => ({
				id: member.id,
				displayName: member.displayName,
				relationship: member.relationship,
				isAccountOwner: member.isAccountOwner,
			})),
		),
		flags: { driveConnected: true, aiFailure: false, providerDelayMs: 0 },
	})
}

export function buildErrorQaDataset(): QaDataset {
	return {
		...buildEmptyQaDataset(),
		flags: { driveConnected: false, aiFailure: true, providerDelayMs: 0 },
	}
}

export function buildLoadingQaDataset(): QaDataset {
	return {
		...buildFullQaDataset(),
		flags: { driveConnected: true, aiFailure: false, providerDelayMs: 2500 },
	}
}
