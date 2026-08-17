import type {
	VehicleDocumentRecord,
	VehicleFactRecord,
} from '@/features/vehicle-knowledge/types/vehicle-record.types'

export type VehicleDomainStatus =
	| 'valid'
	| 'active'
	| 'recent'
	| 'expiring_soon'
	| 'due_soon'
	| 'expired'
	| 'overdue'
	| 'unknown'

export interface VehicleDomainState {
	status: VehicleDomainStatus
	label: string
	effectiveDate: string | null
	sourceDocumentId: string | null
	sourceDocumentName: string | null
}

export interface VehicleCurrentState {
	registration: VehicleDomainState
	insurance: VehicleDomainState
	puc: VehicleDomainState
	warranty: VehicleDomainState
	service: VehicleDomainState
}

const EXPIRING_SOON_DAYS = 30
const SERVICE_RECENT_DAYS = 180
const SERVICE_DUE_SOON_DAYS = 30

function daysUntil(date: string | null): number | null {
	if (!date) return null
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return null
	return Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDateLabel(date: string | null): string | null {
	if (!date) return null
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return null
	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function sourceForDocument(
	documents: VehicleDocumentRecord[],
	documentId: string | null,
): { id: string | null; name: string | null } {
	if (!documentId) {
		return { id: null, name: null }
	}

	const document = documents.find((entry) => entry.id === documentId)

	return {
		id: document?.id ?? documentId,
		name: document?.fileName ?? null,
	}
}

function factsForDocument(
	facts: VehicleFactRecord[],
	documentId: string,
): VehicleFactRecord[] {
	return facts.filter((fact) => fact.documentId === documentId)
}

function latestFactDate(
	facts: VehicleFactRecord[],
	vehicleId: string,
	key: string,
): VehicleFactRecord | null {
	return (
		facts
			.filter((fact) => fact.vehicleId === vehicleId && fact.factKey === key)
			.sort((left, right) =>
				(right.valueDate ?? right.factValue ?? '').localeCompare(
					left.valueDate ?? left.factValue ?? '',
				),
			)[0] ?? null
	)
}

function expiryState(input: {
	expiryDate: string | null
	sourceDocumentId: string | null
	sourceDocumentName: string | null
	validLabel: string
	expiringLabel: string
	expiredLabel: string
	unknownLabel: string
}): VehicleDomainState {
	const days = daysUntil(input.expiryDate)

	if (days == null) {
		return {
			status: 'unknown',
			label: input.unknownLabel,
			effectiveDate: null,
			sourceDocumentId: input.sourceDocumentId,
			sourceDocumentName: input.sourceDocumentName,
		}
	}

	if (days < 0) {
		return {
			status: 'expired',
			label: `${input.expiredLabel} ${formatDateLabel(input.expiryDate)}`,
			effectiveDate: input.expiryDate,
			sourceDocumentId: input.sourceDocumentId,
			sourceDocumentName: input.sourceDocumentName,
		}
	}

	if (days <= EXPIRING_SOON_DAYS) {
		return {
			status: 'expiring_soon',
			label: `${input.expiringLabel} ${formatDateLabel(input.expiryDate)}`,
			effectiveDate: input.expiryDate,
			sourceDocumentId: input.sourceDocumentId,
			sourceDocumentName: input.sourceDocumentName,
		}
	}

	return {
		status: 'valid',
		label: `${input.validLabel} ${formatDateLabel(input.expiryDate)}`,
		effectiveDate: input.expiryDate,
		sourceDocumentId: input.sourceDocumentId,
		sourceDocumentName: input.sourceDocumentName,
	}
}

interface RankedPolicy {
	documentId: string
	documentDate: string | null
	policyStart: string | null
	policyExpiry: string | null
}

function rankInsurancePolicies(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): RankedPolicy | null {
	const policies = input.documents
		.filter(
			(document) =>
				document.vehicleId === input.vehicleId &&
				document.documentType === 'insurance' &&
				document.status === 'completed',
		)
		.map((document) => {
			const docFacts = factsForDocument(input.facts, document.id)
			const policyStart =
				docFacts.find((fact) => fact.factKey === 'policy_start')?.valueDate ??
				document.documentDate
			const policyExpiry =
				docFacts.find((fact) => fact.factKey === 'policy_expiry')?.valueDate ??
				document.expiryDate

			return {
				documentId: document.id,
				documentDate: document.documentDate,
				policyStart,
				policyExpiry,
			}
		})
		.filter((policy) => policy.policyExpiry || policy.policyStart)
		.sort((left, right) => {
			const leftKey =
				left.policyStart ?? left.policyExpiry ?? left.documentDate ?? ''
			const rightKey =
				right.policyStart ?? right.policyExpiry ?? right.documentDate ?? ''
			return rightKey.localeCompare(leftKey)
		})

	return policies[0] ?? null
}

function rankPucDocuments(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): RankedPolicy | null {
	const records = input.documents
		.filter(
			(document) =>
				document.vehicleId === input.vehicleId &&
				document.documentType === 'compliance' &&
				document.documentSubtype === 'puc' &&
				document.status === 'completed',
		)
		.map((document) => {
			const docFacts = factsForDocument(input.facts, document.id)
			const policyExpiry =
				docFacts.find((fact) => fact.factKey === 'puc_expiry')?.valueDate ??
				document.expiryDate

			return {
				documentId: document.id,
				documentDate: document.documentDate,
				policyStart: document.documentDate,
				policyExpiry,
			}
		})
		.filter((record) => record.policyExpiry || record.documentDate)
		.sort((left, right) => {
			const leftKey = left.documentDate ?? left.policyExpiry ?? ''
			const rightKey = right.documentDate ?? right.policyExpiry ?? ''
			return rightKey.localeCompare(leftKey)
		})

	return records[0] ?? null
}

function rankWarrantyDocuments(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): RankedPolicy | null {
	const records = input.documents
		.filter(
			(document) =>
				document.vehicleId === input.vehicleId &&
				document.documentType === 'warranty' &&
				document.status === 'completed',
		)
		.map((document) => {
			const docFacts = factsForDocument(input.facts, document.id)
			const policyExpiry =
				docFacts.find((fact) => fact.factKey === 'warranty_expiry')
					?.valueDate ?? document.expiryDate

			return {
				documentId: document.id,
				documentDate: document.documentDate,
				policyStart: document.documentDate,
				policyExpiry,
			}
		})
		.filter((record) => record.policyExpiry || record.documentDate)
		.sort((left, right) => {
			const leftKey = left.documentDate ?? left.policyExpiry ?? ''
			const rightKey = right.documentDate ?? right.policyExpiry ?? ''
			return rightKey.localeCompare(leftKey)
		})

	return records[0] ?? null
}

function rankServiceRecords(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): {
	documentId: string
	serviceDate: string | null
	nextServiceDate: string | null
} | null {
	const records = input.documents
		.filter(
			(document) =>
				document.vehicleId === input.vehicleId &&
				document.documentType === 'service' &&
				document.status === 'completed',
		)
		.map((document) => {
			const docFacts = factsForDocument(input.facts, document.id)
			const serviceDate =
				docFacts.find((fact) => fact.factKey === 'service_date')?.valueDate ??
				document.documentDate
			const nextServiceDate =
				docFacts.find((fact) => fact.factKey === 'next_service_date')
					?.valueDate ?? null

			return { documentId: document.id, serviceDate, nextServiceDate }
		})
		.filter((record) => record.serviceDate)
		.sort((left, right) =>
			(right.serviceDate ?? '').localeCompare(left.serviceDate ?? ''),
		)

	return records[0] ?? null
}

export function computeVehicleCurrentState(input: {
	vehicleId: string
	registrationNumber: string | null
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): VehicleCurrentState {
	const hasRegistrationDoc = input.documents.some(
		(document) =>
			document.vehicleId === input.vehicleId &&
			document.documentType === 'registration' &&
			document.status === 'completed',
	)

	const registrationSource = input.documents.find(
		(document) =>
			document.vehicleId === input.vehicleId &&
			document.documentType === 'registration',
	)

	const registration: VehicleDomainState = hasRegistrationDoc
		? {
				status: input.registrationNumber ? 'valid' : 'unknown',
				label: input.registrationNumber
					? `Registered · ${input.registrationNumber}`
					: 'Registration recorded',
				effectiveDate: registrationSource?.documentDate ?? null,
				sourceDocumentId: registrationSource?.id ?? null,
				sourceDocumentName: registrationSource?.fileName ?? null,
			}
		: {
				status: 'unknown',
				label: 'Registration status unknown',
				effectiveDate: null,
				sourceDocumentId: null,
				sourceDocumentName: null,
			}

	const latestPolicy = rankInsurancePolicies(input)
	const insuranceSource = latestPolicy
		? sourceForDocument(input.documents, latestPolicy.documentId)
		: { id: null, name: null }

	const insurance = latestPolicy?.policyExpiry
		? expiryState({
				expiryDate: latestPolicy.policyExpiry,
				sourceDocumentId: insuranceSource.id,
				sourceDocumentName: insuranceSource.name,
				validLabel: 'Insurance valid until',
				expiringLabel: 'Insurance expiring',
				expiredLabel: 'Insurance expired',
				unknownLabel: 'Insurance status unknown',
			})
		: {
				status: 'unknown' as const,
				label: 'Insurance information not found',
				effectiveDate: null,
				sourceDocumentId: null,
				sourceDocumentName: null,
			}

	const latestPuc = rankPucDocuments(input)
	const pucSource = latestPuc
		? sourceForDocument(input.documents, latestPuc.documentId)
		: { id: null, name: null }

	const puc = latestPuc?.policyExpiry
		? expiryState({
				expiryDate: latestPuc.policyExpiry,
				sourceDocumentId: pucSource.id,
				sourceDocumentName: pucSource.name,
				validLabel: 'PUC valid until',
				expiringLabel: 'PUC expiring',
				expiredLabel: 'PUC expired',
				unknownLabel: 'PUC status unknown',
			})
		: {
				status: 'unknown' as const,
				label: 'PUC information not found',
				effectiveDate: null,
				sourceDocumentId: null,
				sourceDocumentName: null,
			}

	const latestWarranty = rankWarrantyDocuments(input)
	const warrantySource = latestWarranty
		? sourceForDocument(input.documents, latestWarranty.documentId)
		: { id: null, name: null }

	const warranty = latestWarranty?.policyExpiry
		? expiryState({
				expiryDate: latestWarranty.policyExpiry,
				sourceDocumentId: warrantySource.id,
				sourceDocumentName: warrantySource.name,
				validLabel: 'Warranty valid until',
				expiringLabel: 'Warranty expiring',
				expiredLabel: 'Warranty expired',
				unknownLabel: 'Warranty status unknown',
			})
		: {
				status: 'unknown' as const,
				label: 'Warranty information not found',
				effectiveDate: null,
				sourceDocumentId: null,
				sourceDocumentName: null,
			}

	const latestService = rankServiceRecords(input)
	const serviceSource = latestService
		? sourceForDocument(input.documents, latestService.documentId)
		: { id: null, name: null }

	let service: VehicleDomainState

	if (!latestService?.serviceDate) {
		service = {
			status: 'unknown',
			label: 'Service history not found',
			effectiveDate: null,
			sourceDocumentId: null,
			sourceDocumentName: null,
		}
	} else if (latestService.nextServiceDate) {
		const nextDays = daysUntil(latestService.nextServiceDate)

		if (nextDays != null && nextDays < 0) {
			service = {
				status: 'overdue',
				label: `Service overdue since ${formatDateLabel(latestService.nextServiceDate)}`,
				effectiveDate: latestService.nextServiceDate,
				sourceDocumentId: serviceSource.id,
				sourceDocumentName: serviceSource.name,
			}
		} else if (nextDays != null && nextDays <= SERVICE_DUE_SOON_DAYS) {
			service = {
				status: 'due_soon',
				label: `Next service due ${formatDateLabel(latestService.nextServiceDate)}`,
				effectiveDate: latestService.nextServiceDate,
				sourceDocumentId: serviceSource.id,
				sourceDocumentName: serviceSource.name,
			}
		} else {
			service = {
				status: 'recent',
				label: `Last service ${formatDateLabel(latestService.serviceDate)}`,
				effectiveDate: latestService.serviceDate,
				sourceDocumentId: serviceSource.id,
				sourceDocumentName: serviceSource.name,
			}
		}
	} else {
		const daysSince = daysUntil(latestService.serviceDate)

		if (daysSince != null && Math.abs(daysSince) <= SERVICE_RECENT_DAYS) {
			service = {
				status: 'recent',
				label: `Last service ${formatDateLabel(latestService.serviceDate)}`,
				effectiveDate: latestService.serviceDate,
				sourceDocumentId: serviceSource.id,
				sourceDocumentName: serviceSource.name,
			}
		} else {
			service = {
				status: 'due_soon',
				label: `Last service ${formatDateLabel(latestService.serviceDate)}`,
				effectiveDate: latestService.serviceDate,
				sourceDocumentId: serviceSource.id,
				sourceDocumentName: serviceSource.name,
			}
		}
	}

	const fallbackInsuranceFact = latestFactDate(
		input.facts,
		input.vehicleId,
		'policy_expiry',
	)

	if (insurance.status === 'unknown' && fallbackInsuranceFact?.valueDate) {
		const source = sourceForDocument(
			input.documents,
			fallbackInsuranceFact.documentId,
		)
		return {
			registration,
			insurance: expiryState({
				expiryDate: fallbackInsuranceFact.valueDate,
				sourceDocumentId: source.id,
				sourceDocumentName: source.name,
				validLabel: 'Insurance valid until',
				expiringLabel: 'Insurance expiring',
				expiredLabel: 'Insurance expired',
				unknownLabel: 'Insurance status unknown',
			}),
			puc,
			warranty,
			service,
		}
	}

	return { registration, insurance, puc, warranty, service }
}

export function pickLatestExpiryForVehicle(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
}): {
	insuranceExpiry: string | null
	pucExpiry: string | null
	warrantyExpiry: string | null
	lastServiceDate: string | null
} {
	const state = computeVehicleCurrentState({
		vehicleId: input.vehicleId,
		registrationNumber: null,
		documents: input.documents,
		facts: input.facts,
	})

	return {
		insuranceExpiry: state.insurance.effectiveDate,
		pucExpiry: state.puc.effectiveDate,
		warrantyExpiry: state.warranty.effectiveDate,
		lastServiceDate: state.service.effectiveDate,
	}
}
