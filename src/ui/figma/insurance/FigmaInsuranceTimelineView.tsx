import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, FileText, Sparkles } from 'lucide-react'
import {
	insuranceClaimDetailPath,
	insurancePolicyDetailPath,
} from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	filterTimelineCards,
	rebuildTimelineGroupsFromCards,
	type TimelineCardViewModel,
	type TimelineFilterId,
} from '@/features/insurance/services/insurance-timeline.mapper'
import {
	HealthFilterChip,
	HealthSearchField,
} from '@/ui/figma/health/health-ui'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

const FILTERS: { id: TimelineFilterId; label: string }[] = [
	{ id: 'health', label: 'Health' },
	{ id: 'motor', label: 'Vehicle' },
	{ id: 'life_term', label: 'Life' },
	{ id: 'home', label: 'Home' },
	{ id: 'travel', label: 'Travel' },
	{ id: 'claims', label: 'Claims' },
	{ id: 'renewals', label: 'Renewals' },
	{ id: 'coverage', label: 'Coverage' },
]

function YearSummaryCard({
	year,
	protectionScore,
	policiesAdded,
	renewals,
	claims,
	coverageGrowthLabel,
}: {
	year: number
	protectionScore: string
	policiesAdded: number
	renewals: number
	claims: number
	coverageGrowthLabel: string | null
}) {
	const stats = [
		{ label: 'Protection Score', value: protectionScore },
		{
			label: 'Policies Added',
			value: policiesAdded > 0 ? `+${policiesAdded}` : '0',
		},
		{
			label: 'Renewals',
			value: renewals > 0 ? String(renewals) : '0',
		},
		{
			label: 'Claims',
			value: claims > 0 ? String(claims) : '0',
		},
	]

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '20px 18px',
				marginBottom: 20,
				background: `linear-gradient(155deg, ${FC.blue}10 0%, ${FC.surface} 55%)`,
				border: `1px solid ${FC.blue}22`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					margin: '0 0 14px',
					letterSpacing: -0.6,
				}}
			>
				{year}
			</p>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 10,
				}}
			>
				{stats.map((stat) => (
					<div key={stat.label}>
						<p
							style={{
								color: FC.dim,
								fontSize: 11,
								fontWeight: 600,
								margin: '0 0 4px',
								textTransform: 'uppercase',
								letterSpacing: 0.35,
							}}
						>
							{stat.label}
						</p>
						<p
							style={{
								color: FC.fg,
								fontSize: 18,
								fontWeight: 700,
								margin: 0,
							}}
						>
							{stat.value}
						</p>
					</div>
				))}
			</div>
			{coverageGrowthLabel ? (
				<p
					style={{
						color: FC.green,
						fontSize: 14,
						fontWeight: 700,
						margin: '14px 0 0',
					}}
				>
					Coverage {coverageGrowthLabel}
				</p>
			) : null}
		</div>
	)
}

function StoryBlock({ story }: { story: string }) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: '18px 16px',
				marginBottom: 20,
				background: `linear-gradient(145deg, ${FC.teal}08 0%, ${FC.surface} 60%)`,
				border: `1px solid ${FC.teal}18`,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 10,
				}}
			>
				<Sparkles size={16} color={FC.teal} />
				<p
					style={{
						color: FC.teal,
						fontSize: 12,
						fontWeight: 700,
						margin: 0,
						textTransform: 'uppercase',
						letterSpacing: 0.4,
					}}
				>
					Your year
				</p>
			</div>
			<p
				style={{
					color: FC.fg,
					fontSize: 15,
					lineHeight: 1.6,
					margin: 0,
				}}
			>
				{story}
			</p>
		</div>
	)
}

