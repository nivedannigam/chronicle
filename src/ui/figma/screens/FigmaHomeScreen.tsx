import { useNavigate } from 'react-router-dom'
import {
	Activity,
	ChevronRight,
	FileText,
	Heart,
	Mail,
	Plane,
	Sparkles,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useCommandCenter } from '@/features/command-center/hooks/useCommandCenter'
import type { AttentionItem } from '@/features/command-center/types/command-center.types'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { OnboardingFlow, useOnboarding } from '@/features/onboarding'
import { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'

function toneColor(tone: AttentionItem['tone']) {
	switch (tone) {
		case 'warning':
			return C.red
		case 'attention':
			return C.orange
		default:
			return C.accentBlue
	}
}

function toneIcon(item: AttentionItem) {
	if (item.module === 'health') return Heart
	if (item.module === 'documents') return FileText
	if (item.module === 'family') return Activity
	return Mail
}

export function FigmaHomeScreen() {
	const briefing = useCommandCenter()
	const navigate = useNavigate()
	const { isVisible, completeStep, dismiss } = useOnboarding()

	const showSkeleton =
		briefing.loading.family &&
		briefing.loading.health &&
		briefing.loading.documents &&
		!briefing.hasAnyData

	if (showSkeleton) {
		return <HomePageSkeleton />
	}

	const brief = briefing.attentionItems.slice(0, 4)
	const intelligenceTitle = briefing.attentionItems.length
		? 'A few things need your attention.'
		: briefing.hasAnyData
			? 'You are up to date.'
			: 'Welcome to Chronicle.'

	const world = [
		{
			Icon: Heart,
			label: 'Health',
			title:
				briefing.healthSnapshot.reportCount > 0
					? briefing.healthSnapshot.status
					: 'Set up',
			sub:
				briefing.healthSnapshot.reportCount > 0
					? `${briefing.healthSnapshot.reportCount} reports`
					: 'Connect records',
			color: C.teal,
			path: ROUTES.health,
		},
		{
			Icon: FileText,
			label: 'Docs',
			title:
				briefing.documentCount > 0
					? `${briefing.documentCount} saved`
					: 'Add docs',
			sub:
				briefing.expiringDocuments.length > 0
					? `${briefing.expiringDocuments.length} expiring`
					: 'Upload documents',
			color: C.accent,
			path: ROUTES.documents,
		},
		{
			Icon: Activity,
			label: 'Family',
			title: `${briefing.memberSummaries.length} members`,
			sub: briefing.familyName,
			color: C.accentBlue,
			path: ROUTES.family,
		},
		{
			Icon: Plane,
			label: 'Timeline',
			title: briefing.timelinePreview.length > 0 ? 'Recent' : 'Empty',
			sub: 'Life events',
			color: C.green,
			path: ROUTES.timeline,
		},
	]

	return (
		<>
			{isVisible ? (
				<OnboardingFlow onCompleteStep={completeStep} onDismiss={dismiss} />
			) : null}

			<div style={{ padding: '16px 18px 20px', color: C.text }}>
				<div style={{ marginBottom: 22 }}>
					<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 5 }}>
						{briefing.dateLabel}
					</div>
					<div
						style={{
							fontSize: 32,
							fontWeight: 700,
							letterSpacing: '-0.03em',
							lineHeight: 1.1,
						}}
					>
						{briefing.greeting},
						<br />
						{briefing.greetingName}.
					</div>
				</div>

				<button
					type="button"
					onClick={() => navigate(ROUTES.ask)}
					style={{
						width: '100%',
						background: C.card,
						border: `1px solid rgba(108,111,255,0.25)`,
						borderRadius: 16,
						padding: '12px 14px',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						marginBottom: 26,
						boxShadow: `0 0 28px rgba(108,111,255,0.12)`,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					<Sparkles size={18} color={C.accent} />
					<span style={{ fontSize: 14, color: C.textMuted, flex: 1 }}>
						Ask Chronicle anything...
					</span>
				</button>

				<div style={{ marginBottom: 26 }}>
					<FigmaSectionLabel>Today&apos;s Intelligence</FigmaSectionLabel>
					<FigmaCard style={{ padding: 16 }}>
						<div
							style={{
								fontSize: 15,
								fontWeight: 700,
								color: C.text,
								marginBottom: 14,
								letterSpacing: '-0.01em',
							}}
						>
							{intelligenceTitle}
						</div>
						{brief.length === 0 ? (
							<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
								{briefing.todaySummary}
							</div>
						) : (
							brief.map((item, index) => {
								const Icon = toneIcon(item)
								const color = toneColor(item.tone)

								return (
									<button
										key={item.id}
										type="button"
										onClick={() => navigate(item.path)}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 11,
											marginBottom: index < brief.length - 1 ? 12 : 0,
											width: '100%',
											background: 'none',
											border: 'none',
											padding: 0,
											cursor: 'pointer',
											fontFamily: 'inherit',
											textAlign: 'left',
										}}
									>
										<div
											style={{
												width: 32,
												height: 32,
												borderRadius: 10,
												background: `${color}18`,
												border: `1px solid ${color}28`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												flexShrink: 0,
											}}
										>
											<Icon size={14} color={color} />
										</div>
										<span
											style={{
												fontSize: 13,
												color: C.textSec,
												flex: 1,
												lineHeight: 1.45,
											}}
										>
											{item.title}
											{item.description ? ` — ${item.description}` : ''}
										</span>
										<ChevronRight size={13} color={C.textMuted} />
									</button>
								)
							})
						)}
					</FigmaCard>
				</div>

				<div style={{ marginBottom: 26 }}>
					<FigmaSectionLabel>Your World</FigmaSectionLabel>
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
						{world.map((card) => (
							<button
								key={card.label}
								type="button"
								onClick={() => navigate(card.path)}
								style={{
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 20,
									padding: '14px 14px',
									minWidth: 120,
									flexShrink: 0,
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
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
								<div style={{ fontSize: 11, color: card.color }}>
									{card.sub}
								</div>
							</button>
						))}
					</div>
				</div>

				<FigmaSectionLabel>Today&apos;s Timeline</FigmaSectionLabel>
				{briefing.timelinePreview.length === 0 ? (
					<div
						style={{
							fontSize: 13,
							color: C.textMuted,
							lineHeight: 1.5,
							paddingBottom: 8,
						}}
					>
						Events will appear as you add health records and documents.
					</div>
				) : (
					<div
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 18,
							overflow: 'hidden',
							marginBottom: 8,
						}}
					>
						{briefing.timelinePreview.map((event, index) => (
							<div
								key={event.id}
								style={{
									borderBottom:
										index === briefing.timelinePreview.length - 1
											? 'none'
											: `1px solid ${C.border}`,
								}}
							>
								<TimelineEventRow event={event} />
							</div>
						))}
					</div>
				)}

				{!briefing.hasAnyData ? (
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthSettings)}
						style={{
							marginTop: 16,
							width: '100%',
							minHeight: 44,
							borderRadius: 14,
							border: 'none',
							background: C.accent,
							color: C.text,
							fontWeight: 700,
							fontSize: 14,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Connect health records
					</button>
				) : null}
			</div>
		</>
	)
}
