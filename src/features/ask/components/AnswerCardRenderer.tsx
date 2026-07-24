import type { AnswerCardData } from '@/features/ask/types'
import { ActionCard } from '@/features/ask/components/cards/ActionCard'
import { AlertCard } from '@/features/ask/components/cards/AlertCard'
import { ComparisonCard } from '@/features/ask/components/cards/ComparisonCard'
import { MetricCard } from '@/features/ask/components/cards/MetricCard'
import { ReportCard } from '@/features/ask/components/cards/ReportCard'
import { SummaryCard } from '@/features/ask/components/cards/SummaryCard'
import { TimelineCard } from '@/features/ask/components/cards/TimelineCard'
import { TrendCard } from '@/features/ask/components/cards/TrendCard'

interface AnswerCardRendererProps {
	cards: AnswerCardData[]
}

export function AnswerCardRenderer({ cards }: AnswerCardRendererProps) {
	if (cards.length === 0) {
		return null
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			{cards.map((card) => {
				switch (card.type) {
					case 'summary':
						return <SummaryCard key={card.id} data={card} />
					case 'metric':
						return <MetricCard key={card.id} data={card} />
					case 'trend':
						return <TrendCard key={card.id} data={card} />
					case 'timeline':
						return <TimelineCard key={card.id} data={card} />
					case 'report':
						return <ReportCard key={card.id} data={card} />
					case 'action':
						return <ActionCard key={card.id} data={card} />
					case 'comparison':
						return <ComparisonCard key={card.id} data={card} />
					case 'alert':
						return <AlertCard key={card.id} data={card} />
					default:
						return null
				}
			})}
		</div>
	)
}
