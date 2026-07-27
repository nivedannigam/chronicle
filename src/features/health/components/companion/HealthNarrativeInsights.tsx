import { C } from '@/constants/colors'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import { FigmaCard } from '@/ui/figma/components/primitives'

interface HealthNarrativeInsightsProps {
	paragraphs: string[]
}

export function HealthNarrativeInsights({
	paragraphs,
}: HealthNarrativeInsightsProps) {
	if (paragraphs.length === 0) {
		return null
	}

	return (
		<section>
			<HealthSectionLabel>What you should know</HealthSectionLabel>
			<FigmaCard style={{ padding: '18px 16px', display: 'grid', gap: 14 }}>
				{paragraphs.map((paragraph, index) => (
					<p
						key={index}
						style={{
							margin: 0,
							fontSize: 15,
							color: C.textSec,
							lineHeight: 1.65,
						}}
					>
						{paragraph}
					</p>
				))}
			</FigmaCard>
		</section>
	)
}
