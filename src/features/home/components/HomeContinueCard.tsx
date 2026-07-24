import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import type { HomeContinueItem } from '@/features/home/types/home.types'

interface HomeContinueCardProps {
	item: HomeContinueItem | null
	isLoading?: boolean
}

export function HomeContinueCard({
	item,
	isLoading = false,
}: HomeContinueCardProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 28 }}>
				<HomeSectionLabel>Continue</HomeSectionLabel>
				<div
					style={{
						height: 88,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	if (!item) {
		return null
	}

	return (
		<section style={{ marginBottom: 28 }}>
			<HomeSectionLabel>{HOME_COPY.continueLabel}</HomeSectionLabel>
			<button
				type="button"
				onClick={() => navigate(item.path)}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: 14,
					padding: '16px 18px',
					borderRadius: 18,
					border: `1px solid ${C.border}`,
					background: C.card,
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
					transition: 'border-color 0.15s ease, transform 0.15s ease',
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 15,
							fontWeight: 700,
							marginBottom: 4,
							letterSpacing: '-0.01em',
						}}
					>
						{item.title}
					</div>
					<div
						style={{
							fontSize: 13,
							color: C.textMuted,
							lineHeight: 1.45,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{item.description}
					</div>
				</div>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 10,
						background: C.accentDim,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<ArrowRight size={18} color={C.accent} />
				</div>
			</button>
		</section>
	)
}
