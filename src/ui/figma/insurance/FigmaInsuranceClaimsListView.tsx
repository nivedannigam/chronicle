import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { insuranceClaimDetailPath } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	filterClaimCards,
	type ClaimCardViewModel,
	type ClaimCategoryFilterId,
	type ClaimStatusFilterId,
	type ClaimTimeFilterId,
} from '@/features/insurance/services/insurance-claims.mapper'
import {
	HealthFilterChip,
	HealthSearchField,
} from '@/ui/figma/health/health-ui'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

const CATEGORY_FILTERS: { id: ClaimCategoryFilterId; label: string }[] = [
	{ id: 'health', label: 'Health' },
	{ id: 'motor', label: 'Vehicle' },
	{ id: 'life_term', label: 'Life' },
	{ id: 'home', label: 'Home' },
	{ id: 'travel', label: 'Travel' },
]

const STATUS_FILTERS: { id: ClaimStatusFilterId; label: string }[] = [
	{ id: 'pending', label: 'Pending' },
	{ id: 'settled', label: 'Settled' },
	{ id: 'rejected', label: 'Rejected' },
]

const TIME_FILTERS: { id: ClaimTimeFilterId; label: string }[] = [
	{ id: 'this_year', label: 'This Year' },
	{ id: 'last_year', label: 'Last Year' },
]

function SummaryGrid({
	stats,
}: {
	stats: Array<{
		id: string
		label: string
		value: string
		tone?: 'neutral' | 'positive' | 'attention'
	}>
}) {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
				gap: 10,
				marginBottom: 24,
			}}
		>
			{stats.map((stat) => {
				const color =
					stat.tone === 'positive'
						? FC.green
						: stat.tone === 'attention'
							? FC.amber
							: FC.fg

				return (
					<div
						key={stat.id}
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							padding: '14px 14px 12px',
						}}
					>
						<p
							style={{
								color: FC.dim,
								fontSize: 11.5,
								fontWeight: 600,
								margin: '0 0 6px',
								textTransform: 'uppercase',
								letterSpacing: 0.4,
							}}
						>
							{stat.label}
						</p>
						<p
							style={{
								color,
								fontSize: 20,
								fontWeight: 700,
								margin: 0,
								letterSpacing: -0.4,
							}}
						>
							{stat.value}
						</p>
					</div>
				)
			})}
		</div>
	)
}

function ClaimThumbnail({ card }: { card: ClaimCardViewModel }) {
	return (
		<div
			style={{
				width: 56,
				height: 72,
				borderRadius: 12,
				background: `linear-gradient(145deg, ${card.categoryColor}18 0%, ${FC.surface} 70%)`,
				border: `1px solid ${card.categoryColor}28`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			<span style={{ fontSize: 18, marginBottom: 4 }}>
				{card.categoryEmoji}
			</span>
			<FileText size={14} color={card.categoryColor} strokeWidth={1.6} />
		</div>
	)
}

function ClaimCard({
	card,
	onClick,
}: {
	card: ClaimCardViewModel
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '18px 16px',
				width: '100%',
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
				display: 'flex',
				gap: 14,
			}}
		>
			<ClaimThumbnail card={card} />
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						gap: 8,
						marginBottom: 4,
					}}
				>
					<p
						style={{
							color: FC.fg,
							fontSize: 16,
							fontWeight: 700,
							margin: 0,
							lineHeight: 1.25,
						}}
					>
						{card.title}
					</p>
					<span
						style={{
							color: card.statusColor,
							fontSize: 11.5,
							fontWeight: 700,
							whiteSpace: 'nowrap',
						}}
					>
						{card.status}
					</span>
				</div>

				<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 10px' }}>
					{card.policyName} · {card.insurer}
				</p>

				{card.claimedAmountLabel ? (
					<p
						style={{
							color: FC.fg,
							fontSize: 18,
							fontWeight: 700,
							margin: '0 0 2px',
							letterSpacing: -0.3,
						}}
					>
						{card.claimedAmountLabel}
					</p>
				) : null}

				{card.approvedAmountLabel ? (
					<p
						style={{
							color: FC.mid,
							fontSize: 13.5,
							fontWeight: 600,
							margin: '0 0 8px',
						}}
					>
						{card.approvedAmountLabel}
					</p>
				) : null}

				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
					{card.incidentDateLabel ? (
						<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
							{card.incidentDateLabel}
						</p>
					) : null}
					{card.coveredMember ? (
						<p
							style={{
								color: FC.blue,
								fontSize: 12,
								fontWeight: 600,
								margin: 0,
							}}
						>
							{card.coveredMember}
						</p>
					) : null}
				</div>
			</div>
		</button>
	)
}

