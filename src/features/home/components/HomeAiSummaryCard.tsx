import { Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import type { HomeBriefing } from '@/features/home/types/home.types'

const TONE_STYLES: Record<
	HomeBriefing['aiSummaryTone'],
	{ gradient: string; glow: string; accent: string }
> = {
	positive: {
		gradient:
			'linear-gradient(145deg, rgba(45,207,193,0.18) 0%, rgba(48,209,88,0.08) 100%)',
		glow: 'rgba(45,207,193,0.15)',
		accent: C.teal,
	},
	neutral: {
		gradient:
			'linear-gradient(145deg, rgba(108,111,255,0.2) 0%, rgba(61,140,240,0.08) 100%)',
		glow: 'rgba(108,111,255,0.18)',
		accent: C.accent,
	},
	attention: {
		gradient:
			'linear-gradient(145deg, rgba(255,159,10,0.16) 0%, rgba(255,69,58,0.08) 100%)',
		glow: 'rgba(255,159,10,0.14)',
		accent: C.orange,
	},
}

interface HomeAiSummaryCardProps {
	summary: string
	tone: HomeBriefing['aiSummaryTone']
	isLoading?: boolean
}

export function HomeAiSummaryCard({
	summary,
	tone,
	isLoading = false,
}: HomeAiSummaryCardProps) {
	const styles = TONE_STYLES[tone]

	if (isLoading) {
		return (
			<div
				style={{
					height: 132,
					borderRadius: 22,
					background: C.card,
					border: `1px solid ${C.border}`,
					marginBottom: 28,
					opacity: 0.6,
				}}
			/>
		)
	}

	return (
		<div
			style={{
				position: 'relative',
				borderRadius: 22,
				padding: '22px 20px',
				marginBottom: 28,
				background: styles.gradient,
				border: `1px solid rgba(255,255,255,0.08)`,
				boxShadow: `0 8px 32px ${styles.glow}`,
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: -40,
					right: -20,
					width: 120,
					height: 120,
					borderRadius: '50%',
					background: styles.glow,
					filter: 'blur(40px)',
					pointerEvents: 'none',
				}}
			/>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 14,
					position: 'relative',
				}}
			>
				<div
					style={{
						width: 40,
						height: 40,
						borderRadius: 12,
						background: 'rgba(255,255,255,0.08)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<Sparkles size={20} color={styles.accent} strokeWidth={2} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: 'rgba(255,255,255,0.45)',
							marginBottom: 8,
						}}
					>
						{HOME_COPY.briefLabel}
					</div>
					<div
						style={{
							fontSize: 20,
							fontWeight: 600,
							lineHeight: 1.35,
							letterSpacing: '-0.02em',
							color: C.text,
						}}
					>
						{summary}
					</div>
				</div>
			</div>
		</div>
	)
}
