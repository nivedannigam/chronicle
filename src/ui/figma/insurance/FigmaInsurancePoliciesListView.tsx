import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, FileText } from 'lucide-react'
import { insurancePolicyDetailPath } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	filterPolicyCards,
	groupPolicyCards,
	type PolicyCategoryFilterId,
	type PolicyGroupById,
	type PolicyStatusFilterId,
} from '@/features/insurance/services/insurance-policies.mapper'
import type { PolicyCardViewModel } from '@/features/insurance/services/insurance-policies.mapper'
import {
	HealthFilterChip,
	HealthSearchField,
} from '@/ui/figma/health/health-ui'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

const CATEGORY_FILTERS: { id: PolicyCategoryFilterId; label: string }[] = [
	{ id: 'health', label: 'Health' },
	{ id: 'life_term', label: 'Life' },
	{ id: 'motor', label: 'Vehicle' },
	{ id: 'home', label: 'Home' },
	{ id: 'travel', label: 'Travel' },
	{ id: 'personal_accident', label: 'Personal Accident' },
]

const STATUS_FILTERS: { id: PolicyStatusFilterId; label: string }[] = [
	{ id: 'active', label: 'Active' },
	{ id: 'expired', label: 'Expired' },
	{ id: 'expiring_soon', label: 'Expiring Soon' },
	{ id: 'cancelled', label: 'Cancelled' },
]

const GROUP_OPTIONS: { id: PolicyGroupById; label: string }[] = [
	{ id: 'category', label: 'Category' },
	{ id: 'expiry', label: 'Expiry' },
	{ id: 'insurer', label: 'Insurer' },
	{ id: 'member', label: 'Covered Member' },
]

function PolicyThumbnail({ card }: { card: PolicyCardViewModel }) {
	return (
		<div
			style={{
				width: 72,
				height: 92,
				borderRadius: 12,
				background: `linear-gradient(145deg, ${card.categoryColor}18 0%, ${FC.surface} 70%)`,
				border: `1px solid ${card.categoryColor}28`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				overflow: 'hidden',
				position: 'relative',
			}}
		>
			<span style={{ fontSize: 22, marginBottom: 4 }}>
				{card.categoryEmoji}
			</span>
			<FileText
				size={16}
				color={`${card.categoryColor}`}
				strokeWidth={1.6}
				style={{ opacity: 0.7 }}
			/>
		</div>
	)
}

function PolicyCard({
	card,
	onClick,
}: {
	card: PolicyCardViewModel
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
				gap: 16,
				alignItems: 'stretch',
			}}
		>
			<PolicyThumbnail card={card} />
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						gap: 8,
						marginBottom: 6,
					}}
				>
					<p
						style={{
							color: FC.fg,
							fontSize: 16,
							fontWeight: 700,
							margin: 0,
							letterSpacing: -0.2,
							lineHeight: 1.25,
						}}
					>
						{card.name}
					</p>
					<span
						style={{
							color: card.statusColor,
							fontSize: 11.5,
							fontWeight: 700,
							whiteSpace: 'nowrap',
							flexShrink: 0,
						}}
					>
						{card.status}
					</span>
				</div>

				<p
					style={{
						color: FC.dim,
						fontSize: 12,
						margin: '0 0 8px',
					}}
				>
					{card.categoryLabel} · {card.insurer} · {card.policyNumberMasked}
				</p>

				{card.assetLabel ? (
					<p
						style={{
							color: FC.mid,
							fontSize: 13.5,
							fontWeight: 600,
							margin: '0 0 6px',
						}}
					>
						{card.assetLabel}
					</p>
				) : null}

				<p
					style={{
						color: FC.fg,
						fontSize: 22,
						fontWeight: 700,
						margin: '0 0 4px',
						letterSpacing: -0.5,
					}}
				>
					{card.coverageLabel}
				</p>

				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: '4px 12px',
						marginBottom: card.coveredMembers.length > 0 ? 8 : 0,
					}}
				>
					{card.renewalLabel ? (
						<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
							{card.renewalLabel}
						</p>
					) : null}
					{card.premiumLabel ? (
						<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
							{card.premiumLabel}
						</p>
					) : null}
				</div>

				{card.coveredMembers.length > 0 ? (
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
						{card.coveredMembers.map((member) => (
							<span
								key={member}
								style={{
									background: `${FC.blue}12`,
									border: `1px solid ${FC.blue}25`,
									borderRadius: 100,
									padding: '3px 10px',
									color: FC.blue,
									fontSize: 11.5,
									fontWeight: 600,
								}}
							>
								{member}
							</span>
						))}
					</div>
				) : null}
			</div>
		</button>
	)
}

