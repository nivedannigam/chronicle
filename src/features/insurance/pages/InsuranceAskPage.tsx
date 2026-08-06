import { FigmaInsuranceAskScreen } from '@/ui/figma/insurance/FigmaInsuranceAskScreen'

export function InsuranceAskPage() {
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
			<FigmaInsuranceAskScreen />
		</div>
	)
}
