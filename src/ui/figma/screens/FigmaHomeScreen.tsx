import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Sparkles } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter'
import type { AttentionItem } from '@/features/command-center/types/command-center.types'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { OnboardingFlow, useOnboarding } from '@/features/onboarding'
import { memberFirstName, memberInitial } from '@/ui/figma/home/home-ui'
import { FigmaHomeLabel } from '@/ui/figma/home/home-ui'
import {
	FC,
	MEMBER_COLORS,
	figmaCardStyle,
} from '@/ui/figma/tokens/figma-v2-tokens'

function attentionForMember(
	items: AttentionItem[],
	memberId: string | null,
): AttentionItem[] {
	return items.filter(
		(item) => !item.memberId || !memberId || item.memberId === memberId,
	)
}

function attentionCountForMember(
	items: AttentionItem[],
	memberId: string,
): number {
	return items.filter((item) => !item.memberId || item.memberId === memberId)
		.length
}

function attentionColor(item: AttentionItem): string {
	switch (item.tone) {
		case 'warning':
			return FC.red
		case 'attention':
			return FC.amber
		default:
			return FC.blue
	}
}

function attentionIcon(item: AttentionItem): string {
	const title = item.title.toLowerCase()
	if (title.includes('credit') || title.includes('payment')) return '💳'
	if (title.includes('passport') || title.includes('visa')) return '🛂'
	if (item.module === 'health') return '❤️'
	if (item.module === 'documents') return '📄'
	if (item.module === 'family') return '👨‍👩‍👧'
	return '⚡'
}

function attentionCta(item: AttentionItem): string {
	if (item.title.toLowerCase().includes('credit')) return 'Pay'
	if (item.title.toLowerCase().includes('passport')) return 'Renew'
	if (item.module === 'health') return 'Review'
	if (item.module === 'documents') return 'View'
	return 'Open'
}

function moduleTagLabel(module: string): string {
	return module.charAt(0).toUpperCase() + module.slice(1)
}

function timeGreeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) return 'Good morning'
	if (hour < 17) return 'Good afternoon'
	return 'Good evening'
}

function parseScheduleTime(timestamp: string): number | null {
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) return null
	return date.getHours() * 60 + date.getMinutes()
}

function formatScheduleClock(timestamp: string): string {
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) return '—'
	return date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
	})
}

function StoriesAvatar({
	name,
	initial,
	color,
	selected,
	alertCount,
	onClick,
}: {
	name: string
	initial: string
	color: string
	selected: boolean
	alertCount: number
	onClick: () => void
}) {
	const ringSize = 52
	const pad = 3

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 7,
				background: 'none',
				border: 'none',
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			<div style={{ position: 'relative', width: ringSize, height: ringSize }}>
				<svg
					width={ringSize}
					height={ringSize}
					style={{
						position: 'absolute',
						inset: 0,
						transform: 'rotate(-90deg)',
						opacity: selected ? 1 : alertCount > 0 ? 0.55 : 0.15,
					}}
				>
					<circle
						cx={ringSize / 2}
						cy={ringSize / 2}
						r={ringSize / 2 - 2}
						fill="none"
						stroke={alertCount > 0 ? FC.amber : color}
						strokeWidth={selected ? 2.5 : 1.5}
						strokeDasharray={alertCount > 0 ? '4 3' : 'none'}
						strokeLinecap="round"
					/>
				</svg>
				<div
					style={{
						position: 'absolute',
						inset: pad + 2,
						borderRadius: '50%',
						overflow: 'hidden',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: `linear-gradient(135deg,${color}28,${color}14)`,
						boxShadow: selected ? `0 0 16px ${color}40` : 'none',
					}}
				>
					<span style={{ color, fontSize: 17, fontWeight: 700 }}>
						{initial}
					</span>
				</div>
			</div>
			<span
				style={{
					color: selected ? color : 'rgba(255,255,255,0.38)',
					fontSize: 11,
					fontWeight: selected ? 700 : 400,
					letterSpacing: selected ? -0.2 : 0,
				}}
			>
				{name}
			</span>
		</button>
	)
}

