import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { insuranceCoverageDetailPath } from '@/constants/routes'
import type { InsuranceHomeViewModel } from '@/features/insurance/services/insurance-home.mapper'
import { protectionStatusColor } from '@/features/insurance/services/insurance-consumer-status.service'
import {
	FigmaHealthRing,
	FigmaHealthSectionLabel,
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
		<section style={{ marginBottom: 28 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			{children}
		</section>
	)
}

function activityDotColor(
	tone: InsuranceHomeViewModel['recentActivity'][number]['tone'],
) {
	switch (tone) {
		case 'positive':
			return FC.green
		case 'attention':
			return FC.amber
		default:
			return FC.blue
	}
}

export function FigmaInsuranceHomeView({
	home,
}: {
	home: InsuranceHomeViewModel
}) {
	const navigate = useNavigate()
	const { protection } = home
	const ringColor = protectionStatusColor(protection.protectionStatus)

	return (
		<div style={{ paddingBottom: 24 }}>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 28,
					padding: '24px 20px 22px',
					marginBottom: 28,
					background: `linear-gradient(155deg, ${ringColor}12 0%, ${FC.surface} 55%)`,
					border: `1px solid ${ringColor}28`,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 18,
						marginBottom: 16,
					}}
				>
					<FigmaHealthRing score={protection.score} color={ringColor} />
					<div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
						<p
							style={{
								color: ringColor,
								fontSize: 13,
								fontWeight: 700,
								margin: '0 0 4px',
								letterSpacing: 0.2,
							}}
						>
							{protection.protectionStatus}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 22,
								fontWeight: 700,
								letterSpacing: -0.5,
								margin: '0 0 8px',
								lineHeight: 1.15,
							}}
						>
							{home.greeting}
						</p>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								lineHeight: 1.5,
								margin: 0,
							}}
						>
							{protection.narrative}
						</p>
					</div>
				</div>

				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						background: `${ringColor}14`,
						border: `1px solid ${ringColor}30`,
						borderRadius: 100,
						padding: '5px 11px',
						color: ringColor,
						fontSize: 12,
						fontWeight: 600,
					}}
				>
					Am I protected? — {protection.protectionStatus}
				</div>
			</div>

			<SectionBlock label="Protection summary">
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
						gap: 10,
					}}
				>
					{home.summary.map((item) => (
						<div
							key={item.id}
							style={{
								...figmaCardStyle,
								borderRadius: 16,
								padding: '14px 14px 12px',
							}}
						>
							<p
								style={{
									color: FC.dim,
									fontSize: 11.5,
									fontWeight: 600,
									margin: '0 0 6px',
									textTransform: 'uppercase',
									letterSpacing: 0.5,
								}}
							>
								{item.label}
							</p>
							<p
								style={{
									color: item.tone === 'attention' ? FC.amber : FC.fg,
									fontSize: 22,
									fontWeight: 700,
									margin: 0,
									letterSpacing: -0.5,
								}}
							>
								{item.value}
							</p>
						</div>
					))}
				</div>
			</SectionBlock>

			<SectionBlock label="Coverage overview">
				<div style={{ display: 'grid', gap: 10 }}>
					{home.coverageCards.map((card) => (
						<button
							key={card.id}
							type="button"
							onClick={() => navigate(insuranceCoverageDetailPath(card.id))}
							style={{
								...figmaCardStyle,
								borderRadius: 18,
								padding: '16px 16px 14px',
								display: 'flex',
								alignItems: 'center',
								gap: 14,
								width: '100%',
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<div
								style={{
									width: 44,
									height: 44,
									borderRadius: 14,
									background: `${card.statusColor}14`,
									border: `1px solid ${card.statusColor}28`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 22,
									flexShrink: 0,
								}}
							>
								{card.emoji}
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: 8,
										marginBottom: 4,
									}}
								>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 700,
											margin: 0,
										}}
									>
										{card.name}
									</p>
									<span
										style={{
											color: card.statusColor,
											fontSize: 12,
											fontWeight: 700,
											whiteSpace: 'nowrap',
										}}
									>
										{card.statusLabel}
									</span>
								</div>
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										margin: '0 0 2px',
									}}
								>
									{card.coverageAmount !== '—'
										? card.coverageAmount
										: 'No cover on record'}
								</p>
								{card.expiryLabel ? (
									<p
										style={{
											color: FC.dim,
											fontSize: 12,
											margin: 0,
										}}
									>
										{card.expiryLabel}
									</p>
								) : null}
							</div>
							<ChevronRight size={15} color={FC.dim} />
						</button>
					))}
				</div>
			</SectionBlock>

			{home.recentActivity.length > 0 ? (
				<SectionBlock label="Recent activity">
					<div style={{ position: 'relative', paddingLeft: 18 }}>
						<div
							style={{
								position: 'absolute',
								left: 4,
								top: 8,
								bottom: 8,
								width: 1,
								background: FC.line,
							}}
						/>
						{home.recentActivity.map((item, index) => (
							<div
								key={item.id}
								style={{
									position: 'relative',
									marginBottom: index < home.recentActivity.length - 1 ? 16 : 0,
								}}
							>
								<div
									style={{
										position: 'absolute',
										left: -18,
										top: 6,
										width: 8,
										height: 8,
										borderRadius: 4,
										background: activityDotColor(item.tone),
									}}
								/>
								<p
									style={{
										color: FC.dim,
										fontSize: 12,
										fontWeight: 600,
										margin: '0 0 4px',
									}}
								>
									{item.dateLabel}
								</p>
								<p
									style={{
										color: FC.fg,
										fontSize: 15,
										fontWeight: 600,
										margin: 0,
										lineHeight: 1.35,
									}}
								>
									{item.title}
								</p>
							</div>
						))}
					</div>
				</SectionBlock>
			) : null}

			{home.recommendations.length > 0 ? (
				<SectionBlock label="Recommendations">
					<div style={{ display: 'grid', gap: 8 }}>
						{home.recommendations.map((item) => (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 16,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 10,
								}}
							>
								<span
									style={{
										color: item.priority === 'high' ? FC.amber : FC.blue,
										fontSize: 14,
										fontWeight: 700,
										width: 18,
									}}
								>
									→
								</span>
								<span
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										lineHeight: 1.4,
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
