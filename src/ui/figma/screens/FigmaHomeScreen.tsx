import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { AttentionItem } from '@/features/command-center/types/command-center.types'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { HomePageSkeleton } from '@/features/home/components/HomePageSkeleton'
import { useChronicleOs } from '@/features/os/hooks/useChronicleOs'
import { OnboardingFlow, useOnboarding } from '@/features/onboarding'
import { useModuleHubCards } from '@/features/modules/hooks/useModuleHubCards'
import { resolveModuleHubCardAction } from '@/features/modules/services/module-hub-status.service'
import { memberFirstName, memberInitial } from '@/ui/figma/home/home-ui'
import { HomeModuleSnapshotRow } from '@/ui/figma/modules/module-ui'
import {
	DailyBriefCard,
	LifeScoreHero,
	NotificationBellButton,
	OsSectionLabel,
	QuickActionsRow,
	LifeFeedList,
	UpcomingList,
} from '@/ui/figma/os/os-ui'
import { FigmaHeaderSearchButton } from '@/ui/figma/shell/FigmaScreenHeader'
import {
	FC,
	MEMBER_COLORS,
	figmaCardStyle,
} from '@/ui/figma/tokens/figma-v2-tokens'
import type { LifeScoreDimension } from '@/features/os/types/os.types'

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
	if (title.includes('passport') || title.includes('visa')) return '🛂'
	if (item.module === 'health') return '❤️'
	if (item.module === 'documents') return '📄'
	if (item.module === 'insurance') return '🛡️'
	return '⚡'
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
				}}
			>
				{name}
			</span>
		</button>
	)
}

export function FigmaHomeScreen() {
	const os = useChronicleOs()
	const navigate = useNavigate()
	const { members, selectedMemberId, setSelectedMemberId } = useFamilyContext()
	const { isVisible, completeStep, dismiss } = useOnboarding()

	const showSkeleton = os.loading && !os.hasAnyData

	const selectedMember = useMemo(
		() => members.find((member) => member.id === selectedMemberId) ?? null,
		[members, selectedMemberId],
	)

	const selectedName =
		selectedMember?.displayName ?? memberFirstName(os.greetingName)

	const memberItems = useMemo(
		() => attentionForMember(os.attentionItems, selectedMemberId),
		[os.attentionItems, selectedMemberId],
	)

	const actionableItems = memberItems.filter((item) => item.tone !== 'info')
	const statusOk = actionableItems.length === 0
	const { primaryCards: moduleCards } = useModuleHubCards()

	if (showSkeleton) {
		return <HomePageSkeleton />
	}

	const handleDimensionClick = (dimension: LifeScoreDimension) => {
		navigate(dimension.path)
	}

	return (
		<>
			{isVisible ? (
				<OnboardingFlow onCompleteStep={completeStep} onDismiss={dismiss} />
			) : null}

			<div style={{ padding: '4px 22px 22px' }}>
				<p
					style={{ color: FC.dim, fontSize: 14, marginBottom: 5, marginTop: 0 }}
				>
					{os.dateLabel}
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
							{os.greeting},
							<br />
							{memberFirstName(os.greetingName)}.
						</h1>
						<div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
							<div
								style={{
									width: 7,
									height: 7,
									borderRadius: 4,
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
									margin: 0,
								}}
							>
								{statusOk
									? os.lifeScore.headline
									: `${actionableItems.length} things need you`}
							</p>
						</div>
					</div>
					<div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
						<NotificationBellButton
							count={os.notificationCount}
							onClick={() => navigate(ROUTES.notifications)}
						/>
						<FigmaHeaderSearchButton onClick={() => navigate(ROUTES.search)} />
					</div>
				</div>
			</div>

			<div style={{ padding: '0 22px 22px' }}>
				<LifeScoreHero
					lifeScore={os.lifeScore}
					onDimensionClick={handleDimensionClick}
				/>
			</div>

			<div style={{ padding: '0 22px 22px' }}>
				<DailyBriefCard
					brief={os.dailyBrief}
					onAsk={() => navigate(ROUTES.ask)}
				/>
			</div>

			<div style={{ padding: '0 22px 22px' }}>
				<OsSectionLabel
					action="See all"
					onAction={() => navigate(ROUTES.modules)}
				>
					Your life
				</OsSectionLabel>
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '4px 16px',
					}}
				>
					{moduleCards.map((card) => (
						<HomeModuleSnapshotRow
							key={card.id}
							card={card}
							onClick={() => navigate(resolveModuleHubCardAction(card).path)}
						/>
					))}
				</div>
			</div>

			{members.length > 0 ? (
				<div style={{ padding: '0 22px 22px' }}>
					<OsSectionLabel
						action="People"
						onAction={() => navigate(ROUTES.profileFamily)}
					>
						Family
					</OsSectionLabel>
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
										os.attentionItems,
										member.id,
									)}
									onClick={() => setSelectedMemberId(member.id)}
								/>
							)
						})}
					</div>
				</div>
			) : null}

			{actionableItems.length > 0 ? (
				<div style={{ padding: '0 22px 20px' }}>
					<OsSectionLabel>Needs Attention — {selectedName}</OsSectionLabel>
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{actionableItems.map((item, index) => {
							const color = attentionColor(item)
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => navigate(item.path)}
									style={{
										width: '100%',
										display: 'flex',
										alignItems: 'center',
										gap: 13,
										padding: '15px 18px',
										borderBottom:
											index < actionableItems.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										textAlign: 'left',
										fontFamily: 'inherit',
									}}
								>
									<span style={{ fontSize: 19 }}>{attentionIcon(item)}</span>
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
											}}
										>
											{item.description}
										</p>
									</div>
									<span style={{ color, fontSize: 12, fontWeight: 600 }}>
										Open →
									</span>
								</button>
							)
						})}
					</div>
				</div>
			) : null}

			<div style={{ padding: '0 22px 20px' }}>
				<UpcomingList
					items={os.upcoming}
					onItemClick={(path) => navigate(path)}
				/>
			</div>

			<div style={{ padding: '0 22px 20px' }}>
				<LifeFeedList
					items={os.lifeFeed}
					onItemClick={(path) => navigate(path)}
					onViewAll={() => navigate(ROUTES.timeline)}
				/>
			</div>

			<div style={{ padding: '0 22px 24px' }}>
				<QuickActionsRow
					actions={os.quickActions}
					onAction={(path) => navigate(path)}
				/>
			</div>
		</>
	)
}
