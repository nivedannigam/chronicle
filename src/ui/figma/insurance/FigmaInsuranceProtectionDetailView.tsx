import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { insuranceAskPath } from '@/constants/routes'
import type { ProtectionDetailViewModel } from '@/features/insurance/services/insurance-protection.mapper'
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

export function FigmaInsuranceProtectionDetailView({
	detail,
	onBack,
}: {
	detail: ProtectionDetailViewModel
	onBack: () => void
}) {
	const navigate = useNavigate()
	const { area } = detail

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
				Protection
			</button>

			<div
				style={{
					...figmaCardStyle,
					borderRadius: 28,
					padding: '24px 20px',
					marginBottom: 28,
					background: `linear-gradient(155deg, ${area.statusColor}12 0%, ${FC.surface} 55%)`,
					border: `1px solid ${area.statusColor}28`,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						marginBottom: 14,
					}}
				>
					<div
						style={{
							width: 56,
							height: 56,
							borderRadius: 18,
							background: `${area.statusColor}16`,
							border: `1px solid ${area.statusColor}30`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 28,
						}}
					>
						{area.emoji}
					</div>
					<div>
						<p
							style={{
								color: area.statusColor,
								fontSize: 13,
								fontWeight: 700,
								margin: '0 0 4px',
							}}
						>
							{area.status}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 26,
								fontWeight: 700,
								margin: 0,
								letterSpacing: -0.6,
							}}
						>
							{area.shortName}
						</p>
					</div>
				</div>
				<p
					style={{
						color: FC.fg,
						fontSize: 30,
						fontWeight: 700,
						margin: '0 0 4px',
						letterSpacing: -0.8,
					}}
				>
					{area.coverageLabel}
				</p>
				{area.coverageSubLabel ? (
					<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 12px' }}>
						{area.coverageSubLabel}
					</p>
				) : null}
				<p
					style={{
						color: FC.mid,
						fontSize: 14,
						lineHeight: 1.55,
						margin: 0,
					}}
				>
					{detail.coverageSummary}
				</p>
			</div>

			{detail.policies.length > 0 ? (
				<SectionBlock label="Policies">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.policies.map((policy) => (
							<ListCard key={policy.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
										marginBottom: 6,
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
										{policy.name}
									</p>
									<span
										style={{
											color:
												policy.statusLabel === 'Renewal due'
													? FC.amber
													: FC.green,
											fontSize: 12,
											fontWeight: 700,
											whiteSpace: 'nowrap',
										}}
									>
										{policy.statusLabel}
									</span>
								</div>
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										margin: '0 0 4px',
									}}
								>
									{policy.insurer} · {policy.coverageAmount}
								</p>
								{policy.renewalLabel ? (
									<p
										style={{
											color: FC.dim,
											fontSize: 12,
											margin: 0,
										}}
									>
										{policy.renewalLabel}
									</p>
								) : null}
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.benefits.length > 0 ? (
				<SectionBlock label="Benefits">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.benefits.slice(0, 8).map((benefit) => (
							<ListCard key={benefit}>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										margin: 0,
										lineHeight: 1.45,
									}}
								>
									{benefit}
								</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.exclusions.length > 0 ? (
				<SectionBlock label="Exclusions">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.exclusions.slice(0, 6).map((exclusion) => (
							<ListCard key={exclusion}>
								<p
									style={{
										color: FC.mid,
										fontSize: 14,
										margin: 0,
										lineHeight: 1.45,
									}}
								>
									{exclusion}
								</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.timeline.length > 0 ? (
				<SectionBlock label="Timeline">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.timeline.map((item) => (
							<ListCard key={item.id}>
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
										fontSize: 14,
										fontWeight: 600,
										margin: 0,
									}}
								>
									{item.title}
								</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.claims.length > 0 ? (
				<SectionBlock label="Claims">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.claims.map((claim) => (
							<ListCard key={claim.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 10,
									}}
								>
									<p
										style={{
											color: FC.fg,
											fontSize: 14,
											fontWeight: 700,
											margin: 0,
										}}
									>
										{claim.title}
									</p>
									<span
										style={{
											color: FC.mid,
											fontSize: 12,
											fontWeight: 600,
										}}
									>
										{claim.status}
									</span>
								</div>
								{claim.amount ? (
									<p
										style={{
											color: FC.mid,
											fontSize: 13,
											margin: '4px 0 0',
										}}
									>
										{claim.amount}
									</p>
								) : null}
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.documents.length > 0 ? (
				<SectionBlock label="Documents">
					<div style={{ display: 'grid', gap: 8 }}>
						{detail.documents.map((doc) => (
							<ListCard key={doc.id}>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										margin: '0 0 2px',
									}}
								>
									{doc.title}
								</p>
								<p
									style={{
										color: FC.dim,
										fontSize: 12,
										margin: 0,
									}}
								>
									{doc.dateLabel}
								</p>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.recommendations.length > 0 ? (
				<SectionBlock label="Recommendations">
					<div style={{ display: 'grid', gap: 8 }}>
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

			<button
				type="button"
				onClick={() =>
					navigate(
						insuranceAskPath({
							q: detail.askPrompt,
							categoryId: area.id,
						}),
					)
				}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 8,
					width: '100%',
					background: FC.blue,
					border: 'none',
					borderRadius: 16,
					padding: '14px 18px',
					cursor: 'pointer',
					fontFamily: 'inherit',
					marginTop: 8,
				}}
			>
				<MessageCircle size={16} color="#fff" />
				<span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
					Ask about this protection
				</span>
			</button>
		</div>
	)
}
