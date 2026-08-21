import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type {
	DailyBrief,
	LifeFeedItem,
	LifeScore,
	LifeScoreDimension,
	OsQuickAction,
	UpcomingItem,
} from '@/features/os/types/os.types'
import {
	FC,
	figmaCardStyle,
	figmaListRowBorder,
} from '@/ui/figma/tokens/figma-v2-tokens'

export function OsSectionLabel({
	children,
	action,
	onAction,
}: {
	children: ReactNode
	action?: string
	onAction?: () => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: 12,
			}}
		>
			<span
				style={{
					color: 'rgba(255,255,255,0.42)',
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.1em',
					textTransform: 'uppercase',
				}}
			>
				{children}
			</span>
			{action && onAction ? (
				<button
					type="button"
					onClick={onAction}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 3,
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						padding: 0,
					}}
				>
					<span style={{ color: FC.dim, fontSize: 12 }}>{action}</span>
					<ChevronRight size={12} color={FC.dim} />
				</button>
			) : null}
		</div>
	)
}

export function LifeScoreHero({
	lifeScore,
	onDimensionClick,
}: {
	lifeScore: LifeScore
	onDimensionClick: (dimension: LifeScoreDimension) => void
}) {
	return (
		<div
			style={{
				background:
					'linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))',
				border: '1px solid rgba(255,255,255,0.08)',
				borderRadius: 28,
				padding: '24px 22px',
				boxShadow:
					'0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
			}}
		>
			<p
				style={{
					color: FC.dim,
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.1em',
					textTransform: 'uppercase',
					margin: '0 0 8px',
				}}
			>
				Life Summary
			</p>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'space-between',
					marginBottom: 20,
					gap: 16,
				}}
			>
				<div>
					<p
						style={{
							color: 'rgba(255,255,255,0.55)',
							fontSize: 14,
							margin: '0 0 4px',
							letterSpacing: -0.2,
						}}
					>
						{lifeScore.headline}
					</p>
					{lifeScore.overallScore != null ? (
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
							<span
								style={{
									color: FC.fg,
									fontSize: 56,
									fontWeight: 700,
									letterSpacing: -3,
									lineHeight: 1,
								}}
							>
								{lifeScore.overallScore}
							</span>
							<span
								style={{
									color: FC.green,
									fontSize: 15,
									fontWeight: 600,
									marginBottom: 8,
								}}
							>
								{lifeScore.overallLabel}
							</span>
						</div>
					) : (
						<p
							style={{
								color: FC.fg,
								fontSize: 22,
								fontWeight: 600,
								margin: 0,
								letterSpacing: -0.5,
							}}
						>
							{lifeScore.overallLabel}
						</p>
					)}
				</div>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(3, 1fr)',
					gap: 10,
				}}
			>
				{lifeScore.dimensions.map((dimension) => (
					<button
						key={dimension.id}
						type="button"
						onClick={() => onDimensionClick(dimension)}
						style={{
							background: 'rgba(255,255,255,0.03)',
							border: '1px solid rgba(255,255,255,0.06)',
							borderRadius: 18,
							padding: '14px 12px',
							cursor: 'pointer',
							textAlign: 'left',
							fontFamily: 'inherit',
							transition: 'transform 0.2s ease, border-color 0.2s ease',
						}}
					>
						<p
							style={{
								color: dimension.color,
								fontSize: 11,
								fontWeight: 600,
								margin: '0 0 6px',
								letterSpacing: -0.1,
							}}
						>
							{dimension.label}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 22,
								fontWeight: 700,
								margin: 0,
								letterSpacing: -1,
							}}
						>
							{dimension.displayValue}
						</p>
					</button>
				))}
			</div>
		</div>
	)
}

export function DailyBriefCard({
	brief,
	onAsk,
}: {
	brief: DailyBrief
	onAsk: () => void
}) {
	return (
		<div
			style={{
				background:
					'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(59,130,246,0.06))',
				border: '1px solid rgba(99,102,241,0.2)',
				borderRadius: 24,
				padding: '20px 22px',
				boxShadow:
					'0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
			}}
		>
			<p
				style={{
					color: FC.blue,
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					margin: '0 0 12px',
				}}
			>
				Daily Brief
			</p>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				{brief.paragraphs.map((paragraph) => (
					<p
						key={paragraph}
						style={{
							color: 'rgba(255,255,255,0.78)',
							fontSize: 15,
							lineHeight: 1.65,
							letterSpacing: -0.1,
							margin: 0,
						}}
					>
						{paragraph}
					</p>
				))}
			</div>
			<button
				type="button"
				onClick={onAsk}
				style={{
					marginTop: 14,
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					padding: 0,
				}}
			>
				<span style={{ color: FC.blue, fontSize: 13, fontWeight: 500 }}>
					Ask a follow-up
				</span>
				<ChevronRight size={13} color={FC.blue} />
			</button>
		</div>
	)
}

