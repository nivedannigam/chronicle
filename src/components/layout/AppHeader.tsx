import { C } from '@/constants/colors'

export function AppHeader() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '10px 18px 8px',
				flexShrink: 0,
			}}
		>
			<div
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: C.text,
					letterSpacing: '-0.02em',
				}}
			>
				Chronicle
			</div>
		</div>
	)
}
