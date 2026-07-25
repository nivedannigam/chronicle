import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import type { AttentionItem } from '@/features/command-center/types/command-center.types'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

const TONE_COLORS = {
	warning: C.orange,
	attention: C.yellow,
	info: C.accentBlue,
} as const

interface AttentionCenterProps {
	items: AttentionItem[]
	isLoading?: boolean
}

export function AttentionCenter({
	items,
	isLoading = false,
}: AttentionCenterProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.attentionLabel}
				</HomeSectionLabel>
				<div
					style={{
						height: 88,
						borderRadius: 16,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	if (items.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HomeSectionLabel>{COMMAND_CENTER_COPY.attentionLabel}</HomeSectionLabel>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					overflow: 'hidden',
				}}
			>
				{items.map((item, index) => {
					const toneColor = TONE_COLORS[item.tone]

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => navigate(item.path)}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'flex-start',
								gap: 12,
								padding: '14px 16px',
								background: 'transparent',
								border: 'none',
								borderBottom:
									index === items.length - 1 ? 'none' : `1px solid ${C.border}`,
								cursor: 'pointer',
								textAlign: 'left',
								fontFamily: 'inherit',
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: `${toneColor}18`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								<AlertTriangle size={15} color={toneColor} />
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
									{item.title}
								</div>
								<div
									style={{ fontSize: 12, color: C.textSec, lineHeight: 1.45 }}
								>
									{item.description}
									{item.memberName ? ` · ${item.memberName}` : ''}
								</div>
							</div>
							<ChevronRight
								size={16}
								color={C.textMuted}
								style={{ flexShrink: 0 }}
							/>
						</button>
					)
				})}
			</div>
		</section>
	)
}
