import { FigmaAskScreen } from '@/ui/figma/screens/FigmaAskScreen'

export function HealthAskPage() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flex: 1,
				minHeight: 0,
				margin: '-4px -22px 0',
			}}
		>
			<FigmaAskScreen consumerMode />
		</div>
	)
}
