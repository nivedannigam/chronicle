import { describe, expect, it } from 'vitest'
import { vehiclesTimelineProvider } from '@/features/timeline/providers/vehicles-timeline.provider'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

function buildVehicleKnowledge(): VehicleKnowledge {
	return {
		userId: 'user-1',
		familyMember: {
			id: 'member-nivedan',
			displayName: 'Nivedan',
			isAccountOwner: true,
		},
		vehicles: [
			{
				id: 'vehicle-1',
				displayName: 'XEV 9e',
				slug: 'xev-9e',
			} as VehicleKnowledge['vehicles'][number],
		],
		documents: [],
		facts: [],
		timeline: [
			{
				id: 'event-insurance',
				vehicleId: 'vehicle-1',
				eventType: 'insurance_renewed',
				title: 'Insurance renewed',
				description: 'Comprehensive policy renewed',
				eventDate: '2026-03-01T00:00:00.000Z',
				year: 2026,
				evidenceIds: ['doc-insurance'],
			},
			{
				id: 'event-upload',
				vehicleId: 'vehicle-1',
				eventType: 'document_uploaded',
				title: 'PDF uploaded',
				description: 'Should not appear as a life event source',
				eventDate: '2026-03-02T00:00:00.000Z',
				year: 2026,
				evidenceIds: ['doc-upload'],
			},
		],
		attention: [],
		summary: { headline: '1 vehicle', lines: [] },
		hasVehicles: true,
		documentCount: 1,
		limitations: [],
	}
}

describe('vehiclesTimelineProvider', () => {
	it('maps canonical vehicle timeline events with domain dates', () => {
		const events = vehiclesTimelineProvider.getEvents({
			userId: 'user-1',
			sources: {
				vehicles: {
					knowledge: buildVehicleKnowledge(),
				},
			},
		})

		expect(events).toHaveLength(2)
		expect(events[0]?.sourceModule).toBe('vehicles')
		expect(events[0]?.timestamp).toBe('2026-03-01T00:00:00.000Z')
		expect(events[0]?.title).toBe('Insurance renewed')
	})

	it('supports vehicles module filtering', () => {
		const events = vehiclesTimelineProvider.getEvents({
			userId: 'user-1',
			sources: {
				vehicles: {
					knowledge: buildVehicleKnowledge(),
				},
			},
		})

		expect(events.every((event) => event.sourceModule === 'vehicles')).toBe(
			true,
		)
	})
})
