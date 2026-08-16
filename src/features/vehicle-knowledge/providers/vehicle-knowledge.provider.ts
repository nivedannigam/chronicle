import { buildVehicleKnowledgeFromRawData } from '@/features/vehicle-knowledge/services/vehicle-knowledge-builder'
import {
	fetchVehicleKnowledgeRawData,
	type VehicleKnowledgeRawData,
} from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

export interface VehicleKnowledgeGetInput {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}

export const vehicleKnowledgeProvider = {
	async getKnowledge(
		input: VehicleKnowledgeGetInput,
	): Promise<VehicleKnowledge> {
		const raw = await fetchVehicleKnowledgeRawData(input.userId)

		return buildVehicleKnowledgeFromRawData(raw, {
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
			accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		})
	},

	buildFromRawData(
		raw: VehicleKnowledgeRawData,
		input: VehicleKnowledgeGetInput,
	): VehicleKnowledge {
		return buildVehicleKnowledgeFromRawData(raw, {
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
			accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		})
	},
}
