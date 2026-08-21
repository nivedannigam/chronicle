import type { ReactNode } from 'react'
import type { FinanceDocumentTypeCount } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { C } from '@/constants/colors'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FinanceSectionLabel({ children }: { children: ReactNode }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<FigmaHealthSectionLabel>{children}</FigmaHealthSectionLabel>
		</div>
	)
}

export function FinanceSnapshotPanel({
	netWorth,
	assets,
	liabilities,
	confidenceLabel,
	coverageLine,
}: {
	netWorth: string | null
	assets: string | null
	liabilities: string | null
	confidenceLabel: string | null
	coverageLine: string | null
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '22px 20px',
				marginBottom: 22,
				background: `linear-gradient(145deg, ${C.greenAlt}18, ${C.greenAlt}08)`,
				border: `1px solid ${C.greenAlt}28`,
			}}
		>
			{netWorth ? (
				<>
					<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 6px' }}>
						Net Worth
					</p>
					<p
						style={{
							color: FC.fg,
							fontSize: 28,
							fontWeight: 700,
							margin: '0 0 8px',
							letterSpacing: -0.5,
						}}
					>
						{netWorth}
					</p>
				</>
			) : null}
			{confidenceLabel ? (
				<p
					style={{
						color: FC.dim,
						fontSize: 13,
						margin: '0 0 14px',
						lineHeight: 1.5,
					}}
				>
					{confidenceLabel}
				</p>
			) : null}
			{assets || liabilities ? (
				<div style={{ display: 'flex', gap: 24 }}>
					{assets ? (
						<div>
							<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
								Assets
							</p>
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 600,
									margin: 0,
								}}
							>
								{assets}
							</p>
						</div>
					) : null}
					{liabilities ? (
						<div>
							<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
								Liabilities
							</p>
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 600,
									margin: 0,
								}}
							>
								{liabilities}
							</p>
						</div>
					) : null}
				</div>
			) : null}
			{coverageLine ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '14px 0 0' }}>
					{coverageLine}
				</p>
			) : null}
		</div>
	)
}

export function FinanceStatusHero({
	headline,
	subline,
}: {
	headline: string
	subline: string | null
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '22px 20px',
				marginBottom: 22,
				background: `linear-gradient(145deg, ${C.greenAlt}18, ${C.greenAlt}08)`,
				border: `1px solid ${C.greenAlt}28`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 18,
					fontWeight: 700,
					margin: '0 0 6px',
					letterSpacing: -0.3,
					lineHeight: 1.35,
				}}
			>
				{headline}
			</p>
			{subline ? (
				<p style={{ color: FC.dim, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
					{subline}
				</p>
			) : null}
		</div>
	)
}

export function FinanceEntitySummaryRow({
	entity,
}: {
	entity: import('@/features/finance-knowledge/types/finance-knowledge.types').FinanceEntitySummary
}) {
	const subtitle = [
		entity.institutionName,
		entity.maskedIdentifier,
		entity.latestStatementDate
			? `Latest statement ${new Date(
					entity.latestStatementDate,
				).toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric',
				})}`
			: null,
	]
		.filter(Boolean)
		.join(' · ')

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{entity.displayName}
			</p>
			{subtitle ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{subtitle}</p>
			) : null}
		</div>
	)
}

export function FinanceEntityCountRow({
	label,
	count,
}: {
	label: string
	count: number
}) {
	if (count === 0) return null

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
			}}
		>
			<span style={{ color: FC.fg, fontSize: 14, fontWeight: 600 }}>
				{label}
			</span>
			<span style={{ color: FC.mid, fontSize: 13, fontWeight: 600 }}>
				{count}
			</span>
		</div>
	)
}

export function FinanceDocumentTypeRow({
	item,
}: {
	item: FinanceDocumentTypeCount
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
			}}
		>
			<span style={{ color: FC.fg, fontSize: 14, fontWeight: 600 }}>
				{item.label}
			</span>
			<span style={{ color: FC.mid, fontSize: 13, fontWeight: 600 }}>
				{item.count}
			</span>
		</div>
	)
}

export function FinanceEmptyState({
	emoji,
	title,
	body,
	primaryLabel,
	onPrimary,
	secondaryLabel,
}: {
	emoji: string
	title: string
	body: string
	primaryLabel: string
	onPrimary: () => void
	secondaryLabel?: string
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '32px 24px',
				textAlign: 'center',
			}}
		>
			<div style={{ fontSize: 36, marginBottom: 14 }}>{emoji}</div>
			<p
				style={{
					color: FC.fg,
					fontSize: 18,
					fontWeight: 700,
					margin: '0 0 8px',
				}}
			>
				{title}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 20px',
				}}
			>
				{body}
			</p>
			<button
				type="button"
				onClick={onPrimary}
				style={{
					background: C.greenAlt,
					color: '#fff',
					border: 'none',
					borderRadius: 18,
					padding: '12px 18px',
					fontSize: 14,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				{primaryLabel}
			</button>
			{secondaryLabel ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '14px 0 0' }}>
					{secondaryLabel}
				</p>
			) : null}
		</div>
	)
}

export function FinanceAskBlock({
	suggestions,
	onSelect,
}: {
	suggestions: string[]
	onSelect: (question: string) => void
}) {
	return (
		<div style={{ marginTop: 8, marginBottom: 18 }}>
			<FinanceSectionLabel>Ask Chronicle</FinanceSectionLabel>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{suggestions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelect(question)}
						style={{
							...figmaCardStyle,
							borderRadius: 16,
							padding: '14px 16px',
							color: FC.fg,
							fontSize: 13,
							fontWeight: 500,
							textAlign: 'left',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	)
}

export function FinanceLibraryLink({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: 'none',
				border: 'none',
				padding: 0,
				color: C.greenAlt,
				fontSize: 13,
				fontWeight: 600,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			Browse all financial documents in Library →
		</button>
	)
}

export function FinanceHistoryLink({
	label,
	onClick,
}: {
	label: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: 'none',
				border: 'none',
				padding: 0,
				color: C.greenAlt,
				fontSize: 13,
				fontWeight: 600,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			{label}
		</button>
	)
}

export function FinanceHistoryEventRow({
	title,
	entityName,
	dateLabel,
	changeLabel,
	onClick,
}: {
	title: string
	entityName: string | null
	dateLabel: string
	changeLabel?: string | null
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				textAlign: 'left',
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{title}
			</p>
			{entityName ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
					{entityName}
				</p>
			) : null}
			{changeLabel ? (
				<p style={{ color: FC.mid, fontSize: 12, margin: '0 0 4px' }}>
					{changeLabel}
				</p>
			) : null}
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{dateLabel}</p>
		</button>
	)
}

export function FinanceRecentActivityRow({
	title,
	entityName,
	dateLabel,
	onClick,
}: {
	title: string
	entityName: string | null
	dateLabel: string
	onClick?: () => void
}) {
	const content = (
		<>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{title}
			</p>
			{entityName ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>
					{entityName}
				</p>
			) : null}
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{dateLabel}</p>
		</>
	)

	if (!onClick) {
		return (
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 18,
					padding: '14px 16px',
					marginBottom: 10,
				}}
			>
				{content}
			</div>
		)
	}

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				textAlign: 'left',
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			{content}
		</button>
	)
}