function TimelineCard({
	card,
	onClick,
	isLast,
}: {
	card: TimelineCardViewModel
	onClick: () => void
	isLast: boolean
}) {
	return (
		<div
			style={{
				display: 'flex',
				gap: 14,
				animation: 'fadeInUp 0.4s ease both',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					width: 20,
					flexShrink: 0,
				}}
			>
				<div
					style={{
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: card.isMilestone ? FC.amber : `${card.categoryColor}`,
						boxShadow: card.isMilestone
							? `0 0 12px ${FC.amber}55`
							: `0 0 8px ${card.categoryColor}33`,
						marginTop: 22,
					}}
				/>
				{!isLast ? (
					<div
						style={{
							width: 2,
							flex: 1,
							background: `linear-gradient(180deg, ${card.categoryColor}44 0%, ${FC.line} 100%)`,
							marginTop: 6,
							minHeight: 40,
						}}
					/>
				) : null}
			</div>

			<button
				type="button"
				onClick={onClick}
				style={{
					...figmaCardStyle,
					borderRadius: 22,
					padding: '16px 16px 14px',
					flex: 1,
					marginBottom: isLast ? 0 : 14,
					cursor: card.policyId || card.claimId ? 'pointer' : 'default',
					fontFamily: 'inherit',
					textAlign: 'left',
					border: `1px solid ${card.categoryColor}20`,
					background: `linear-gradient(145deg, ${card.categoryColor}08 0%, ${FC.surface} 70%)`,
					transition: 'transform 0.18s ease, box-shadow 0.18s ease',
				}}
			>
				{card.isMilestone && card.milestoneLabel ? (
					<div
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 5,
							background: `${FC.amber}16`,
							border: `1px solid ${FC.amber}30`,
							borderRadius: 100,
							padding: '3px 10px',
							marginBottom: 10,
						}}
					>
						<Sparkles size={12} color={FC.amber} />
						<span
							style={{
								color: FC.amber,
								fontSize: 11,
								fontWeight: 700,
							}}
						>
							{card.milestoneLabel}
						</span>
					</div>
				) : null}

				<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
					<div
						style={{
							width: 48,
							height: 60,
							borderRadius: 10,
							background: `${card.categoryColor}14`,
							border: `1px solid ${card.categoryColor}28`,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<span style={{ fontSize: 18, marginBottom: 2 }}>
							{card.categoryEmoji}
						</span>
						<FileText size={13} color={card.categoryColor} strokeWidth={1.6} />
					</div>

					<div style={{ flex: 1, minWidth: 0 }}>
						{card.kind === 'policy_renewed' ||
						card.kind === 'coverage_increased' ? (
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 6,
									marginBottom: 6,
								}}
							>
								<Check size={14} color={FC.green} strokeWidth={2.5} />
								<p
									style={{
										color: FC.fg,
										fontSize: 15,
										fontWeight: 700,
										margin: 0,
										lineHeight: 1.3,
									}}
								>
									{card.title}
								</p>
							</div>
						) : (
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 700,
									margin: '0 0 6px',
									lineHeight: 1.3,
								}}
							>
								{card.title}
							</p>
						)}

						{card.subtitle ? (
							<p
								style={{
									color: FC.dim,
									fontSize: 12.5,
									margin: '0 0 8px',
								}}
							>
								{card.subtitle}
							</p>
						) : null}

						{card.coverageChange ? (
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									marginBottom: 8,
								}}
							>
								<span
									style={{
										color: FC.mid,
										fontSize: 18,
										fontWeight: 700,
									}}
								>
									{card.coverageChange.from}
								</span>
								<span style={{ color: FC.dim, fontSize: 14 }}>→</span>
								<span
									style={{
										color: FC.fg,
										fontSize: 18,
										fontWeight: 700,
									}}
								>
									{card.coverageChange.to}
								</span>
							</div>
						) : null}

						{card.amountLabel ? (
							<p
								style={{
									color: FC.fg,
									fontSize: 17,
									fontWeight: 700,
									margin: '0 0 6px',
								}}
							>
								{card.amountLabel}
							</p>
						) : card.detail ? (
							<p
								style={{
									color: FC.fg,
									fontSize: 17,
									fontWeight: 700,
									margin: '0 0 6px',
								}}
							>
								{card.detail}
							</p>
						) : null}

						{card.highlights.length > 0 ? (
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 6,
									marginTop: 4,
								}}
							>
								{card.highlights.map((highlight) => (
									<span
										key={highlight}
										style={{
											background: `${card.categoryColor}12`,
											border: `1px solid ${card.categoryColor}25`,
											borderRadius: 100,
											padding: '3px 10px',
											color: FC.mid,
											fontSize: 11.5,
											fontWeight: 600,
										}}
									>
										{highlight}
									</span>
								))}
							</div>
						) : null}

						{card.memberName ? (
							<p
								style={{
									color: FC.blue,
									fontSize: 12.5,
									fontWeight: 600,
									margin: '8px 0 0',
								}}
							>
								{card.memberName}
							</p>
						) : null}
					</div>
				</div>
			</button>
		</div>
	)
}

