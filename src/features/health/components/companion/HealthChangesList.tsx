import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { C } from '@/constants/colors'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import type { HealthChangeItem } from '@/features/health/types/health-companion.types'
import { FigmaCard } from '@/ui/figma/components/primitives'

interface HealthChangesListProps {
	items: HealthChangeItem[]
}

function ChangeIcon({
	direction,
}: {
	direction: HealthChangeItem['direction']
}) {
	switch (direction) {
		case 'improved':
		case 'resolved':
			return <ArrowUpRight size={16} color={C.greenAlt} />
		case 'worsened':
			return <ArrowDownRight size={16} color={C.orange} />
		default:
			return <Minus size={16} color={C.textMuted} />
	}
}

export function HealthChangesList({ items }: HealthChangesListProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HealthSectionLabel>What changed</HealthSectionLabel>
			<FigmaCard>
				{items.map((item, index) => (
					<div
						key={item.id}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: '14px 16px',
							borderBottom:
								index === items.length - 1 ? 'none' : `1px solid ${C.border}`,
						}}
					>
						<ChangeIcon direction={item.direction} />
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
							{item.detail ? (
								<div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
									{item.detail}
								</div>
							) : null}
						</div>
					</div>
				))}
			</FigmaCard>
		</section>
	)
}
