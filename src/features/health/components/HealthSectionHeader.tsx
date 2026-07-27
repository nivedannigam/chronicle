import type { ReactNode } from 'react'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'

interface HealthSectionHeaderProps {
	title: string
}

export function HealthSectionHeader({ title }: HealthSectionHeaderProps) {
	return <HealthSectionLabel>{title}</HealthSectionLabel>
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
