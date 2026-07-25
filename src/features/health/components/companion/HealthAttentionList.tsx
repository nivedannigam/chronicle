import { AlertTriangle } from 'lucide-react'
import { C } from '@/constants/colors'
import type { HealthAttentionItem } from '@/features/health/types/health-companion.types'

interface HealthAttentionListProps {
	items: HealthAttentionItem[]
}

function severityColor(severity: HealthAttentionItem['severity']): string {
	switch (severity) {
		case 'high':
			return C.red
		case 'medium':
			return C.orange
		default:
			return C.textMuted
	}
}

export function HealthAttentionList({ items }: HealthAttentionListProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<SectionLabel>Needs your attention</SectionLabel>
			<div style={{ display: 'grid', gap: 8 }}>
				{items.map((item) => (
					<div
						key={item.id}
						style={{
							display: 'flex',
							gap: 12,
							padding: '14px 16px',
							borderRadius: 16,
							background: `${severityColor(item.severity)}10`,
							border: `1px solid ${severityColor(item.severity)}33`,
						}}
					>
						<AlertTriangle
							size={18}
							color={severityColor(item.severity)}
							style={{ flexShrink: 0, marginTop: 2 }}
						/>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontSize: 14,
									fontWeight: 700,
									marginBottom: 4,
								}}
							>
								{item.title}
							</div>
							<div
								style={{
									fontSize: 13,
									color: C.textSec,
									lineHeight: 1.45,
								}}
							>
								{item.detail}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				fontSize: 11,
				fontWeight: 700,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				color: C.textMuted,
				marginBottom: 10,
			}}
		>
			{children}
		</div>
	)
}

export { SectionLabel as HealthSectionLabel }
