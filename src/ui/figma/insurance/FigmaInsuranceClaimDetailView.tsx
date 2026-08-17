import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FileText, MessageCircle } from 'lucide-react'
import { insuranceAskPath, insurancePolicyDetailPath } from '@/constants/routes'
import type { ClaimDetailViewModel } from '@/features/insurance/services/insurance-claims.mapper'
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
		<section style={{ marginBottom: 26 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			{children}
		</section>
	)
}

function ListCard({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
			}}
		>
			{children}
		</div>
	)
}

function ClaimTimeline({ steps }: { steps: ClaimDetailViewModel['timeline'] }) {
	return (
		<div style={{ display: 'grid', gap: 0 }}>
			{steps.map((step, index) => {
				const isLast = index === steps.length - 1

				return (
					<div
						key={step.id}
						style={{
							display: 'flex',
							gap: 14,
							minHeight: isLast ? 'auto' : 56,
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								width: 18,
								flexShrink: 0,
							}}
						>
							<div
								style={{
									width: 12,
									height: 12,
									borderRadius: '50%',
									background: step.isComplete
										? step.isCurrent
											? FC.blue
											: FC.green
										: FC.line,
									border: `2px solid ${step.isCurrent ? FC.blue : 'transparent'}`,
									flexShrink: 0,
									marginTop: 4,
								}}
							/>
							{!isLast ? (
								<div
									style={{
										width: 2,
										flex: 1,
										background: step.isComplete ? `${FC.green}55` : FC.line,
										marginTop: 4,
										marginBottom: 4,
									}}
								/>
							) : null}
						</div>
						<div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
							<p
								style={{
									color: step.isCurrent
										? FC.fg
										: step.isComplete
											? FC.mid
											: FC.dim,
									fontSize: 15,
									fontWeight: step.isCurrent ? 700 : 600,
									margin: '0 0 2px',
								}}
							>
								{step.label}
							</p>
							{step.dateLabel ? (
								<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
									{step.dateLabel}
								</p>
							) : null}
						</div>
					</div>
				)
			})}
		</div>
	)
}

