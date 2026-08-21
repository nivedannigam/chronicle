import { describe, expect, it } from 'vitest'
import { filterTimelineEvents } from '@/features/timeline/engine/timeline-engine'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'

function event(
	overrides: Partial<ChronicleTimelineEvent> = {},
): ChronicleTimelineEvent {
	return {
		id: 'event-1',
		timestamp: '2026-01-01T00:00:00.000Z',
		eventType: 'document_uploaded',
		category: 'life',
		title: 'Passport uploaded',
		summary: 'Passport uploaded',
		familyMemberId: 'member-a',
		sourceModule: 'identity',
		relatedAssets: [],
		tags: [],
		importance: 'medium',
		references: [],
		metadata: {},
		...overrides,
	}
}

describe('timeline privacy filtering', () => {
	it('does not leak another member event into a member-specific view', () => {
		const filtered = filterTimelineEvents(
			[
				event({ id: 'a', familyMemberId: 'member-a' }),
				event({ id: 'b', familyMemberId: 'member-b' }),
			],
			{
				memberId: 'member-a',
				accountOwnerMemberId: 'member-a',
			},
		)

		expect(filtered.map((entry) => entry.id)).toEqual(['a'])
	})

	it('includes shared events for any member view', () => {
		const filtered = filterTimelineEvents(
			[
				event({
					id: 'shared',
					familyMemberId: null,
					metadata: { privacyScope: 'shared' },
				}),
				event({ id: 'private', familyMemberId: 'member-b' }),
			],
			{
				memberId: 'member-a',
				accountOwnerMemberId: 'member-a',
			},
		)

		expect(filtered.map((entry) => entry.id)).toEqual(['shared'])
	})
})
