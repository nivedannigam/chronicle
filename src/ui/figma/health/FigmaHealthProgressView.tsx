import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, TrendingUp } from 'lucide-react'
import { ROUTES, healthAskPath } from '@/constants/routes'
import type { ProgressViewModel } from '@/features/progress/types/progress.types'
import {
	FigmaHealthSectionLabel,
	FigmaSparkline,
} from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function SectionBlock({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<section style={{ marginBottom: 32 }}>
			<div style={{ marginBottom: 14 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			{children}
		</section>
	)
}

function scoreColor(score: number | null): string {
	if (score === null) {
		return FC.mid
	}

	if (score >= 85) {
		return FC.green
	}

	if (score >= 70) {
		return FC.teal
	}

	return FC.amber
}

function trendColor(label: string): string {
	if (label === 'Improving') {
		return FC.green
	}

	if (label === 'Needs attention' || label === 'Monitor') {
		return FC.amber
	}

	return FC.mid
}

export function FigmaHealthProgressView({
	progress,
}: {
	progress: ProgressViewModel
}) {
	const navigate = useNavigate()
	const ringColor = scoreColor(progress.overall.score)

	return (
		<div style={{ paddingBottom: 28 }}>
			<p
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					letterSpacing: -0.8,
					margin: '0 0 6px',
					lineHeight: 1.15,
				}}
			>
				Your progress
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 28px',
				}}
			>
				How your health is changing over time
			</p>

			<SectionBlock label="Overall progress">
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 28,
						padding: '24px 22px',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'space-between',
							gap: 16,
						}}
					>
						<div>
							<p
								style={{
									color: FC.dim,
									fontSize: 11,
									fontWeight: 600,
									letterSpacing: '0.08em',
									textTransform: 'uppercase',
									margin: '0 0 8px',
								}}
							>
								Health score
							</p>
							<div
								style={{
									display: 'flex',
									alignItems: 'baseline',
									gap: 10,
								}}
							>
								<span
									style={{
										color: FC.fg,
										fontSize: 48,
										fontWeight: 700,
										letterSpacing: -2,
										lineHeight: 1,
									}}
								>
									{progress.overall.score ?? '—'}
								</span>
								{progress.overall.deltaLabel ? (
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											gap: 4,
											color: ringColor,
											fontSize: 13,
											fontWeight: 600,
										}}
									>
										<TrendingUp size={14} />
										{progress.overall.deltaLabel}
									</span>
								) : null}
							</div>
						</div>
						{progress.hasEnoughHistory ? (
							<div style={{ paddingTop: 8 }}>
								<FigmaSparkline
									data={progress.overall.sparkline}
									color={ringColor}
								/>
							</div>
						) : null}
					</div>
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.6,
							margin: '16px 0 0',
						}}
					>
						{progress.overall.summary}
					</p>
				</div>
			</SectionBlock>

			<SectionBlock label="Health domains">
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
						gap: 12,
					}}
				>
					{progress.domains.map((domain) => (
						<button
							key={domain.id}
							type="button"
							onClick={() =>
								domain.hasData
									? navigate(
											healthAskPath({
												q: `How is my ${domain.name.toLowerCase()}?`,
												categoryId: domain.categoryId,
											}),
										)
									: undefined
							}
							style={{
								...figmaCardStyle,
								borderRadius: 22,
								padding: '16px 14px',
								textAlign: 'left',
								cursor: domain.hasData ? 'pointer' : 'default',
								opacity: domain.hasData ? 1 : 0.55,
								border: `1px solid ${domain.hasData ? `${domain.color}22` : FC.line}`,
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									marginBottom: 10,
								}}
							>
								<span style={{ fontSize: 22 }}>{domain.emoji}</span>
								{domain.sparkline.length >= 2 ? (
									<FigmaSparkline
										data={domain.sparkline}
										color={domain.color}
									/>
								) : null}
							</div>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 700,
									margin: '0 0 4px',
									letterSpacing: -0.2,
								}}
							>
								{domain.name}
							</p>
							<p
								style={{
									color: domain.color,
									fontSize: 12,
									fontWeight: 600,
									margin: '0 0 2px',
								}}
							>
								{domain.statusLabel}
							</p>
							<p
								style={{
									color: trendColor(domain.trendLabel),
									fontSize: 11.5,
									fontWeight: 500,
									margin: '0 0 6px',
								}}
							>
								{domain.trendLabel}
							</p>
							{domain.lastUpdated ? (
								<p
									style={{
										color: FC.dim,
										fontSize: 10.5,
										margin: 0,
									}}
								>
									{domain.lastUpdated}
								</p>
							) : null}
						</button>
					))}
				</div>
			</SectionBlock>

			{progress.improvements.length > 0 ? (
				<SectionBlock label="Recent improvements">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{progress.improvements.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 18,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
								}}
							>
								<span
									style={{
										color: item.tone === 'positive' ? FC.green : FC.mid,
										fontSize: 16,
										lineHeight: 1,
									}}
								>
									{item.tone === 'positive' ? '↑' : '→'}
								</span>
								<span
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 500,
										lineHeight: 1.4,
									}}
								>
									{item.label}
								</span>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			{progress.watchItems.length > 0 ? (
				<SectionBlock label="Things to watch">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{progress.watchItems.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 18,
									padding: '14px 16px',
									borderLeft: `3px solid ${FC.amber}`,
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 500,
										margin: 0,
										lineHeight: 1.45,
									}}
								>
									{item.label}
								</p>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			{progress.milestones.length > 0 ? (
				<SectionBlock label="Health journey">
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '8px 0',
						}}
					>
						{progress.milestones.map((milestone, index) => (
							<button
								key={milestone.id}
								type="button"
								onClick={() => navigate(ROUTES.healthHistory)}
								style={{
									width: '100%',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '14px 18px',
									background: 'none',
									border: 'none',
									borderBottom:
										index < progress.milestones.length - 1
											? `1px solid ${FC.line}`
											: 'none',
									cursor: 'pointer',
									textAlign: 'left',
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p
										style={{
											color: FC.fg,
											fontSize: 14,
											fontWeight: 600,
											margin: '0 0 2px',
										}}
									>
										{milestone.title}
									</p>
									<p
										style={{
											color: FC.dim,
											fontSize: 12,
											margin: 0,
										}}
									>
										{milestone.displayDate}
									</p>
								</div>
								<ChevronRight size={16} color={FC.dim} />
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthHistory)}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							marginTop: 12,
							padding: 0,
							background: 'none',
							border: 'none',
							color: FC.teal,
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						View full history
						<ArrowRight size={14} />
					</button>
				</SectionBlock>
			) : null}

			{progress.achievements.length > 0 ? (
				<SectionBlock label="Achievements">
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 10,
						}}
					>
						{progress.achievements.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 999,
									padding: '10px 14px',
									display: 'inline-flex',
									alignItems: 'center',
									gap: 8,
								}}
							>
								<span style={{ fontSize: 16 }}>{item.emoji}</span>
								<span
									style={{
										color: FC.fg,
										fontSize: 13,
										fontWeight: 600,
									}}
								>
									{item.title}
								</span>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}
		</div>
	)
}
