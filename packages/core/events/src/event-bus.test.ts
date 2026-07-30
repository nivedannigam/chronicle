import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from './event-bus.ts'

describe('createEventBus', () => {
	it('delivers events to specific and wildcard subscribers', async () => {
		const bus = createEventBus<'a' | 'b', { type: 'a' | 'b'; value: number }>(
			(event) => event.type,
		)
		const specific = vi.fn()
		const global = vi.fn()

		bus.subscribe('a', specific)
		bus.subscribe('*', global)

		await bus.publish({ type: 'a', value: 1 })

		expect(specific).toHaveBeenCalledTimes(1)
		expect(global).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes handlers', async () => {
		const bus = createEventBus<'a', { type: 'a' }>((event) => event.type)
		const handler = vi.fn()
		const unsubscribe = bus.subscribe('a', handler)

		unsubscribe()
		await bus.publish({ type: 'a' })

		expect(handler).not.toHaveBeenCalled()
	})
})