export function UpcomingList({
	items,
	onItemClick,
}: {
	items: UpcomingItem[]
	onItemClick: (path: string) => void
}) {
	if (items.length === 0) {
		return null
	}

	return (
		<div>
			<OsSectionLabel>Upcoming</OsSectionLabel>
			<div style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}>
				{items.map((item, index) => (
					<button
						key={item.id}
						type="button"
						onClick={() => onItemClick(item.path)}
						style={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							gap: 13,
							padding: '15px 18px',
							background: 'none',
							cursor: 'pointer',
							textAlign: 'left',
							fontFamily: 'inherit',
							...figmaListRowBorder(index === items.length - 1),
						}}
					>
						<span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>
						<div style={{ flex: 1, minWidth: 0 }}>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 500,
									margin: '0 0 2px',
									letterSpacing: -0.2,
								}}
							>
								{item.title}
							</p>
							<p
								style={{
									color: FC.dim,
									fontSize: 12,
									margin: 0,
								}}
							>
								{item.description}
							</p>
						</div>
						<ChevronRight size={14} color={FC.dim} />
					</button>
				))}
			</div>
		</div>
	)
}

export function LifeFeedList({
	items,
	onItemClick,
	onViewAll,
}: {
	items: LifeFeedItem[]
	onItemClick: (path: string) => void
	onViewAll?: () => void
}) {
	if (items.length === 0) {
		return null
	}

	return (
		<div>
			<OsSectionLabel action="Timeline" onAction={onViewAll}>
				Life Feed
			</OsSectionLabel>
			<div style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}>
				{items.slice(0, 5).map((item, index) => (
					<button
						key={item.id}
						type="button"
						onClick={() => onItemClick(item.path)}
						style={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							gap: 13,
							padding: '14px 18px',
							background: 'none',
							cursor: 'pointer',
							textAlign: 'left',
							fontFamily: 'inherit',
							...figmaListRowBorder(index >= Math.min(items.length, 5) - 1),
						}}
					>
						<span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
						<div style={{ flex: 1, minWidth: 0 }}>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 500,
									margin: '0 0 2px',
								}}
							>
								{item.title}
							</p>
							<p
								style={{
									color: FC.dim,
									fontSize: 12,
									margin: 0,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								}}
							>
								{item.subtitle}
							</p>
						</div>
						<span style={{ color: FC.dim, fontSize: 11, flexShrink: 0 }}>
							{item.relativeLabel}
						</span>
					</button>
				))}
			</div>
		</div>
	)
}

/** @deprecated Use LifeFeedList */
export const RecentActivityList = LifeFeedList

export function QuickActionsRow({
	actions,
	onAction,
}: {
	actions: OsQuickAction[]
	onAction: (path: string) => void
}) {
	return (
		<div>
			<OsSectionLabel>Quick Actions</OsSectionLabel>
			<div style={{ display: 'flex', gap: 10 }}>
				{actions.map((action) => (
					<button
						key={action.id}
						type="button"
						onClick={() => onAction(action.path)}
						style={{
							flex: 1,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							borderRadius: 20,
							padding: '16px 12px',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: 8,
							cursor: 'pointer',
							boxShadow:
								'0 2px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<span style={{ fontSize: 22 }}>{action.emoji}</span>
						<span
							style={{
								color: FC.fg,
								fontSize: 12.5,
								fontWeight: 600,
								lineHeight: 1.3,
							}}
						>
							{action.label}
						</span>
					</button>
				))}
			</div>
		</div>
	)
}

export function NotificationBellButton({
	count,
	onClick,
}: {
	count: number
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
			style={{
				width: 36,
				height: 36,
				borderRadius: 12,
				background: count > 0 ? `${FC.amber}12` : 'none',
				border: count > 0 ? `1px solid ${FC.amber}25` : 'none',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative',
				flexShrink: 0,
			}}
		>
			<span style={{ fontSize: 18 }}>🔔</span>
			{count > 0 ? (
				<span
					style={{
						position: 'absolute',
						top: 4,
						right: 4,
						minWidth: 16,
						height: 16,
						borderRadius: 8,
						background: FC.amber,
						color: '#000',
						fontSize: 10,
						fontWeight: 700,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '0 4px',
					}}
				>
					{count > 9 ? '9+' : count}
				</span>
			) : null}
		</button>
	)
}
