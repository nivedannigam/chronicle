import { TrendChart } from '@/features/health/components/TrendChart'
import type { TrendCardData } from '@/features/ask/types'

interface TrendCardProps {
	data: TrendCardData
}

export function TrendCard({ data }: TrendCardProps) {
	return (
		<TrendChart
			series={{
				id: data.id,
				name: data.name,
				unit: data.unit,
				color: data.color,
				values: data.values,
			}}
		/>
	)
}
