import { useNavigate } from 'react-router-dom'
import { Activity, ChevronRight, Heart } from 'lucide-react'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import type { HomeBriefing } from '@/features/home/types/home.types'

interface HomeHealthSnapshotProps {
	briefing: HomeBriefing
}

export function HomeHealthSnapshot({ briefing }: HomeHealthSnapshotProps) {
	const navigate = useNavigate()

	if (briefing.isLoading) {
		return (
			<section style={{ marginBottom: 28 }}>
				<HomeSectionLabel>{HOME_COPY.healthLabel}</HomeSectionLabel>
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

	const summaryParts: string[] = []

	if (briefing.healthScore !== null) {
		summaryParts.push(`Score ${briefing.healthScore}`)
	}

	if (briefing.importedReportsCount > 0) {
		summaryParts.push(
			`${briefing.importedReportsCount} report${briefing.importedReportsCount === 1 ? '' : 's'}`,
		)
	}

	if (briefing.latestReportTitle) {
		summaryParts.push(`Latest: ${briefing.latestReportTitle}`)
	}

	return (
		<section style={{ marginBottom: 28 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<HomeSectionLabel>{HOME_COPY.healthLabel}</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.health)}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						fontSize: 12,
						fontWeight: 600,
						color: C.teal,
						cursor: 'pointer',
						fontFamily: 'inherit',
						display: 'flex',
						alignItems: 'center',
						gap: 2,
					}}
				>
					View Health
					<ChevronRight size={14} />
				</button>
			</div>

			{!briefing.hasHealthData ? (
				<button
					type="button"
					onClick={() => navigate(ROUTES.health)}
					style={{
						width: '100%',
						padding: '16px',
						borderRadius: 18,
						border: `1px dashed ${C.border}`,
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
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
								No health records yet
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>
								Open Health to add your first report
							</div>
						</div>
						<ChevronRight size={16} color={C.textMuted} />
					</div>
				</button>
			) : (
				<button
					type="button"
					onClick={() => navigate(ROUTES.health)}
					style={{
						width: '100%',
						padding: '16px',
						borderRadius: 18,
						border: `1px solid ${C.border}`,
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
							<Activity size={20} color={C.teal} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
								{summaryParts.slice(0, 2).join(' · ') ||
									'Health data available'}
							</div>
							{summaryParts[2] ? (
								<div
									style={{
										fontSize: 12,
										color: C.textMuted,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{summaryParts[2]}
								</div>
							) : null}
						</div>
						<ChevronRight size={16} color={C.textMuted} />
					</div>
				</button>
			)}
		</section>
	)
}
