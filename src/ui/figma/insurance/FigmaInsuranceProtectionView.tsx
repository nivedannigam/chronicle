import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Shield } from 'lucide-react'
import { insuranceCoverageDetailPath } from '@/constants/routes'
import type { ProtectionOverviewViewModel } from '@/features/insurance/services/insurance-protection.mapper'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
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

export function FigmaInsuranceProtectionView({
	protection,
}: {
	protection: ProtectionOverviewViewModel
}) {
	const navigate = useNavigate()

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
				{protection.headline}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 28px',
				}}
			>
				{protection.subtitle}
			</p>

			<SectionBlock label="Life areas">
				<div style={{ display: 'grid', gap: 14 }}>
					{protection.areas.map((area) => (
						<button
							key={area.id}
							type="button"
							onClick={() => navigate(insuranceCoverageDetailPath(area.id))}
							style={{
								...figmaCardStyle,
								borderRadius: 24,
								padding: '20px 18px 18px',
								width: '100%',
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
								border: `1px solid ${area.statusColor}22`,
								background: `linear-gradient(155deg, ${area.statusColor}10 0%, ${FC.surface} 60%)`,
								transition: 'transform 0.18s ease, box-shadow 0.18s ease',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 14,
									marginBottom: 14,
								}}
							>
								<div
									style={{
										width: 52,
										height: 52,
										borderRadius: 16,
										background: `${area.statusColor}16`,
										border: `1px solid ${area.statusColor}30`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 26,
										flexShrink: 0,
									}}
								>
									{area.emoji}
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
												fontSize: 18,
												fontWeight: 700,
												margin: 0,
												letterSpacing: -0.3,
											}}
										>
											{area.shortName}
										</p>
										<span
											style={{
												color: area.statusColor,
												fontSize: 12,
												fontWeight: 700,
												whiteSpace: 'nowrap',
											}}
										>
											{area.status}
										</span>
									</div>
									<p
										style={{
											color: FC.fg,
											fontSize: 24,
											fontWeight: 700,
											margin: '0 0 2px',
											letterSpacing: -0.6,
										}}
									>
										{area.coverageLabel}
									</p>
									{area.coverageSubLabel ? (
										<p
											style={{
												color: FC.dim,
												fontSize: 12,
												margin: '0 0 6px',
											}}
										>
											{area.coverageSubLabel}
										</p>
									) : null}
								</div>
								<ChevronRight size={18} color={FC.dim} />
							</div>

							{area.coveredMembers.length > 0 ? (
								<div style={{ marginBottom: 10 }}>
									<p
										style={{
											color: FC.dim,
											fontSize: 11,
											fontWeight: 600,
											margin: '0 0 6px',
											textTransform: 'uppercase',
											letterSpacing: 0.5,
										}}
									>
										Covers
									</p>
									<div
										style={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: 6,
										}}
									>
										{area.coveredMembers.slice(0, 4).map((member) => (
											<span
												key={member}
												style={{
													background: FC.ghost,
													border: `1px solid ${FC.line}`,
													borderRadius: 100,
													padding: '4px 10px',
													color: FC.mid,
													fontSize: 12,
													fontWeight: 600,
												}}
											>
												{member}
											</span>
										))}
									</div>
								</div>
							) : null}

							{area.assetLabels.length > 0 ? (
								<div style={{ marginBottom: 10 }}>
									<p
										style={{
											color: FC.dim,
											fontSize: 11,
											fontWeight: 600,
											margin: '0 0 6px',
											textTransform: 'uppercase',
											letterSpacing: 0.5,
										}}
									>
										{area.id === 'motor' ? 'Vehicles' : 'Policies'}
									</p>
									<div style={{ display: 'grid', gap: 4 }}>
										{area.assetLabels.slice(0, 3).map((label) => (
											<p
												key={label}
												style={{
													color: FC.fg,
													fontSize: 13,
													fontWeight: 600,
													margin: 0,
												}}
											>
												{label}
											</p>
										))}
									</div>
								</div>
							) : null}

							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 8,
									alignItems: 'center',
									marginBottom: 12,
								}}
							>
								{area.insurerLabel ? (
									<span
										style={{
											color: FC.mid,
											fontSize: 12,
											fontWeight: 600,
										}}
									>
										{area.insurerLabel}
									</span>
								) : null}
								{area.expiryLabel ? (
									<span
										style={{
											color: FC.dim,
											fontSize: 12,
											fontWeight: 500,
										}}
									>
										{area.expiryLabel}
									</span>
								) : null}
								{area.badge ? (
									<span
										style={{
											background: `${area.statusColor}14`,
											border: `1px solid ${area.statusColor}30`,
											borderRadius: 100,
											padding: '3px 9px',
											color: area.statusColor,
											fontSize: 11,
											fontWeight: 700,
										}}
									>
										{area.badge}
									</span>
								) : null}
							</div>

							<p
								style={{
									color: FC.mid,
									fontSize: 13.5,
									lineHeight: 1.5,
									margin: 0,
								}}
							>
								{area.summary}
							</p>
						</button>
					))}
				</div>
			</SectionBlock>

			{protection.recommendations.length > 0 ? (
				<SectionBlock label="Recommendations">
					<div style={{ display: 'grid', gap: 8 }}>
						{protection.recommendations.map((item) => (
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
								<Shield
									size={15}
									color={item.priority === 'high' ? FC.amber : FC.blue}
								/>
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
