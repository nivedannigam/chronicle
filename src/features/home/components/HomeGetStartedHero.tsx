import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'

interface HomeGetStartedHeroProps {
	onSetupHealth: () => void
	onUploadDocument: () => void
}

export function HomeGetStartedHero({
	onSetupHealth,
	onUploadDocument,
}: HomeGetStartedHeroProps) {
	const navigate = useNavigate()

	return (
		<section style={{ marginBottom: 24 }}>
			<div
				style={{
					padding: '22px 18px',
					borderRadius: 20,
					background: `linear-gradient(160deg, rgba(108,111,255,0.14) 0%, ${C.card} 60%)`,
					border: `1px solid rgba(108,111,255,0.22)`,
				}}
			>
				<div
					style={{
						fontSize: 20,
						fontWeight: 800,
						letterSpacing: '-0.03em',
						marginBottom: 8,
					}}
				>
					{COMMAND_CENTER_COPY.getStartedTitle}
				</div>
				<div
					style={{
						fontSize: 14,
						color: C.textSec,
						lineHeight: 1.55,
						marginBottom: 18,
					}}
				>
					{COMMAND_CENTER_COPY.getStartedBody}
				</div>

				<div style={{ display: 'grid', gap: 10 }}>
					<button
						type="button"
						onClick={onSetupHealth}
						style={{
							width: '100%',
							minHeight: 48,
							borderRadius: 14,
							border: 'none',
							background: C.accent,
							color: C.text,
							fontSize: 14,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '0 16px',
						}}
					>
						Connect health records
						<ChevronRight size={18} />
					</button>
					<button
						type="button"
						onClick={onUploadDocument}
						style={{
							width: '100%',
							minHeight: 48,
							borderRadius: 14,
							border: `1px solid ${C.border}`,
							background: C.card2,
							color: C.text,
							fontSize: 14,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '0 16px',
						}}
					>
						Upload a document
						<ChevronRight size={18} />
					</button>
					<button
						type="button"
						onClick={() => navigate(ROUTES.ask)}
						style={{
							background: 'none',
							border: 'none',
							color: C.accent,
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
							padding: '4px 0',
							textAlign: 'left',
						}}
					>
						Or try Ask Chronicle →
					</button>
				</div>
			</div>
		</section>
	)
}
