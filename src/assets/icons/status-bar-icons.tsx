export function SignalIcon() {
	return (
		<svg width="17" height="12" viewBox="0 0 17 12" fill="white">
			<rect x="0" y="9" width="3" height="3" rx="0.5" />
			<rect x="4.5" y="6" width="3" height="6" rx="0.5" />
			<rect x="9" y="3" width="3" height="9" rx="0.5" />
			<rect x="13.5" y="0" width="3" height="12" rx="0.5" />
		</svg>
	)
}

export function WifiIcon() {
	return (
		<svg width="16" height="12" viewBox="0 0 16 12" fill="white">
			<path d="M8 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
			<path
				d="M4.5 7.5a4.95 4.95 0 0 1 7 0"
				strokeWidth="1.5"
				stroke="white"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M1.5 4.5a9 9 0 0 1 13 0"
				strokeWidth="1.5"
				stroke="white"
				fill="none"
				strokeLinecap="round"
			/>
		</svg>
	)
}

export function BatteryIcon() {
	return (
		<svg width="26" height="12" viewBox="0 0 26 12" fill="none">
			<rect
				x=".5"
				y=".5"
				width="22"
				height="11"
				rx="3.5"
				stroke="white"
				strokeOpacity=".35"
			/>
			<rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="white" />
			<path d="M23 4v4a2.5 2.5 0 0 0 0-4z" fill="white" fillOpacity=".4" />
		</svg>
	)
}
