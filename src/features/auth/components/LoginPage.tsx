import { C } from '@/constants/colors'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

export function LoginPage() {
	return (
		<div
			style={{
				minHeight: '100vh',
				background: C.outerBg,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '32px 16px',
				fontFamily:
					'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
				WebkitFontSmoothing: 'antialiased',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 360,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					textAlign: 'center',
				}}
			>
				<div
					style={{
						width: 64,
						height: 64,
						borderRadius: 18,
						background: C.accentDim,
						border: `1px solid rgba(108,111,255,0.25)`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						marginBottom: 24,
						boxShadow: `0 0 32px rgba(108,111,255,0.18)`,
					}}
				>
					<span
						style={{
							fontSize: 28,
							fontWeight: 800,
							color: C.accent,
							letterSpacing: '-0.03em',
						}}
					>
						C
					</span>
				</div>

				<h1
					style={{
						fontSize: 34,
						fontWeight: 800,
						color: C.text,
						letterSpacing: '-0.03em',
						margin: '0 0 8px',
					}}
				>
					Chronicle
				</h1>

				<p
					style={{
						fontSize: 15,
						color: C.textSec,
						margin: '0 0 40px',
						lineHeight: 1.5,
					}}
				>
					Your Personal Operating System
				</p>

				<GoogleSignInButton />
			</div>
		</div>
	)
}
