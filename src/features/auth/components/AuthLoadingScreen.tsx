import { Loader2 } from 'lucide-react'
import { C } from '@/constants/colors'

export function AuthLoadingScreen() {
	return (
		<div
			style={{
				minHeight: '100vh',
				background: C.outerBg,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 16,
			}}
		>
			<Loader2
				size={32}
				color={C.accent}
				style={{ animation: 'spin 1s linear infinite' }}
			/>
			<p style={{ fontSize: 14, color: C.textMuted }}>Loading...</p>
		</div>
	)
}
