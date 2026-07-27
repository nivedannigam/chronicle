import { FigmaAskScreen } from '@/ui/figma/screens/FigmaAskScreen'

export function AskPage() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flex: 1,
				minHeight: 0,
			}}
		>
			<FigmaAskScreen />
		</div>
	)
}
