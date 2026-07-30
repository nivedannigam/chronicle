import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from '@chronicle/core-events'
import {
	bridgeEventBusToNotifications,
	getNotifications,
	pushNotification,
	registerEventNotificationMapper,
	subscribeNotifications,
} from './notification-store.ts'

describe('notification store', () => {
	it('maps bus events into channel notifications', async () => {
		const bus = createEventBus<
			'test.event',
			{ type: 'test.event'; message: string }
		>((event) => event.type)

		registerEventNotificationMapper<{ type: 'test.event'; message: string }>(
			'test.event',
			(event) => ({
				channel: 'test-channel',
				severity: 'info',
				message: event.message,
			}),
		)

		bridgeEventBusToNotifications(bus, (event) => event.type)

		await bus.publish({ type: 'test.event', message: 'hello' })

		expect(getNotifications('test-channel')[0]?.message).toBe('hello')
	})

	it('notifies live subscribers', () => {
		const listener = vi.fn()

		subscribeNotifications('live-channel', listener)
		pushNotification({
			channel: 'live-channel',
			severity: 'success',
			message: 'done',
		})

		expect(listener).toHaveBeenCalledTimes(1)
	})
})
