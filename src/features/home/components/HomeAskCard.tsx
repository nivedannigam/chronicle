import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { HOME_COPY, ASK_QUESTION_GROUPS } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

const healthPrompts =
	ASK_QUESTION_GROUPS.find((group) => group.id === 'health')?.questions.slice(
		0,
		3,
	) ?? []

export function HomeAskCard() {
	const navigate = useNavigate()

	return (
		<section style={{ marginBottom: 8 }}>
			<HomeSectionLabel>{HOME_COPY.askLabel}</HomeSectionLabel>
			<button
				type="button"
				onClick={() => navigate(ROUTES.ask)}
				style={{
					width: '100%',
					background: `linear-gradient(145deg, rgba(108,111,255,0.16) 0%, rgba(61,140,240,0.06) 100%)`,
					border: `1px solid rgba(108,111,255,0.28)`,
					borderRadius: 20,
					padding: '18px 16px',
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
					boxShadow: '0 8px 28px rgba(108,111,255,0.12)',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						marginBottom: 14,
					}}
				>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 11,
							background: C.accentDim,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Sparkles size={18} color={C.accent} />
					</div>
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
							Ask what matters
						</div>
						<div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
							Chronicle understands what you have shared
						</div>
					</div>
					<ChevronRight size={18} color={C.textMuted} />
				</div>

				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
					{healthPrompts.map((suggestion) => (
						<span
							key={suggestion}
							style={{
								fontSize: 12,
								fontWeight: 500,
								color: C.textSec,
								background: 'rgba(255,255,255,0.06)',
								borderRadius: 100,
								padding: '6px 11px',
								border: `1px solid ${C.border}`,
							}}
						>
							{suggestion}
						</span>
					))}
				</div>
			</button>
		</section>
	)
}