export function FigmaInsuranceClaimsListView() {
	const navigate = useNavigate()
	const { claims, knowledge } = useInsuranceContext()
	const [query, setQuery] = useState('')
	const [categoryFilters, setCategoryFilters] = useState<
		ClaimCategoryFilterId[]
	>([])
	const [statusFilters, setStatusFilters] = useState<ClaimStatusFilterId[]>([])
	const [timeFilters, setTimeFilters] = useState<ClaimTimeFilterId[]>([])

	const filtered = useMemo(
		() =>
			filterClaimCards({
				cards: claims.claimCards,
				knowledge,
				query,
				categoryFilters,
				statusFilters,
				timeFilters,
			}),
		[
			claims.claimCards,
			knowledge,
			query,
			categoryFilters,
			statusFilters,
			timeFilters,
		],
	)

	function toggleFilter<T extends string>(
		value: T,
		current: T[],
		setter: (next: T[]) => void,
	) {
		setter(
			current.includes(value)
				? current.filter((item) => item !== value)
				: [...current, value],
		)
	}

	return (
		<div style={{ paddingBottom: 28 }}>
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
				{claims.headline}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 22px',
				}}
			>
				{claims.subtitle}
			</p>

			<SummaryGrid stats={claims.summary} />

			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search claims, members, insurers…"
				ariaLabel="Search insurance claims"
			/>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					paddingBottom: 4,
					marginBottom: 10,
					scrollbarWidth: 'none',
				}}
			>
				{CATEGORY_FILTERS.map((filter) => (
					<HealthFilterChip
						key={filter.id}
						label={filter.label}
						active={categoryFilters.includes(filter.id)}
						onClick={() =>
							toggleFilter(filter.id, categoryFilters, setCategoryFilters)
						}
					/>
				))}
			</div>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					paddingBottom: 4,
					marginBottom: 10,
					scrollbarWidth: 'none',
				}}
			>
				{STATUS_FILTERS.map((filter) => (
					<HealthFilterChip
						key={filter.id}
						label={filter.label}
						active={statusFilters.includes(filter.id)}
						onClick={() =>
							toggleFilter(filter.id, statusFilters, setStatusFilters)
						}
					/>
				))}
			</div>

			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					paddingBottom: 4,
					marginBottom: 16,
					scrollbarWidth: 'none',
				}}
			>
				{TIME_FILTERS.map((filter) => (
					<HealthFilterChip
						key={filter.id}
						label={filter.label}
						active={timeFilters.includes(filter.id)}
						onClick={() => toggleFilter(filter.id, timeFilters, setTimeFilters)}
					/>
				))}
			</div>

			<div style={{ marginBottom: 14 }}>
				<FigmaHealthSectionLabel>
					{filtered.length} claim{filtered.length === 1 ? '' : 's'}
				</FigmaHealthSectionLabel>
			</div>

			{filtered.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '28px 20px',
						textAlign: 'center',
					}}
				>
					<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
						No claims match your search.
					</p>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 14 }}>
					{filtered.map((card) => (
						<ClaimCard
							key={card.id}
							card={card}
							onClick={() => navigate(insuranceClaimDetailPath(card.id))}
						/>
					))}
				</div>
			)}
		</div>
	)
}
