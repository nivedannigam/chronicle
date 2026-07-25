import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

interface HomeTodaySummaryProps {
	summary: string
	isLoading?: boolean
}

export function HomeTodaySummary({
	summary,
	isLoading = false,
}: HomeTodaySummaryProps) {
	if (isLoading) {
		return (
			<section style={{ marginBottom: 20 }}>
				<div
					style={{
						height: 72,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	return (
		<section style={{ marginBottom: 20 }}>
			<HomeSectionLabel>
				{COMMAND_CENTER_COPY.todaySummaryLabel}
			</HomeSectionLabel>
			<div
				style={{
					padding: '16px 18px',
					borderRadius: 18,
					background: `linear-gradient(145deg, ${C.card} 0%, rgba(108,111,255,0.06) 100%)`,
					border: `1px solid ${C.border}`,
					fontSize: 15,
					lineHeight: 1.55,
					color: C.textSec,
				}}
			>
				{summary}
			</div>
		</section>
	)
}
