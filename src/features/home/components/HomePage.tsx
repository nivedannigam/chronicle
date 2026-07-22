import { ChevronRight, Sparkles } from 'lucide-react'
import { C, pagePadding } from '@/constants/colors'
import {
	HOME_GREETING,
	intelligenceBrief,
	worldCards,
} from '@/features/home/constants/mock-data'
import { homeTimeline } from '@/features/home/constants/timeline'

export function HomePage() {
	return (
		<div style={{ padding: pagePadding.home, color: C.text }}>
			<div style={{ marginBottom: 22 }}>
				<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 5 }}>
					{HOME_GREETING.date}
				</div>
				<div
					style={{
						fontSize: 32,
						fontWeight: 700,
						letterSpacing: '-0.03em',
						lineHeight: 1.1,
					}}
				>
					{HOME_GREETING.line1}
					<br />
					{HOME_GREETING.line2}
				</div>
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid rgba(108,111,255,0.25)`,
					borderRadius: 16,
					padding: '12px 14px',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					marginBottom: 26,
					boxShadow: `0 0 28px rgba(108,111,255,0.12)`,
				}}
			>
				<Sparkles size={18} color={C.accent} />
				<span style={{ fontSize: 14, color: C.textMuted, flex: 1 }}>
					Ask Chronicle anything...
				</span>
			</div>

			<div style={{ marginBottom: 26 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 12,
					}}
				>
					Today&apos;s Intelligence
				</div>
				<div
					style={{
						background: C.card,
						borderRadius: 18,
						overflow: 'hidden',
						border: `1px solid ${C.border}`,
						padding: 16,
					}}
				>
					<div
						style={{
							fontSize: 15,
							fontWeight: 700,
							color: C.text,
							marginBottom: 14,
							letterSpacing: '-0.01em',
						}}
					>
						Today looks busy.
					</div>
					{intelligenceBrief.map((item, i) => (
						<div
							key={item.label}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 11,
								marginBottom: i < intelligenceBrief.length - 1 ? 12 : 0,
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: `${item.color}18`,
									border: `1px solid ${item.color}28`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								<item.Icon size={14} color={item.color} />
							</div>
							<span
								style={{
									fontSize: 13,
									color: C.textSec,
									flex: 1,
									lineHeight: 1.45,
								}}
							>
								{item.label}
							</span>
							<ChevronRight size={13} color={C.textMuted} />
						</div>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 26 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 12,
					}}
				>
					Your World
				</div>
				<div
					style={{
						display: 'flex',
						gap: 10,
						overflowX: 'auto',
						marginLeft: -18,
						paddingLeft: 18,
						marginRight: -18,
						paddingRight: 18,
						paddingBottom: 4,
						scrollbarWidth: 'none',
					}}
				>
					{worldCards.map((card) => (
						<div
							key={card.label}
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 20,
								padding: '14px 14px',
								minWidth: 120,
								flexShrink: 0,
							}}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: 12,
									background: `${card.color}18`,
									border: `1px solid ${card.color}22`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: 12,
								}}
							>
								<card.Icon size={17} color={card.color} />
							</div>
							<div
								style={{
									fontSize: 10,
									color: C.textMuted,
									marginBottom: 3,
									letterSpacing: '0.04em',
								}}
							>
								{card.label}
							</div>
							<div
								style={{
									fontSize: 16,
									fontWeight: 700,
									color: C.text,
									letterSpacing: '-0.02em',
									marginBottom: 2,
								}}
							>
								{card.title}
							</div>
							<div style={{ fontSize: 11, color: card.color }}>{card.sub}</div>
						</div>
					))}
				</div>
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Today&apos;s Timeline
			</div>
			<div style={{ position: 'relative', paddingLeft: 20 }}>
				<div
					style={{
						position: 'absolute',
						left: 7,
						top: 8,
						bottom: 0,
						width: 1,
						background: `linear-gradient(to bottom, ${C.accent}80, ${C.accent}00)`,
					}}
				/>
				{homeTimeline.map((item) => (
					<div
						key={`${item.time}-${item.event}`}
						style={{
							display: 'flex',
							gap: 14,
							marginBottom: 16,
							position: 'relative',
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: -16,
								top: 6,
								width: 7,
								height: 7,
								borderRadius: '50%',
								background: item.color,
								boxShadow: `0 0 7px ${item.color}`,
							}}
						/>
						<div>
							<div
								style={{
									fontSize: 11,
									color: C.textMuted,
									marginBottom: 2,
								}}
							>
								{item.time}
							</div>
							<div style={{ fontSize: 13, color: C.textSec }}>{item.event}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
