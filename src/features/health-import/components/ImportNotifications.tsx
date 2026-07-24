import { useEffect, useState } from 'react'
import { C } from '@/constants/colors'
import {
	getImportNotifications,
	subscribeImportNotifications,
} from '@/features/health-import/services/import-notifications.service'
import type { ImportNotification } from '@/features/health-import/types/health-import.types'

export function ImportNotifications() {
	const [notifications, setNotifications] = useState<ImportNotification[]>(
		getImportNotifications(),
	)

	useEffect(() => {
		return subscribeImportNotifications(() => {
			setNotifications(getImportNotifications())
		})
	}, [])

	if (notifications.length === 0) {
		return null
	}

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				marginBottom: 16,
			}}
		>
			{notifications.slice(0, 3).map((notification) => (
				<div
					key={notification.id}
					style={{
						background:
							notification.type === 'failed'
								? 'rgba(239,68,68,0.12)'
								: notification.type === 'complete'
									? 'rgba(52,211,153,0.12)'
									: C.accentDim,
						border: `1px solid ${C.border}`,
						borderRadius: 12,
						padding: '10px 12px',
						fontSize: 12,
						color: C.textSec,
					}}
				>
					{notification.message}
				</div>
			))}
		</div>
	)
}