export function FigmaInsuranceClaimDetailView({
	detail,
	onBack,
}: {
	detail: ClaimDetailViewModel
	onBack: () => void
}) {
	const navigate = useNavigate()

	return (
		<div style={{ paddingBottom: 32 }}>
			<button
				type="button"
				onClick={onBack}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: '0 0 18px',
					cursor: 'pointer',
					fontFamily: 'inherit',
					color: FC.blue,
					fontSize: 13,
					fontWeight: 600,
				}}
			>
				<ArrowLeft size={16} />
				Claims
			</button>

			<div
				style={{
					...figmaCardStyle,
					borderRadius: 28,
					padding: '24px 20px',
					marginBottom: 28,
					background: `linear-gradient(155deg, ${detail.categoryColor}12 0%, ${FC.surface} 55%)`,
					border: `1px solid ${detail.categoryColor}28`,
				}}
			>
				<p
					style={{
						color: detail.statusColor,
						fontSize: 13,
						fontWeight: 700,
						margin: '0 0 8px',
					}}
				>
					{detail.status}
				</p>
				<p
					style={{
						color: FC.fg,
						fontSize: 26,
						fontWeight: 700,
						margin: '0 0 8px',
						letterSpacing: -0.6,
						lineHeight: 1.2,
					}}
				>
					{detail.title}
				</p>
				<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 16px' }}>
					{detail.policyName} · {detail.insurer}
				</p>

				{detail.claimedAmountLabel ? (
					<p
						style={{
							color: FC.fg,
							fontSize: 32,
							fontWeight: 700,
							margin: '0 0 4px',
							letterSpacing: -0.8,
						}}
					>
						{detail.claimedAmountLabel.replace(' Claimed', '')}
					</p>
				) : null}

				{detail.approvedAmountLabel ? (
					<p
						style={{
							color: FC.mid,
							fontSize: 15,
							fontWeight: 600,
							margin: '0 0 12px',
						}}
					>
						{detail.approvedAmountLabel}
					</p>
				) : null}

				<p
					style={{
						color: FC.mid,
						fontSize: 14.5,
						lineHeight: 1.55,
						margin: 0,
					}}
				>
					{detail.summary}
				</p>
			</div>

			{detail.aiSummary.length > 0 ? (
				<SectionBlock label="Summary">
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 20,
							padding: '18px 16px',
							background: `linear-gradient(145deg, ${FC.blue}08 0%, ${FC.surface} 60%)`,
							border: `1px solid ${FC.blue}20`,
						}}
					>
						{detail.aiSummary.map((line) => (
							<p
								key={line}
								style={{
									color: FC.fg,
									fontSize: 14.5,
									lineHeight: 1.55,
									margin: '0 0 10px',
								}}
							>
								{line}
							</p>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.timeline.length > 0 ? (
				<SectionBlock label="Timeline">
					<ListCard>
						<ClaimTimeline steps={detail.timeline} />
					</ListCard>
				</SectionBlock>
			) : null}

			{detail.documents.length > 0 ? (
				<SectionBlock label="Submitted documents">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.documents.map((document) => (
							<ListCard key={document.id}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 12,
									}}
								>
									<div
										style={{
											width: 40,
											height: 52,
											borderRadius: 8,
											background: `${detail.categoryColor}12`,
											border: `1px solid ${detail.categoryColor}25`,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
										}}
									>
										<FileText
											size={16}
											color={detail.categoryColor}
											strokeWidth={1.6}
										/>
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 600,
												margin: '0 0 2px',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{document.title}
										</p>
										<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
											{document.kindLabel}
											{document.dateLabel ? ` · ${document.dateLabel}` : ''}
										</p>
									</div>
								</div>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.payments.length > 0 ? (
				<SectionBlock label="Settlement">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.payments.map((payment) => (
							<ListCard key={payment.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
									}}
								>
									<div>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 600,
												margin: '0 0 2px',
											}}
										>
											{payment.label}
										</p>
										{payment.dateLabel ? (
											<p
												style={{
													color: FC.dim,
													fontSize: 12.5,
													margin: 0,
												}}
											>
												{payment.dateLabel}
											</p>
										) : null}
									</div>
									<p
										style={{
											color: FC.green,
											fontSize: 16,
											fontWeight: 700,
											margin: 0,
										}}
									>
										{payment.amount}
									</p>
								</div>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.notes.length > 0 ? (
				<SectionBlock label="Notes">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.notes.map((note) => (
							<ListCard key={note}>
								<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>{note}</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.recommendations.length > 0 ? (
				<SectionBlock label="Recommendations">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.recommendations.map((item) => (
							<ListCard key={item.id}>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										margin: 0,
										lineHeight: 1.45,
									}}
								>
									{item.title}
								</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			<SectionBlock label="Related policy">
				<button
					type="button"
					onClick={() => navigate(insurancePolicyDetailPath(detail.policyId))}
					style={{
						...figmaCardStyle,
						borderRadius: 18,
						padding: '14px 16px',
						width: '100%',
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div>
						<p
							style={{
								color: FC.fg,
								fontSize: 15,
								fontWeight: 700,
								margin: '0 0 2px',
							}}
						>
							{detail.policyName}
						</p>
						<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
							{detail.insurer}
						</p>
					</div>
					<ChevronRight size={18} color={FC.mid} />
				</button>
			</SectionBlock>

			<button
				type="button"
				onClick={() =>
					navigate(
						insuranceAskPath({
							q: detail.askPrompt,
							claimId: detail.id,
							policyId: detail.policyId,
						}),
					)
				}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 8,
					width: '100%',
					background: `${FC.blue}14`,
					border: `1px solid ${FC.blue}30`,
					borderRadius: 18,
					padding: '14px 18px',
					color: FC.blue,
					fontSize: 14.5,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<MessageCircle size={18} />
				Ask about this claim
			</button>
		</div>
	)
}
