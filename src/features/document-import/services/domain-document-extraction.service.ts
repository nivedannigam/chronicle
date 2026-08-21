import type { DomainDocumentExtractionResult } from '@/shared/ai/types/domain-document-extraction.types'
import { inferInsurerFromFileName } from '@/features/insurance/services/insurance-folder-discovery.service'
import { downloadRegistryDocumentToStorage } from '@/features/document-import/services/domain-document-text.service'
import { orchestrateDomainDocumentExtraction } from '@/features/document-import/services/document-extraction-orchestrator.service'
import { extractVehicleDocument } from '@/features/vehicle-knowledge/extraction/vehicle-document-extraction.service'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { FinanceExtractableDocumentType } from '@/features/finance-knowledge/types/finance-extraction.types'
import { DOCUMENTS_BUCKET } from '@/features/documents/types/document.types'

function inferPolicyTypeFromHint(
	categoryHint: string | null,
): InsurancePolicyType {
	switch (categoryHint) {
		case 'health':
			return 'health'
		case 'motor':
			return 'motor'
		case 'home':
			return 'home'
		case 'life_term':
			return 'life_term'
		case 'travel':
			return 'travel'
		default:
			return 'other'
	}
}

function buildInsuranceMetadataFallback(input: {
	fileName: string
	categoryHint?: string | null
}): DomainDocumentExtractionResult {
	const insurerFromFile = inferInsurerFromFileName(input.fileName)
	const hasCategoryHint = Boolean(input.categoryHint)

	return {
		target: 'insurance',
		method: 'deterministic_fallback',
		extractedText: null,
		insurance: {
			insurer: insurerFromFile,
			policyNumber: null,
			policyType: inferPolicyTypeFromHint(input.categoryHint ?? null),
			productName: input.fileName.replace(/\.[^.]+$/, ''),
			inceptionDate: null,
			expiryDate: null,
			renewalDate: null,
			sumInsured: null,
			premium: null,
			currency: 'INR',
			insuredMembers: [],
			documentKind: null,
			confidence: hasCategoryHint && insurerFromFile ? 0.55 : 0.35,
			rawFields: {
				categoryHint: input.categoryHint ?? null,
				insurerFromFileName: insurerFromFile,
			},
		},
	}
}

function buildVehicleMetadataFallback(input: {
	fileName: string
	folderPath?: string | null
}): DomainDocumentExtractionResult {
	const extraction = extractVehicleDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
	})

	return {
		target: 'vehicles',
		method: 'deterministic_fallback',
		extractedText: null,
		vehicle: {
			documentType: extraction.documentType,
			documentSubtype: extraction.documentSubtype,
			registrationNumber: extraction.identifiers.registrationNumber,
			vin: extraction.identifiers.vin,
			engineNumber: extraction.identifiers.engineNumber,
			make: extraction.make,
			model: extraction.model,
			variant: extraction.variant,
			documentDate: extraction.documentDate,
			expiryDate: extraction.expiryDate,
			provider: extraction.provider,
			facts: extraction.facts.map((fact) => ({
				factKey: fact.factKey,
				factValue: fact.factValue,
				valueDate: fact.valueDate ?? null,
				valueNumber: fact.valueNumber ?? null,
			})),
			confidence: extraction.confidence,
			rawFields: extraction.rawFields,
		},
	}
}

export function buildInsuranceMetadataExtraction(input: {
	fileName: string
	categoryHint?: string | null
}): DomainDocumentExtractionResult {
	return buildInsuranceMetadataFallback(input)
}

export function buildVehicleMetadataExtraction(input: {
	fileName: string
	folderPath?: string | null
}): DomainDocumentExtractionResult {
	return buildVehicleMetadataFallback(input)
}

function buildFinanceMetadataFallback(input: {
	fileName: string
	categoryHint?: string | null
}): DomainDocumentExtractionResult {
	return {
		target: 'finance',
		method: 'deterministic_fallback',
		extractedText: null,
		finance: {
			documentType:
				(input.categoryHint as FinanceExtractableDocumentType) ??
				'bank-statement',
			institution: null,
			accountType: null,
			cardName: null,
			loanType: null,
			investmentType: null,
			maskedAccountIdentifier: null,
			accountHolder: null,
			jointHolder: null,
			statementDate: null,
			statementPeriodStart: null,
			statementPeriodEnd: null,
			currency: 'INR',
			openingBalance: null,
			closingBalance: null,
			totalAmountDue: null,
			minimumAmountDue: null,
			paymentDueDate: null,
			creditLimit: null,
			availableCredit: null,
			outstandingPrincipal: null,
			originalLoanAmount: null,
			interestRate: null,
			emi: null,
			nextPaymentDate: null,
			loanStartDate: null,
			loanEndDate: null,
			folioNumber: null,
			schemeName: null,
			units: null,
			nav: null,
			marketValue: null,
			investedValue: null,
			confidence: 0.2,
			rawFields: {},
		},
	}
}

