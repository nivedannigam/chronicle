import type { VehicleRecord } from '@/features/vehicle-knowledge/types/vehicle-record.types'
import {
	engineNumbersMatch,
	normalizeEngineNumber,
	normalizeRegistrationNumber,
	normalizeVin,
	registrationNumbersMatch,
	vinNumbersMatch,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'
import { slugifyVehicleName } from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'

export type VehicleMatchType =
	'vin' | 'registration' | 'engine' | 'folder' | 'make_model' | 'none'

export interface VehicleMatchResult {
	vehicleId: string | null
	confidence: number
	matchType: VehicleMatchType
	reason: string
	shouldCreateVehicle: boolean
	displayNameFallback: string | null
}

export interface VehicleIdentifiers {
	registrationNumber?: string | null
	vin?: string | null
	engineNumber?: string | null
	make?: string | null
	model?: string | null
	variant?: string | null
}

const STRONG_MATCH_CONFIDENCE = 0.92
const FOLDER_MATCH_CONFIDENCE = 0.68
const AMBIGUOUS_THRESHOLD = 0.55

function findByRegistration(
	vehicles: VehicleRecord[],
	registrationNumber: string,
): VehicleRecord | null {
	return (
		vehicles.find(
			(vehicle) =>
				vehicle.registrationNumber &&
				registrationNumbersMatch(
					vehicle.registrationNumber,
					registrationNumber,
				),
		) ?? null
	)
}

function findByVin(
	vehicles: VehicleRecord[],
	vin: string,
): VehicleRecord | null {
	return (
		vehicles.find(
			(vehicle) => vehicle.vin && vinNumbersMatch(vehicle.vin, vin),
		) ?? null
	)
}

function findByEngine(
	vehicles: VehicleRecord[],
	engineNumber: string,
): VehicleRecord | null {
	return (
		vehicles.find(
			(vehicle) =>
				vehicle.engineNumber &&
				engineNumbersMatch(vehicle.engineNumber, engineNumber),
		) ?? null
	)
}

function findByFolderSlug(
	vehicles: VehicleRecord[],
	folderVehicleName: string | null,
): VehicleRecord | null {
	if (!folderVehicleName?.trim()) {
		return null
	}

	const slug = slugifyVehicleName(folderVehicleName)

	return vehicles.find((vehicle) => vehicle.slug === slug) ?? null
}

export function matchVehicleDocument(input: {
	vehicles: VehicleRecord[]
	identifiers: VehicleIdentifiers
	folderVehicleName?: string | null
}): VehicleMatchResult {
	const registration = input.identifiers.registrationNumber?.trim()
	const vin = input.identifiers.vin?.trim()
	const engine = input.identifiers.engineNumber?.trim()
	const folderName = input.folderVehicleName?.trim() ?? null

	if (vin) {
		const match = findByVin(input.vehicles, vin)

		if (match) {
			return {
				vehicleId: match.id,
				confidence: STRONG_MATCH_CONFIDENCE,
				matchType: 'vin',
				reason: `Matched VIN ${normalizeVin(vin)}`,
				shouldCreateVehicle: false,
				displayNameFallback: match.displayName,
			}
		}
	}

	if (registration) {
		const match = findByRegistration(input.vehicles, registration)

		if (match) {
			return {
				vehicleId: match.id,
				confidence: STRONG_MATCH_CONFIDENCE,
				matchType: 'registration',
				reason: `Matched registration ${normalizeRegistrationNumber(registration)}`,
				shouldCreateVehicle: false,
				displayNameFallback: match.displayName,
			}
		}
	}

	if (engine) {
		const match = findByEngine(input.vehicles, engine)

		if (match) {
			return {
				vehicleId: match.id,
				confidence: STRONG_MATCH_CONFIDENCE,
				matchType: 'engine',
				reason: `Matched engine number ${normalizeEngineNumber(engine)}`,
				shouldCreateVehicle: false,
				displayNameFallback: match.displayName,
			}
		}
	}

	const folderMatch = findByFolderSlug(input.vehicles, folderName)

	if (folderMatch) {
		return {
			vehicleId: folderMatch.id,
			confidence: FOLDER_MATCH_CONFIDENCE,
			matchType: 'folder',
			reason: `Matched folder vehicle ${folderMatch.displayName}`,
			shouldCreateVehicle: false,
			displayNameFallback: folderMatch.displayName,
		}
	}

	if (registration || vin || engine) {
		const displayName =
			folderName ??
			(input.identifiers.make && input.identifiers.model
				? `${input.identifiers.make} ${input.identifiers.model}`
				: registration
					? registration
					: 'Vehicle')

		return {
			vehicleId: null,
			confidence: STRONG_MATCH_CONFIDENCE,
			matchType: registration ? 'registration' : vin ? 'vin' : 'engine',
			reason: 'Strong identifiers found but no existing vehicle',
			shouldCreateVehicle: true,
			displayNameFallback: displayName,
		}
	}

	if (folderName) {
		return {
			vehicleId: null,
			confidence: FOLDER_MATCH_CONFIDENCE,
			matchType: 'folder',
			reason: `Folder discovery for ${folderName}`,
			shouldCreateVehicle: true,
			displayNameFallback: folderName,
		}
	}

	return {
		vehicleId: null,
		confidence: 0,
		matchType: 'none',
		reason: 'No vehicle identifiers or folder context',
		shouldCreateVehicle: false,
		displayNameFallback: null,
	}
}

export function isAmbiguousMatch(result: VehicleMatchResult): boolean {
	return (
		result.confidence > 0 &&
		result.confidence < AMBIGUOUS_THRESHOLD &&
		!result.vehicleId
	)
}

export function vehicleWouldDuplicateExisting(input: {
	vehicles: VehicleRecord[]
	registrationNumber?: string | null
	vin?: string | null
	engineNumber?: string | null
}): VehicleRecord | null {
	if (input.registrationNumber) {
		const match = findByRegistration(input.vehicles, input.registrationNumber)

		if (match) {
			return match
		}
	}

	if (input.vin) {
		const match = findByVin(input.vehicles, input.vin)

		if (match) {
			return match
		}
	}

	if (input.engineNumber) {
		const match = findByEngine(input.vehicles, input.engineNumber)

		if (match) {
			return match
		}
	}

	return null
}
