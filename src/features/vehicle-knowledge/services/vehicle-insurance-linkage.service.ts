import type { VehicleRecord } from '@/features/vehicle-knowledge/types/vehicle-record.types'

export interface LinkedMotorPolicy {
	policyId: string
	productName: string
	expiryDate: string | null
	insurerId: string
	sourceLabels: string[]
}

function normalizeMatchText(value: string | null | undefined): string {
	return (value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

function vehicleMatchTokens(
	vehicle: Pick<VehicleRecord, 'displayName' | 'model' | 'make' | 'variant'>,
): string[] {
	const tokens = new Set<string>()

	for (const value of [
		vehicle.displayName,
		vehicle.model,
		vehicle.variant,
		`${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim(),
	]) {
		const normalized = normalizeMatchText(value)

		if (normalized.length >= 3) {
			tokens.add(normalized)
		}

		for (const part of normalized
			.split(/\s+/)
			.filter((part) => part.length >= 3)) {
			tokens.add(part)
		}
	}

	return [...tokens]
}

export function matchMotorPoliciesToVehicle(
	vehicle: Pick<VehicleRecord, 'displayName' | 'model' | 'make' | 'variant'>,
	policies: LinkedMotorPolicy[] = [],
): LinkedMotorPolicy[] {
	const tokens = vehicleMatchTokens(vehicle)

	if (tokens.length === 0) {
		return []
	}

	return policies.filter((policy) => {
		const haystack = normalizeMatchText(
			[policy.productName, ...policy.sourceLabels].join(' '),
		)

		return tokens.some((token) => haystack.includes(token))
	})
}

export function pickLatestLinkedMotorPolicy(
	policies: LinkedMotorPolicy[],
): LinkedMotorPolicy | null {
	return (
		[...policies]
			.filter((policy) => policy.expiryDate)
			.sort((left, right) =>
				(right.expiryDate ?? '').localeCompare(left.expiryDate ?? ''),
			)[0] ?? null
	)
}
