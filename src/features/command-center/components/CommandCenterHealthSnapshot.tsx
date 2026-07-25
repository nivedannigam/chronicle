import { useNavigate } from 'react-router-dom'
import { ChevronRight, Heart } from 'lucide-react'
import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

interface CommandCenterHealthSnapshotProps {
	status: string
	reportCount: number
	latestReportTitle: string | null
	isLoading?: boolean
}

export function CommandCenterHealthSnapshot({
	status,
	reportCount,
	latestReportTitle,
	isLoading = false,
}: CommandCenterHealthSnapshotProps) {
	const navigate = useNavigate()

	if (isLoading) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.healthSnapshotLabel}
				</HomeSectionLabel>
				<div
					style={{
						height: 88,
						borderRadius: 18,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	const hasData = reportCount > 0

	return (
		<section style={{ marginBottom: 24 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<HomeSectionLabel>
					{COMMAND_CENTER_COPY.healthSnapshotLabel}
				</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.health)}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						fontSize: 12,
						fontWeight: 600,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
						display: 'flex',
						alignItems: 'center',
						gap: 2,
					}}
				>
					Open Health
					<ChevronRight size={14} />
				</button>
			</div>

			<button
				type="button"
				onClick={() => navigate(ROUTES.health)}
				style={{
					width: '100%',
					padding: '16px',
					borderRadius: 18,
					border: `1px ${hasData ? 'solid' : 'dashed'} ${C.border}`,
					background: C.card,
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<div
						style={{
							width: 40,
							height: 40,
							borderRadius: 12,
							background: `${C.teal}18`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Heart size={20} color={C.teal} />
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
							{hasData ? status : 'No health records yet'}
						</div>
						<div
							style={{
								fontSize: 12,
								color: C.textMuted,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{hasData
								? `${reportCount} report${reportCount === 1 ? '' : 's'}${latestReportTitle ? ` · Latest: ${latestReportTitle}` : ''}`
								: 'Connect health records to see how you are doing'}
						</div>
					</div>
					<ChevronRight size={16} color={C.textMuted} />
				</div>
			</button>
		</section>
	)
}