export function FigmaInsurancePoliciesListView() {
	const navigate = useNavigate()
	const { policies, knowledge } = useInsuranceContext()
	const [query, setQuery] = useState('')
	const [categoryFilters, setCategoryFilters] = useState<
		PolicyCategoryFilterId[]
	>([])
	const [statusFilters, setStatusFilters] = useState<PolicyStatusFilterId[]>([])
	const [groupBy, setGroupBy] = useState<PolicyGroupById>('category')
	const [groupMenuOpen, setGroupMenuOpen] = useState(false)

	const filtered = useMemo(
		() =>
			filterPolicyCards({
				cards: policies.policyCards,
				knowledge,
				query,
				categoryFilters,
				statusFilters,
			}),
		[policies.policyCards, knowledge, query, categoryFilters, statusFilters],
	)

	const groups = useMemo(
		() => groupPolicyCards(filtered, groupBy),
		[filtered, groupBy],
	)

	function toggleCategoryFilter(id: PolicyCategoryFilterId) {
		setCategoryFilters((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [...current, id],
		)
	}

	function toggleStatusFilter(id: PolicyStatusFilterId) {
		setStatusFilters((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [...current, id],
		)
	}

	const activeGroupLabel =
		GROUP_OPTIONS.find((option) => option.id === groupBy)?.label ?? 'Category'

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
				{policies.headline}
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 22px',
				}}
			>
				{policies.subtitle}
			</p>

			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search policies, vehicles, members, insurers…"
				ariaLabel="Search insurance policies"
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
						onClick={() => toggleCategoryFilter(filter.id)}
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
				{STATUS_FILTERS.map((filter) => (
					<HealthFilterChip
						key={filter.id}
						label={filter.label}
						active={statusFilters.includes(filter.id)}
						onClick={() => toggleStatusFilter(filter.id)}
					/>
				))}
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 14,
				}}
			>
				<FigmaHealthSectionLabel>
					{filtered.length} polic{filtered.length === 1 ? 'y' : 'ies'}
				</FigmaHealthSectionLabel>
				<div style={{ position: 'relative' }}>
					<button
						type="button"
						onClick={() => setGroupMenuOpen((open) => !open)}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 4,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							borderRadius: 100,
							padding: '6px 12px',
							color: FC.mid,
							fontSize: 12.5,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Group by {activeGroupLabel}
						<ChevronDown size={14} />
					</button>
					{groupMenuOpen ? (
						<div
							style={{
								position: 'absolute',
								right: 0,
								top: 'calc(100% + 6px)',
								zIndex: 20,
								background: FC.surface,
								border: `1px solid ${FC.line}`,
								borderRadius: 14,
								padding: 6,
								minWidth: 160,
								boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
							}}
						>
							{GROUP_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => {
										setGroupBy(option.id)
										setGroupMenuOpen(false)
									}}
									style={{
										display: 'block',
										width: '100%',
										textAlign: 'left',
										background: groupBy === option.id ? `${FC.blue}14` : 'none',
										border: 'none',
										borderRadius: 10,
										padding: '8px 12px',
										color: groupBy === option.id ? FC.blue : FC.fg,
										fontSize: 13,
										fontWeight: groupBy === option.id ? 700 : 500,
										cursor: 'pointer',
										fontFamily: 'inherit',
									}}
								>
									{option.label}
								</button>
							))}
						</div>
					) : null}
				</div>
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
						No policies match your search.
					</p>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 28 }}>
					{groups.map((group) => (
						<section key={group.id}>
							<div style={{ marginBottom: 12 }}>
								<p
									style={{
										color: FC.fg,
										fontSize: 17,
										fontWeight: 700,
										margin: '0 0 2px',
										letterSpacing: -0.3,
									}}
								>
									{group.title}
								</p>
								{group.subtitle ? (
									<p
										style={{
											color: FC.dim,
											fontSize: 12.5,
											margin: 0,
										}}
									>
										{group.subtitle}
									</p>
								) : null}
							</div>
							<div style={{ display: 'grid', gap: 14 }}>
								{group.policies.map((card) => (
									<PolicyCard
										key={`${group.id}-${card.id}`}
										card={card}
										onClick={() => navigate(insurancePolicyDetailPath(card.id))}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	)
}
