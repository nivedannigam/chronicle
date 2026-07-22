import type { ReactNode } from 'react'
import { sectionLabelStyle } from '@/features/health/types/health.types'

interface HealthSectionHeaderProps {
	title: string
}

export function HealthSectionHeader({ title }: HealthSectionHeaderProps) {
	return <div style={sectionLabelStyle}>{title}</div>
}

export function HealthSubsection({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	return (
		<div style={{ marginBottom: 26 }}>
			<HealthSectionHeader title={title} />
			{children}
		</div>
	)
}