export function FigmaHomeScreen() {
	const briefing = useCommandCenter()
	const navigate = useNavigate()
	const { members, selectedMemberId, setSelectedMemberId } = useFamilyContext()
	const { isVisible, completeStep, dismiss } = useOnboarding()

	const showSkeleton =
		briefing.loading.family &&
		briefing.loading.health &&
		briefing.loading.documents &&
		!briefing.hasAnyData

	const selectedMember = useMemo(
		() => members.find((member) => member.id === selectedMemberId) ?? null,
		[members, selectedMemberId],
	)

	const selectedName =
		selectedMember?.displayName ?? memberFirstName(briefing.greetingName)

	const memberItems = useMemo(
		() => attentionForMember(briefing.attentionItems, selectedMemberId),
		[briefing.attentionItems, selectedMemberId],
	)

	const nowMins = (() => {
		const now = new Date()
		return now.getHours() * 60 + now.getMinutes()
	})()

	const todaySchedule = useMemo(() => {
		const today = new Date().toDateString()
		return briefing.timelinePreview
			.filter((event) => {
				const date = new Date(event.timestamp)
				return !Number.isNaN(date.getTime()) && date.toDateString() === today
			})
			.slice(0, 5)
			.map((event) => ({
				time: formatScheduleClock(event.timestamp),
				timeMins: parseScheduleTime(event.timestamp),
				label: event.familyMemberName
					? `${event.familyMemberName} — ${event.title}`
					: event.title,
				tag: moduleTagLabel(event.sourceModule),
			}))
	}, [briefing.timelinePreview])

	if (showSkeleton) {
		return <HomePageSkeleton />
	}

	const statusOk = memberItems.length === 0
	const greet = timeGreeting()
	const firstName = memberFirstName(briefing.greetingName)

	return (
		<>
			{isVisible ? (
				<OnboardingFlow onCompleteStep={completeStep} onDismiss={dismiss} />
			) : null}

			<div style={{ padding: '4px 26px 22px' }}>
				<p
					style={{ color: FC.dim, fontSize: 14, marginBottom: 5, marginTop: 0 }}
				>
					{briefing.dateLabel}
				</p>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
					}}
				>
					<div>
						<h1
							style={{
								color: FC.fg,
								fontSize: 38,
								fontWeight: 700,
								letterSpacing: -2,
								lineHeight: 1.05,
								marginBottom: 10,
								marginTop: 0,
							}}
						>
							{greet},
							<br />
							{firstName}.
						</h1>
						<div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
							<div
								style={{
									width: 7,
									height: 7,
									borderRadius: 4,
									flexShrink: 0,
									background: statusOk ? FC.green : FC.amber,
									boxShadow: statusOk
										? `0 0 8px ${FC.green}90`
										: `0 0 8px ${FC.amber}90`,
								}}
							/>
							<p
								style={{
									color: statusOk ? FC.green : FC.amber,
									fontSize: 15,
									fontWeight: 500,
									letterSpacing: -0.2,
									margin: 0,
								}}
							>
								{statusOk
									? 'Everything looks clear.'
									: `${memberItems.length} things need you.`}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.search)}
						aria-label="Search"
						style={{
							marginTop: 4,
							width: 38,
							height: 38,
							borderRadius: 13,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
						}}
					>
						<Search size={18} color={FC.dim} strokeWidth={1.8} />
					</button>
				</div>
			</div>

			<div style={{ padding: '0 20px 22px' }}>
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
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							marginBottom: 12,
						}}
					>
						<Sparkles size={13} color={FC.blue} />
						<span
							style={{
								color: FC.blue,
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
							}}
						>
							Chronicle AI
						</span>
					</div>
					<p
						style={{
							color: 'rgba(255,255,255,0.78)',
							fontSize: 15,
							lineHeight: 1.7,
							letterSpacing: -0.1,
							margin: 0,
						}}
					>
						{briefing.todaySummary}
					</p>
					<button
						type="button"
						onClick={() => navigate(ROUTES.ask)}
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
			</div>

			{members.length > 0 ? (
				<div style={{ padding: '0 20px 22px' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 14,
						}}
					>
						<FigmaHomeLabel>Family</FigmaHomeLabel>
						<button
							type="button"
							onClick={() => navigate(ROUTES.profile)}
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
							<span style={{ color: FC.dim, fontSize: 12 }}>Manage</span>
							<ChevronRight size={12} color={FC.dim} />
						</button>
					</div>
					<div style={{ display: 'flex', gap: 18 }}>
						{members.map((member, index) => {
							const color =
								MEMBER_COLORS[index % MEMBER_COLORS.length] ?? FC.blue
							return (
								<StoriesAvatar
									key={member.id}
									name={memberFirstName(member.displayName)}
									initial={memberInitial(member.displayName)}
									color={color}
									selected={member.id === selectedMemberId}
									alertCount={attentionCountForMember(
										briefing.attentionItems,
										member.id,
									)}
									onClick={() => setSelectedMemberId(member.id)}
								/>
							)
						})}
					</div>
				</div>
			) : null}

			{memberItems.length === 0 ? (
				<div style={{ padding: '0 20px 20px' }}>
					<div
						style={{
							background:
								'linear-gradient(135deg,rgba(16,185,129,0.09),rgba(16,185,129,0.04))',
							border: '1px solid rgba(16,185,129,0.18)',
							borderRadius: 22,
							padding: '18px 20px',
							display: 'flex',
							alignItems: 'center',
							gap: 14,
						}}
					>
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 14,
								flexShrink: 0,
								background: 'rgba(16,185,129,0.15)',
								border: '1px solid rgba(16,185,129,0.25)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<span style={{ fontSize: 20 }}>✓</span>
						</div>
						<div>
							<p
								style={{
									color: FC.green,
									fontSize: 14.5,
									fontWeight: 600,
									marginBottom: 3,
									marginTop: 0,
								}}
							>
								All clear for {selectedName}
							</p>
							<p
								style={{
									color: 'rgba(255,255,255,0.38)',
									fontSize: 12.5,
									lineHeight: 1.4,
									margin: 0,
								}}
							>
								No pending actions or upcoming deadlines.
							</p>
						</div>
					</div>
				</div>
			) : (
				<div style={{ padding: '0 20px 20px' }}>
					<div style={{ marginBottom: 10 }}>
						<FigmaHomeLabel>Needs Attention — {selectedName}</FigmaHomeLabel>
					</div>
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{memberItems.map((item, index) => {
							const color = attentionColor(item)
							return (
								<div
									key={item.id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 13,
										padding: '15px 18px',
										borderBottom:
											index < memberItems.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
									}}
								>
									<div
										style={{
											width: 8,
											height: 8,
											borderRadius: 4,
											background: color,
											flexShrink: 0,
											boxShadow: `0 0 8px ${color}60`,
										}}
									/>
									<span style={{ fontSize: 19, flexShrink: 0, lineHeight: 1 }}>
										{attentionIcon(item)}
									</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 500,
												letterSpacing: -0.2,
												marginBottom: 2,
												marginTop: 0,
											}}
										>
											{item.title}
										</p>
										<p
											style={{
												color: 'rgba(255,255,255,0.38)',
												fontSize: 12,
												margin: 0,
											}}
										>
											{item.description}
										</p>
									</div>
									<button
										type="button"
										onClick={() => navigate(item.path)}
										style={{
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											padding: '4px 8px',
										}}
									>
										<span style={{ color, fontSize: 12.5, fontWeight: 600 }}>
											{attentionCta(item)} →
										</span>
									</button>
								</div>
							)
						})}
					</div>
				</div>
			)}

			<div style={{ padding: '0 20px 20px' }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaHomeLabel>Today</FigmaHomeLabel>
				</div>
				<div
					style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
				>
					{todaySchedule.length === 0 ? (
						<div
							style={{
								padding: '14px 18px',
								color: FC.dim,
								fontSize: 13,
								lineHeight: 1.5,
							}}
						>
							No events scheduled for today yet.
						</div>
					) : (
						todaySchedule.map((event, index) => {
							const isPast =
								event.timeMins !== null && nowMins > event.timeMins + 60
							const isNow =
								event.timeMins !== null &&
								nowMins >= event.timeMins &&
								nowMins <= event.timeMins + 60

							return (
								<div
									key={`${event.time}-${event.label}`}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 12,
										padding: '14px 18px',
										borderBottom:
											index < todaySchedule.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
										opacity: isPast ? 0.38 : 1,
										background: isNow ? `${FC.blue}05` : 'none',
									}}
								>
									<div
										style={{
											width: 6,
											height: 6,
											borderRadius: 3,
											flexShrink: 0,
											background: isNow
												? FC.blue
												: isPast
													? 'rgba(255,255,255,0.08)'
													: 'rgba(255,255,255,0.15)',
											boxShadow: isNow ? `0 0 7px ${FC.blue}90` : 'none',
										}}
									/>
									<span
										style={{
											color: isNow ? FC.blue : FC.dim,
											fontSize: 13,
											fontWeight: isNow ? 600 : 500,
											width: 36,
											fontVariantNumeric: 'tabular-nums',
											flexShrink: 0,
										}}
									>
										{event.time}
									</span>
									<p
										style={{
											flex: 1,
											color: isPast ? FC.dim : FC.fg,
											fontSize: 14,
											fontWeight: 500,
											letterSpacing: -0.2,
											margin: 0,
										}}
									>
										{event.label}
									</p>
									<div
										style={{
											background: isNow ? `${FC.blue}15` : FC.ghost,
											border: isNow ? `1px solid ${FC.blue}25` : 'none',
											borderRadius: 8,
											padding: '3px 9px',
										}}
									>
										<span
											style={{
												color: isNow ? FC.blue : FC.dim,
												fontSize: 11,
											}}
										>
											{event.tag}
										</span>
									</div>
								</div>
							)
						})
					)}
				</div>
			</div>

			<div style={{ padding: '0 20px 24px' }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: 12,
					}}
				>
					<FigmaHomeLabel>Explore</FigmaHomeLabel>
					<button
						type="button"
						onClick={() => navigate(ROUTES.more)}
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
						<span style={{ color: FC.dim, fontSize: 12 }}>All modules</span>
						<ChevronRight size={12} color={FC.dim} />
					</button>
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						gap: 10,
					}}
				>
					{[
						{ emoji: '❤️', label: 'Health', path: ROUTES.health },
						{ emoji: '📄', label: 'Docs', path: ROUTES.documents },
						{ emoji: '🤖', label: 'Ask AI', path: ROUTES.ask },
					].map((module) => (
						<button
							key={module.label}
							type="button"
							onClick={() => navigate(module.path)}
							style={{
								background: FC.surface,
								border: `1px solid ${FC.line}`,
								borderRadius: 20,
								padding: '16px 12px',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: 8,
								cursor: 'pointer',
								boxShadow: `0 2px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
								textAlign: 'left',
							}}
						>
							<span style={{ fontSize: 24 }}>{module.emoji}</span>
							<p
								style={{
									color: FC.fg,
									fontSize: 13,
									fontWeight: 600,
									margin: 0,
								}}
							>
								{module.label}
							</p>
						</button>
					))}
				</div>
			</div>
		</>
	)
}
