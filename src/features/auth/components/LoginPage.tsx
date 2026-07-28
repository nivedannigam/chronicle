import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { C, isMobileDevice, isStandaloneDisplayMode } from '@/constants/colors'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

export function LoginPage() {
	const [searchParams] = useSearchParams()
	const authError = searchParams.get('error')
	const isCompact = isStandaloneDisplayMode() || isMobileDevice()

	const shellStyle = useMemo(
		() =>
			isCompact
				? {
						minHeight: '100dvh',
						background: C.bg,
						padding: '32px 24px',
						paddingTop: 'calc(32px + env(safe-area-inset-top))',
						paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
					}
				: {
						minHeight: '100vh',
						background: C.outerBg,
						padding: '32px 16px',
					},
		[isCompact],
	)

	return (
		<div
			style={{
				...shellStyle,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
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
						margin: '0 0 24px',
						lineHeight: 1.5,
					}}
				>
					Your family health and documents — organized, searchable, and private.
				</p>

				{!isStandaloneDisplayMode() && isMobileDevice() ? (
					<p
						style={{
							fontSize: 13,
							color: C.textMuted,
							margin: '0 0 20px',
							lineHeight: 1.5,
							maxWidth: 300,
						}}
					>
						For the best experience, tap Share →{' '}
						<strong style={{ color: C.textSec, fontWeight: 600 }}>
							Add to Home Screen
						</strong>{' '}
						after signing in.
					</p>
				) : null}

				<GoogleSignInButton />

				{authError ? (
					<p
						style={{
							marginTop: 16,
							fontSize: 13,
							color: C.red,
							lineHeight: 1.5,
							maxWidth: 320,
						}}
					>
						{authError}
					</p>
				) : null}
			</div>
		</div>
	)
}
