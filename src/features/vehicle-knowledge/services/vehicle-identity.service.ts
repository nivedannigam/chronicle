import { supabase } from '@/lib/supabase'
import type { VehicleDocumentExtraction } from '@/features/vehicle-knowledge/extraction/vehicle-document-extraction.service'
import {
	isAmbiguousMatch,
	matchVehicleDocument,
	vehicleWouldDuplicateExisting,
} from '@/features/vehicle-knowledge/services/vehicle-matching.service'
import type { VehicleRecord } from '@/features/vehicle-knowledge/types/vehicle-record.types'
import {
	inferVehicleCategory,
	slugifyVehicleName,
} from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'
import {
	formatRegistrationNumber,
	normalizeEngineNumber,
	normalizeRegistrationNumber,
	normalizeVin,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'

const UNASSIGNED_SLUG = '_unassigned-documents'

export async function listUserVehicles(
	userId: string,
): Promise<VehicleRecord[]> {
	const { data, error } = await supabase
		.from('vehicles')
		.select('*')
		.eq('user_id', userId)

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map(mapVehicleRow)
}

function mapVehicleRow(row: Record<string, unknown>): VehicleRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		displayName: row.display_name as string,
		slug: row.slug as string,
		category: row.category as VehicleRecord['category'],
		make: (row.make as string | null) ?? null,
		model: (row.model as string | null) ?? null,
		variant: (row.variant as string | null) ?? null,
		registrationNumber: (row.registration_number as string | null) ?? null,
		registrationDate: (row.registration_date as string | null) ?? null,
		purchaseDate: (row.purchase_date as string | null) ?? null,
		fuelType: (row.fuel_type as string | null) ?? null,
		vin: (row.vin as string | null) ?? null,
		engineNumber: (row.engine_number as string | null) ?? null,
		color: (row.color as string | null) ?? null,
		status: row.status as VehicleRecord['status'],
		source: row.source as string,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	}
}

async function createVehicle(input: {
	userId: string
	displayName: string
	familyMemberId: string | null
	source: string
	extraction?: VehicleDocumentExtraction
}): Promise<string> {
	const slug = slugifyVehicleName(input.displayName)
	const now = new Date().toISOString()
	const extraction = input.extraction

	const { data, error } = await supabase
		.from('vehicles')
		.insert({
			user_id: input.userId,
			family_member_id: input.familyMemberId,
			display_name: input.displayName,
			slug,
			category: inferVehicleCategory(input.displayName),
			make: extraction?.make ?? null,
			model: extraction?.model ?? null,
			variant: extraction?.variant ?? null,
			registration_number: extraction?.identifiers.registrationNumber ?? null,
			vin: extraction?.identifiers.vin ?? null,
			engine_number: extraction?.identifiers.engineNumber ?? null,
			fuel_type: extraction?.rawFields.fuel_type ?? null,
			color: extraction?.rawFields.color ?? null,
			status: 'active',
			source: input.source,
			updated_at: now,
		})
		.select('id')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data.id as string
}

async function ensureUnassignedVehicle(input: {
	userId: string
	familyMemberId: string | null
}): Promise<string> {
	const { data: existing } = await supabase
		.from('vehicles')
		.select('id')
		.eq('user_id', input.userId)
		.eq('slug', UNASSIGNED_SLUG)
		.maybeSingle()

	if (existing?.id) {
		return existing.id as string
	}

	return createVehicle({
		userId: input.userId,
		displayName: 'Unassigned documents',
		familyMemberId: input.familyMemberId,
		source: 'unassigned',
	})
}

