import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { qaShouldBypassRemoteTables } from '@/qa/qa-boundary'
import {
	qaInterceptFamilyMembers,
	qaInterceptVehicleKnowledgeRawData,
} from '@/qa/qa-interceptors'
import type {
	VehicleDocumentRecord,
	VehicleFactRecord,
	VehicleRecord,
	VehicleTimelineRecord,
} from '@/features/vehicle-knowledge/types/vehicle-record.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export interface VehicleKnowledgeRawData {
	vehicles: VehicleRecord[]
	documents: VehicleDocumentRecord[]
	facts: VehicleFactRecord[]
	timeline: VehicleTimelineRecord[]
	linkedMotorPolicies: Array<{
		policyId: string
		productName: string
		expiryDate: string | null
		insurerId: string
		sourceLabels: string[]
	}>
	familyMembers: Array<{
		id: string
		displayName: string
		relationship: string
		isAccountOwner: boolean
	}>
	importRegistry: ReturnType<typeof listRegistryRecords> extends Promise<
		infer T
	>
		? T
		: never
}

function mapVehicle(row: Record<string, unknown>): VehicleRecord {
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

function mapDocument(row: Record<string, unknown>): VehicleDocumentRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		vehicleId: row.vehicle_id as string,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		registryId: (row.registry_id as string | null) ?? null,
		fileName: row.file_name as string,
		documentType: row.document_type as VehicleDocumentTypeId,
		documentSubtype: (row.document_subtype as string) ?? 'unknown',
		status: row.status as string,
		documentDate: (row.document_date as string | null) ?? null,
		expiryDate: (row.expiry_date as string | null) ?? null,
		storagePath: (row.storage_path as string | null) ?? null,
		uploadedAt: row.uploaded_at as string,
		processedAt: (row.processed_at as string | null) ?? null,
	}
}

function mapFact(row: Record<string, unknown>): VehicleFactRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		vehicleId: row.vehicle_id as string,
		documentId: (row.document_id as string | null) ?? null,
		factKey: row.fact_key as string,
		factValue: (row.fact_value as string | null) ?? null,
		valueDate: (row.value_date as string | null) ?? null,
		valueNumber: row.value_number == null ? null : Number(row.value_number),
		confidence: Number(row.confidence ?? 0.5),
		source: row.source as string,
	}
}

function mapTimeline(row: Record<string, unknown>): VehicleTimelineRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		vehicleId: row.vehicle_id as string,
		documentId: (row.document_id as string | null) ?? null,
		eventType: row.event_type as VehicleTimelineRecord['eventType'],
		title: row.title as string,
		description: (row.description as string | null) ?? null,
		eventDate: row.event_date as string,
		evidenceIds: Array.isArray(row.evidence_ids)
			? (row.evidence_ids as string[])
			: [],
	}
}

export async function fetchVehicleKnowledgeRawData(
	userId: string,
): Promise<VehicleKnowledgeRawData> {
	if (qaShouldBypassRemoteTables(userId)) {
		const qaData = qaInterceptVehicleKnowledgeRawData(userId)
		const members = qaInterceptFamilyMembers(userId) ?? []

		if (qaData) {
			return {
				...qaData,
				familyMembers:
					qaData.familyMembers.length > 0
						? qaData.familyMembers
						: members.map((member) => ({
								id: member.id,
								displayName: member.displayName,
								relationship: member.relationship,
								isAccountOwner: member.isAccountOwner,
							})),
			}
		}

		return {
			vehicles: [],
			documents: [],
			facts: [],
			timeline: [],
			linkedMotorPolicies: [],
			familyMembers: members.map((member) => ({
				id: member.id,
				displayName: member.displayName,
				relationship: member.relationship,
				isAccountOwner: member.isAccountOwner,
			})),
			importRegistry: [],
		}
	}

	const [
		vehiclesResult,
		documentsResult,
		factsResult,
		timelineResult,
		membersResult,
		motorPoliciesResult,
		importRegistry,
	] = await Promise.all([
		supabase.from('vehicles').select('*').eq('user_id', userId),
		supabase.from('vehicle_documents').select('*').eq('user_id', userId),
		supabase.from('vehicle_facts').select('*').eq('user_id', userId),
		supabase
			.from('vehicle_timeline_events')
			.select('*')
			.eq('user_id', userId)
			.order('event_date', { ascending: false }),
		supabase
			.from('family_members')
			.select('id, display_name, relationship, is_account_owner')
			.eq('user_id', userId),
		supabase
			.from('insurance_policies')
			.select(
				'id, product_name, expiry_date, insurer_id, policy_type, source_document_ids',
			)
			.eq('user_id', userId)
			.eq('policy_type', 'motor'),
		listRegistryRecords(userId, 'google-drive'),
	])

	if (vehiclesResult.error) throw new Error(vehiclesResult.error.message)
	if (documentsResult.error) throw new Error(documentsResult.error.message)
	if (factsResult.error) throw new Error(factsResult.error.message)
	if (timelineResult.error) throw new Error(timelineResult.error.message)
	if (membersResult.error) throw new Error(membersResult.error.message)
	if (motorPoliciesResult.error) {
		throw new Error(motorPoliciesResult.error.message)
	}

	const sourceDocumentIds = [
		...new Set(
			(motorPoliciesResult.data ?? []).flatMap((row) =>
				Array.isArray(row.source_document_ids)
					? (row.source_document_ids as string[])
					: [],
			),
		),
	]

	const insuranceDocumentNames = new Map<string, string>()

	if (sourceDocumentIds.length > 0) {
		const { data: insuranceDocuments } = await supabase
			.from('insurance_documents')
			.select('id, file_name')
			.eq('user_id', userId)
			.in('id', sourceDocumentIds)

		for (const row of insuranceDocuments ?? []) {
			insuranceDocumentNames.set(row.id as string, row.file_name as string)
		}
	}

	return {
		vehicles: (vehiclesResult.data ?? []).map((row) =>
			mapVehicle(row as Record<string, unknown>),
		),
		documents: (documentsResult.data ?? []).map((row) =>
			mapDocument(row as Record<string, unknown>),
		),
		facts: (factsResult.data ?? []).map((row) =>
			mapFact(row as Record<string, unknown>),
		),
		timeline: (timelineResult.data ?? []).map((row) =>
			mapTimeline(row as Record<string, unknown>),
		),
		linkedMotorPolicies: (motorPoliciesResult.data ?? []).map((row) => {
			const sourceDocumentIds = Array.isArray(row.source_document_ids)
				? (row.source_document_ids as string[])
				: []

			return {
				policyId: row.id as string,
				productName: (row.product_name as string | null) ?? 'Motor policy',
				expiryDate: (row.expiry_date as string | null) ?? null,
				insurerId: (row.insurer_id as string) ?? 'unknown-insurer',
				sourceLabels: sourceDocumentIds
					.map((documentId) => insuranceDocumentNames.get(documentId))
					.filter((label): label is string => Boolean(label)),
			}
		}),
		familyMembers: (membersResult.data ?? []).map((row) => ({
			id: row.id as string,
			displayName: row.display_name as string,
			relationship: row.relationship as string,
			isAccountOwner: Boolean(row.is_account_owner),
		})),
		importRegistry,
	}
}
