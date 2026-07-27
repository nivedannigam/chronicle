import { AlertTriangle, ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import type { HealthAttentionItem } from '@/features/health/types/health-companion.types'
import { FigmaCard } from '@/ui/figma/components/primitives'

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
			return C.accentBlue
	}
}

export function HealthAttentionList({ items }: HealthAttentionListProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HealthSectionLabel>Needs your attention</HealthSectionLabel>
			<FigmaCard style={{ padding: 16 }}>
				{items.map((item, index) => (
					<div
						key={item.id}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 11,
							marginBottom: index < items.length - 1 ? 12 : 0,
						}}
					>
						<div
							style={{
								width: 32,
								height: 32,
								borderRadius: 10,
								background: `${severityColor(item.severity)}18`,
								border: `1px solid ${severityColor(item.severity)}28`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							<AlertTriangle size={14} color={severityColor(item.severity)} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontSize: 13,
									fontWeight: 700,
									marginBottom: 2,
									color: C.text,
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
						<ChevronRight size={13} color={C.textMuted} />
					</div>
				))}
			</FigmaCard>
		</section>
	)
}