export function buildFinanceMetadataExtraction(input: {
	fileName: string
	categoryHint?: string | null
}): DomainDocumentExtractionResult {
	return buildFinanceMetadataFallback(input)
}

export async function extractRegistryDocumentForDomain(input: {
	target: DomainDocumentExtractionResult['target']
	userId: string
	registryId: string
	externalFileId: string
	fileName: string
	folderPath?: string | null
	documentId: string
	categoryHint?: string | null
	storagePath?: string | null
}): Promise<{
	download: { storagePath: string } | null
	extraction: DomainDocumentExtractionResult
}> {
	let storagePath = input.storagePath ?? null
	let download: { storagePath: string } | null = null

	if (!storagePath) {
		try {
			const result = await downloadRegistryDocumentToStorage({
				userId: input.userId,
				registryId: input.registryId,
				externalFileId: input.externalFileId,
				fileName: input.fileName,
			})
			storagePath = result.storagePath
			download = { storagePath: result.storagePath }
		} catch {
			if (input.target === 'insurance') {
				return {
					download: null,
					extraction: buildInsuranceMetadataFallback(input),
				}
			}

			if (input.target === 'finance') {
				return {
					download: null,
					extraction: buildFinanceMetadataFallback(input),
				}
			}

			return {
				download: null,
				extraction: buildVehicleMetadataFallback(input),
			}
		}
	}

	try {
		const extraction = await orchestrateDomainDocumentExtraction({
			target: input.target,
			userId: input.userId,
			documentId: input.documentId,
			fileName: input.fileName,
			folderPath: input.folderPath,
			categoryHint: input.categoryHint,
			storagePath,
			bucket: DOCUMENTS_BUCKET,
			buildMetadataFallback: () => {
				if (input.target === 'insurance') {
					return buildInsuranceMetadataFallback(input)
				}
				if (input.target === 'finance') {
					return buildFinanceMetadataFallback(input)
				}
				return buildVehicleMetadataFallback(input)
			},
		})

		if (
			extraction.method === 'deterministic_fallback' &&
			extraction.extractedText == null
		) {
			if (input.target === 'vehicles') {
				const vehicleExtraction = extractVehicleDocument({
					fileName: input.fileName,
					folderPath: input.folderPath,
					text: extraction.extractedText ?? undefined,
				})

				return {
					download,
					extraction: {
						...extraction,
						vehicle: {
							documentType: vehicleExtraction.documentType,
							documentSubtype: vehicleExtraction.documentSubtype,
							registrationNumber:
								vehicleExtraction.identifiers.registrationNumber,
							vin: vehicleExtraction.identifiers.vin,
							engineNumber: vehicleExtraction.identifiers.engineNumber,
							make: vehicleExtraction.make,
							model: vehicleExtraction.model,
							variant: vehicleExtraction.variant,
							documentDate: vehicleExtraction.documentDate,
							expiryDate: vehicleExtraction.expiryDate,
							provider: vehicleExtraction.provider,
							facts: vehicleExtraction.facts.map((fact) => ({
								factKey: fact.factKey,
								factValue: fact.factValue,
								valueDate: fact.valueDate ?? null,
								valueNumber: fact.valueNumber ?? null,
							})),
							confidence: vehicleExtraction.confidence,
							rawFields: vehicleExtraction.rawFields,
						},
					},
				}
			}
		}

		return { download, extraction }
	} catch {
		if (input.target === 'insurance') {
			return {
				download,
				extraction: buildInsuranceMetadataFallback(input),
			}
		}

		if (input.target === 'finance') {
			return {
				download,
				extraction: buildFinanceMetadataFallback(input),
			}
		}

		return {
			download,
			extraction: buildVehicleMetadataFallback(input),
		}
	}
}
