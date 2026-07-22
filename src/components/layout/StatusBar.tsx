import { BatteryIcon, SignalIcon, WifiIcon } from '@/assets/icons'
import { C } from '@/constants/colors'

export function StatusBar() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'space-between',
				padding: '10px 22px 8px',
				height: 44,
				flexShrink: 0,
				position: 'relative',
				zIndex: 2,
			}}
		>
			<span
				style={{
					fontSize: 15,
					fontWeight: 600,
					color: C.text,
					letterSpacing: '-0.01em',
				}}
			>
				00:08
			</span>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					transform: 'translateX(-50%)',
					top: 8,
					width: 120,
					height: 30,
					background: '#000',
					borderRadius: 20,
				}}
			/>
			<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
				<SignalIcon />
				<WifiIcon />
				<BatteryIcon />
			</div>
		</div>
	)
}
