import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { FC, figmaCardStyle } from '@/ui/figma/tokens/figma-v2-tokens'

export function FigmaNotFoundScreen() {
	const navigate = useNavigate()

	return (
		<div
			style={{
				padding: '48px 22px 24px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				textAlign: 'center',
				minHeight: '50dvh',
				justifyContent: 'center',
			}}
		>
			<p
				style={{
					color: FC.dim,
					fontSize: 13,
					fontWeight: 600,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					marginBottom: 10,
				}}
			>
				404
			</p>
			<h1
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					letterSpacing: -1,
					marginBottom: 10,
					marginTop: 0,
				}}
			>
				Page not found
			</h1>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					marginBottom: 24,
					maxWidth: 280,
				}}
			>
				This screen doesn&apos;t exist in Chronicle yet.
			</p>
			<button
				type="button"
				onClick={() => navigate(ROUTES.home)}
				style={{
					...figmaCardStyle,
					borderRadius: 16,
					padding: '12px 20px',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<span style={{ color: FC.fg, fontSize: 14, fontWeight: 600 }}>
					Go home
				</span>
			</button>
		</div>
	)
}