export function FigmaInsuranceTimelineView() {
	const navigate = useNavigate()
	const { timeline, knowledge } = useInsuranceContext()
	const [query, setQuery] = useState('')
	const [activeFilters, setActiveFilters] = useState<TimelineFilterId[]>([])

	const allCards = useMemo(
		() =>
			timeline.yearGroups.flatMap((group) =>
				group.months.flatMap((month) => month.cards),
			),
		[timeline.yearGroups],
	)

	const filteredCards = useMemo(
		() =>
			filterTimelineCards({
				cards: allCards,
				query,
				categoryFilters: activeFilters,
			}),
		[allCards, query, activeFilters],
	)

	const filteredGroups = useMemo(
		() => rebuildTimelineGroupsFromCards(filteredCards, knowledge),
		[filteredCards, knowledge],
	)

	function handleCardClick(card: TimelineCardViewModel) {
		if (card.claimId) {
			navigate(insuranceClaimDetailPath(card.claimId))
			return
		}

		if (card.policyId) {
			navigate(insurancePolicyDetailPath(card.policyId))
		}
	}

	function toggleFilter(id: TimelineFilterId) {
		setActiveFilters((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [...current, id],
		)
	}

	return (
		<div style={{ paddingBottom: 32 }}>
			<style>{`
				@keyframes fadeInUp {
					from { opacity: 0; transform: translateY(8px); }
					to { opacity: 1; transform: translateY(0); }
				}
			`}</style>

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
				{timeline.headline}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 22px',
				}}
			>
				{timeline.subtitle}
			</p>

			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search renewals, claims, coverage changes…"
				ariaLabel="Search insurance timeline"
			/>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					paddingBottom: 4,
					marginBottom: 20,
					scrollbarWidth: 'none',
				}}
			>
				{FILTERS.map((filter) => (
					<HealthFilterChip
						key={filter.id}
						label={filter.label}
						active={activeFilters.includes(filter.id)}
						onClick={() => toggleFilter(filter.id)}
					/>
				))}
			</div>

			{filteredGroups.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '28px 20px',
						textAlign: 'center',
					}}
				>
					<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
						No moments match your search.
					</p>
				</div>
			) : (
				filteredGroups.map((yearGroup) => (
					<section key={yearGroup.year} style={{ marginBottom: 36 }}>
						<YearSummaryCard
							year={yearGroup.year}
							protectionScore={yearGroup.summary.protectionScore}
							policiesAdded={yearGroup.summary.policiesAdded}
							renewals={yearGroup.summary.renewals}
							claims={yearGroup.summary.claims}
							coverageGrowthLabel={yearGroup.summary.coverageGrowthLabel}
						/>

						{yearGroup.story ? <StoryBlock story={yearGroup.story} /> : null}

						{yearGroup.milestones.length > 0 ? (
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 8,
									marginBottom: 18,
								}}
							>
								{yearGroup.milestones.map((milestone) => (
									<span
										key={milestone.id}
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											gap: 6,
											background: `${FC.amber}12`,
											border: `1px solid ${FC.amber}28`,
											borderRadius: 100,
											padding: '6px 12px',
											color: FC.amber,
											fontSize: 12,
											fontWeight: 700,
										}}
									>
										<Sparkles size={12} />
										{milestone.label}
									</span>
								))}
							</div>
						) : null}

						{yearGroup.months.map((month) => (
							<div key={month.id} style={{ marginBottom: 24 }}>
								<div style={{ marginBottom: 14 }}>
									<FigmaHealthSectionLabel>
										{month.label}
									</FigmaHealthSectionLabel>
								</div>
								<div>
									{month.cards.map((card, index) => (
										<TimelineCard
											key={card.id}
											card={card}
											isLast={index === month.cards.length - 1}
											onClick={() => handleCardClick(card)}
										/>
									))}
								</div>
							</div>
						))}
					</section>
				))
			)}
		</div>
	)
}
