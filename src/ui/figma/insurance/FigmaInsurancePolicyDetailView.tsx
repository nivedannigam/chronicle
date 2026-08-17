import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, MessageCircle } from 'lucide-react'
import { insuranceAskPath } from '@/constants/routes'
import type { PolicyDetailViewModel } from '@/features/insurance/services/insurance-policies.mapper'
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

function BulletList({ items }: { items: string[] }) {
	if (items.length === 0) {
		return (
			<ListCard>
				<p style={{ color: FC.dim, fontSize: 13.5, margin: 0 }}>
					Nothing recorded yet.
				</p>
			</ListCard>
		)
	}

	return (
		<div style={{ display: 'grid', gap: 8 }}>
			{items.map((item) => (
				<ListCard key={item}>
					<p
						style={{ color: FC.fg, fontSize: 14, margin: 0, lineHeight: 1.45 }}
					>
						{item}
					</p>
				</ListCard>
			))}
		</div>
	)
}

export function FigmaInsurancePolicyDetailView({
	detail,
	onBack,
}: {
	detail: PolicyDetailViewModel
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
				Policies
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
				<div
					style={{
						display: 'flex',
						gap: 16,
						marginBottom: 18,
					}}
				>
					<div
						style={{
							width: 88,
							height: 112,
							borderRadius: 16,
							background: `linear-gradient(145deg, ${detail.categoryColor}18 0%, ${FC.surface} 70%)`,
							border: `1px solid ${detail.categoryColor}30`,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<span style={{ fontSize: 28, marginBottom: 6 }}>
							{detail.categoryEmoji}
						</span>
						<FileText
							size={20}
							color={detail.categoryColor}
							strokeWidth={1.6}
							style={{ opacity: 0.75 }}
						/>
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<p
							style={{
								color: detail.statusColor,
								fontSize: 13,
								fontWeight: 700,
								margin: '0 0 6px',
							}}
						>
							{detail.status}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 24,
								fontWeight: 700,
								margin: '0 0 6px',
								letterSpacing: -0.5,
								lineHeight: 1.2,
							}}
						>
							{detail.name}
						</p>
						<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
							{detail.insurer} · {detail.policyNumberMasked}
						</p>
					</div>
				</div>

				<p
					style={{
						color: FC.fg,
						fontSize: 34,
						fontWeight: 700,
						margin: '0 0 6px',
						letterSpacing: -0.9,
					}}
				>
					{detail.coverageLabel}
				</p>

				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: '4px 14px',
						marginBottom: 14,
					}}
				>
					{detail.renewalLabel ? (
						<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
							{detail.renewalLabel}
						</p>
					) : null}
					{detail.premiumLabel ? (
						<p style={{ color: FC.dim, fontSize: 14, margin: 0 }}>
							{detail.premiumLabel}
						</p>
					) : null}
				</div>

				{detail.coveredMembers.length > 0 ? (
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 6,
							marginBottom: 14,
						}}
					>
						{detail.coveredMembers.map((member) => (
							<span
								key={member}
								style={{
									background: `${FC.blue}12`,
									border: `1px solid ${FC.blue}25`,
									borderRadius: 100,
									padding: '4px 11px',
									color: FC.blue,
									fontSize: 12,
									fontWeight: 600,
								}}
							>
								{member}
							</span>
						))}
					</div>
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

			{detail.coverages.length > 0 ? (
				<SectionBlock label="Coverage">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.coverages.map((item) => (
							<ListCard key={item.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
										marginBottom: item.detail ? 4 : 0,
									}}
								>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 600,
											margin: 0,
										}}
									>
										{item.name}
									</p>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 700,
											margin: 0,
											whiteSpace: 'nowrap',
										}}
									>
										{item.amount}
									</p>
								</div>
								{item.detail ? (
									<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
										{item.detail}
									</p>
								) : null}
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.benefits.length > 0 ? (
				<SectionBlock label="Benefits">
					<BulletList items={detail.benefits} />
				</SectionBlock>
			) : null}

			{detail.exclusions.length > 0 ? (
				<SectionBlock label="Exclusions">
					<BulletList items={detail.exclusions} />
				</SectionBlock>
			) : null}

			{detail.premiumHistory.length > 0 ? (
				<SectionBlock label="Premium history">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.premiumHistory.map((item) => (
							<ListCard key={item.id}>
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
											{item.label}
										</p>
										{item.dateLabel ? (
											<p
												style={{
													color: FC.dim,
													fontSize: 12.5,
													margin: 0,
												}}
											>
												{item.dateLabel}
											</p>
										) : null}
									</div>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 700,
											margin: 0,
										}}
									>
										{item.amount}
									</p>
								</div>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.renewals.length > 0 ? (
				<SectionBlock label="Renewals">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.renewals.map((item) => (
							<ListCard key={item.id}>
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
											{item.dateLabel}
										</p>
										<p
											style={{
												color: FC.dim,
												fontSize: 12.5,
												margin: 0,
											}}
										>
											{item.statusLabel}
										</p>
									</div>
									{item.amountLabel ? (
										<p
											style={{
												color: FC.fg,
												fontSize: 15,
												fontWeight: 700,
												margin: 0,
											}}
										>
											{item.amountLabel}
										</p>
									) : null}
								</div>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.claims.length > 0 ? (
				<SectionBlock label="Claims">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.claims.map((claim) => (
							<ListCard key={claim.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
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
										{claim.title}
									</p>
									<span
										style={{
											color: FC.teal,
											fontSize: 12,
											fontWeight: 700,
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
											margin: '0 0 2px',
										}}
									>
										{claim.amount}
									</p>
								) : null}
								{claim.dateLabel ? (
									<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
										{claim.dateLabel}
									</p>
								) : null}
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.timeline.length > 0 ? (
				<SectionBlock label="Timeline">
					<div style={{ display: 'grid', gap: 10 }}>
						{detail.timeline.map((event) => (
							<ListCard key={event.id}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										gap: 12,
									}}
								>
									<p
										style={{
											color: FC.fg,
											fontSize: 14,
											fontWeight: 600,
											margin: 0,
										}}
									>
										{event.title}
									</p>
									<p
										style={{
											color: FC.dim,
											fontSize: 12.5,
											margin: 0,
											whiteSpace: 'nowrap',
										}}
									>
										{event.dateLabel}
									</p>
								</div>
							</ListCard>
						))}
					</div>
				</SectionBlock>
			) : null}

			{detail.documents.length > 0 ? (
				<SectionBlock label="Documents">
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

			<button
				type="button"
				onClick={() =>
					navigate(
						insuranceAskPath({
							q: detail.askPrompt,
							policyId: detail.id,
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
					marginTop: 8,
				}}
			>
				<MessageCircle size={18} />
				Ask about this policy
			</button>
		</div>
	)
}