export async function resolveVehicleForDocument(input: {
	userId: string
	familyMemberId: string | null
	folderVehicleName: string | null
	extraction: VehicleDocumentExtraction
	vehicles?: VehicleRecord[]
}): Promise<{
	vehicleId: string
	matchType: string
	matchConfidence: number
	matchReason: string
}> {
	const vehicles = input.vehicles ?? (await listUserVehicles(input.userId))
	const match = matchVehicleDocument({
		vehicles,
		identifiers: input.extraction.identifiers,
		folderVehicleName: input.folderVehicleName,
	})

	if (match.vehicleId) {
		return {
			vehicleId: match.vehicleId,
			matchType: match.matchType,
			matchConfidence: match.confidence,
			matchReason: match.reason,
		}
	}

	if (isAmbiguousMatch(match)) {
		const vehicleId = await ensureUnassignedVehicle({
			userId: input.userId,
			familyMemberId: input.familyMemberId,
		})

		return {
			vehicleId,
			matchType: 'none',
			matchConfidence: match.confidence,
			matchReason: match.reason,
		}
	}

	if (match.shouldCreateVehicle && match.displayNameFallback) {
		const duplicate = vehicleWouldDuplicateExisting({
			vehicles,
			registrationNumber: input.extraction.identifiers.registrationNumber,
			vin: input.extraction.identifiers.vin,
			engineNumber: input.extraction.identifiers.engineNumber,
		})

		if (duplicate) {
			return {
				vehicleId: duplicate.id,
				matchType: match.matchType,
				matchConfidence: match.confidence,
				matchReason: `Prevented duplicate vehicle; matched ${duplicate.displayName}`,
			}
		}

		const vehicleId = await createVehicle({
			userId: input.userId,
			displayName: match.displayNameFallback,
			familyMemberId: input.familyMemberId,
			source:
				match.matchType === 'folder' ? 'folder_discovery' : 'document_identity',
			extraction: input.extraction,
		})

		return {
			vehicleId,
			matchType: match.matchType,
			matchConfidence: match.confidence,
			matchReason: match.reason,
		}
	}

	const vehicleId = await ensureUnassignedVehicle({
		userId: input.userId,
		familyMemberId: input.familyMemberId,
	})

	return {
		vehicleId,
		matchType: 'none',
		matchConfidence: 0,
		matchReason: match.reason,
	}
}

export async function updateVehicleIdentityFromExtraction(input: {
	vehicleId: string
	extraction: VehicleDocumentExtraction
	documentType: string
}): Promise<void> {
	const updates: Record<string, string | null> = {}
	const now = new Date().toISOString()

	if (
		input.extraction.identifiers.registrationNumber &&
		input.documentType === 'registration'
	) {
		updates.registration_number = formatRegistrationNumber(
			input.extraction.identifiers.registrationNumber,
		)
	}

	if (
		input.extraction.identifiers.vin &&
		input.documentType === 'registration'
	) {
		updates.vin = normalizeVin(input.extraction.identifiers.vin)
	}

	if (
		input.extraction.identifiers.engineNumber &&
		input.documentType === 'registration'
	) {
		updates.engine_number = normalizeEngineNumber(
			input.extraction.identifiers.engineNumber,
		)
	}

	if (input.extraction.make && input.documentType === 'registration') {
		updates.make = input.extraction.make
	}

	if (input.extraction.model && input.documentType === 'registration') {
		updates.model = input.extraction.model
	}

	if (input.extraction.variant && input.documentType === 'registration') {
		updates.variant = input.extraction.variant
	}

	if (
		input.extraction.rawFields.fuel_type &&
		input.documentType === 'registration'
	) {
		updates.fuel_type = input.extraction.rawFields.fuel_type
	}

	if (
		input.extraction.rawFields.color &&
		input.documentType === 'registration'
	) {
		updates.color = input.extraction.rawFields.color
	}

	if (input.extraction.rawFields.registration_date) {
		updates.registration_date = input.extraction.rawFields.registration_date
	}

	if (input.extraction.rawFields.purchase_date) {
		updates.purchase_date = input.extraction.rawFields.purchase_date
	}

	if (Object.keys(updates).length === 0) {
		return
	}

	const { data: existing } = await supabase
		.from('vehicles')
		.select(
			'registration_number, vin, engine_number, make, model, variant, fuel_type, color, registration_date, purchase_date',
		)
		.eq('id', input.vehicleId)
		.maybeSingle()

	const merged: Record<string, string | null> = {}

	for (const [key, value] of Object.entries(updates)) {
		const current = existing?.[key as keyof typeof existing] as string | null

		if (!current && value) {
			merged[key] = value
		}

		if (
			key === 'registration_number' &&
			value &&
			current &&
			normalizeRegistrationNumber(current) !==
				normalizeRegistrationNumber(value)
		) {
			merged[key] = value
		}
	}

	if (Object.keys(merged).length === 0) {
		return
	}

	await supabase
		.from('vehicles')
		.update({ ...merged, updated_at: now })
		.eq('id', input.vehicleId)
}

export async function ensureVehicleByFolderName(input: {
	userId: string
	displayName: string
	familyMemberId: string | null
	vehicles?: VehicleRecord[]
}): Promise<string> {
	const vehicles = input.vehicles ?? (await listUserVehicles(input.userId))
	const slug = slugifyVehicleName(input.displayName)
	const existing = vehicles.find((vehicle) => vehicle.slug === slug)

	if (existing) {
		return existing.id
	}

	return createVehicle({
		userId: input.userId,
		displayName: input.displayName,
		familyMemberId: input.familyMemberId,
		source: 'folder_discovery',
	})
}
