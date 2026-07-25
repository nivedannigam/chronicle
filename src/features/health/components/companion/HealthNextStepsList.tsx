import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { HealthSectionLabel } from '@/features/health/components/companion/HealthAttentionList'
import type { HealthNextStep } from '@/features/health/types/health-companion.types'

interface HealthNextStepsListProps {
	items: HealthNextStep[]
}

export function HealthNextStepsList({ items }: HealthNextStepsListProps) {
	const navigate = useNavigate()

	if (items.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HealthSectionLabel>Recommended next steps</HealthSectionLabel>
			<div style={{ display: 'grid', gap: 8 }}>
				{items.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => {
							if (item.actionPath) {
								navigate(item.actionPath)
							}
						}}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: '14px 16px',
							borderRadius: 16,
							background: C.card,
							border: `1px solid ${C.border}`,
							cursor: item.actionPath ? 'pointer' : 'default',
							fontFamily: 'inherit',
							textAlign: 'left',
							width: '100%',
						}}
					>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
								{item.title}
							</div>
							<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.45 }}>
								{item.reason}
							</div>
						</div>
						{item.actionPath ? (
							<ChevronRight size={18} color={C.textMuted} />
						) : null}
					</button>
				))}
			</div>
		</section>
	)
}
