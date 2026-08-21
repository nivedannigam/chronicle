import { useNavigate } from 'react-router-dom'
import {
	financeHistoryEventPath,
	ROUTES,
	documentsCategoryPath,
	globalAskPath,
} from '@/constants/routes'
import { useFinanceContext } from '@/features/finance/context/useFinanceContext'
import { formatFinanceEventDate } from '@/features/finance-knowledge/services/finance-timeline-display.service'
import {
	FinanceAskBlock,
	FinanceDocumentTypeRow,
	FinanceEmptyState,
	FinanceEntityCountRow,
	FinanceEntitySummaryRow,
	FinanceHistoryLink,
	FinanceLibraryLink,
	FinanceRecentActivityRow,
	FinanceSectionLabel,
	FinanceSnapshotPanel,
	FinanceStatusHero,
} from '@/ui/figma/finance/finance-ui'
import { ListSkeleton } from '@/components/common/ListSkeleton'

export function FinanceHomePage() {
	const navigate = useNavigate()
	const { home, setupStatus, isLoading, isError, refetch } = useFinanceContext()

	if (isLoading) {
		return (
			<div style={{ paddingBottom: 24 }}>
				<ListSkeleton rows={4} />
			</div>
		)
	}

	if (isError) {
		return (
			<FinanceEmptyState
				emoji="💰"
				title="Could not load your financial records"
				body="Try again in a moment."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (setupStatus === 'not_connected') {
		return (
			<FinanceEmptyState
				emoji="💰"
				title="Keep your financial life organized in one place"
				body="Connect your Finance folder and Chronicle will organize bank statements, investments, loans, and tax records from nested folders."
				primaryLabel="Connect Finance folder"
				onPrimary={() => navigate(ROUTES.financeSettings)}
				secondaryLabel="Works with Google Drive"
			/>
		)
	}

	return (
		<div style={{ paddingBottom: 24 }}>
			<FinanceSectionLabel>Financial Snapshot</FinanceSectionLabel>

			{home.snapshot.showSnapshot ? (
				<FinanceSnapshotPanel
					netWorth={home.snapshot.netWorthDisplay}
					assets={home.snapshot.assetsDisplay}
					liabilities={home.snapshot.liabilitiesDisplay}
					confidenceLabel={home.snapshot.confidenceLabel}
					coverageLine={home.snapshot.coverageLine}
				/>
			) : (
				<FinanceStatusHero
					headline={home.statusHeadline}
					subline={home.statusSubline}
				/>
			)}

			{home.snapshot.limitations.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					{home.snapshot.limitations.slice(0, 2).map((note) => (
						<p
							key={note}
							style={{
								color: 'rgba(255,255,255,0.55)',
								fontSize: 13,
								margin: '0 0 8px',
								lineHeight: 1.5,
							}}
						>
							{note}
						</p>
					))}
				</div>
			) : null}

			{home.entitySummaries.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Known accounts</FinanceSectionLabel>
					{home.entitySummaries.map((entity) => (
						<FinanceEntitySummaryRow key={entity.id} entity={entity} />
					))}
				</div>
			) : home.entityCounts.total > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Your accounts</FinanceSectionLabel>
					<FinanceEntityCountRow
						label="Bank accounts"
						count={home.entityCounts.bankAccounts}
					/>
					<FinanceEntityCountRow
						label="Credit cards"
						count={home.entityCounts.creditCards}
					/>
					<FinanceEntityCountRow
						label="Loans"
						count={home.entityCounts.loans}
					/>
					<FinanceEntityCountRow
						label="Investment accounts"
						count={home.entityCounts.investmentAccounts}
					/>
				</div>
			) : null}

			{home.documentTypeCounts.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Your financial records</FinanceSectionLabel>
					<p
						style={{
							color: 'rgba(255,255,255,0.75)',
							fontSize: 14,
							margin: '0 0 10px',
						}}
					>
						{home.documentCount} document{home.documentCount === 1 ? '' : 's'}
					</p>
					{home.coverageOrganizingNote ? (
						<p
							style={{
								color: 'rgba(255,255,255,0.55)',
								fontSize: 13,
								margin: '0 0 12px',
							}}
						>
							{home.coverageOrganizingNote}
						</p>
					) : null}
					{home.documentTypeCounts.map((item) => (
						<FinanceDocumentTypeRow key={item.id} item={item} />
					))}
				</div>
			) : setupStatus === 'empty' ? (
				<p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>
					No financial documents found in your connected folder yet.
				</p>
			) : null}

			{home.recentActivity.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Recent financial activity</FinanceSectionLabel>
					{home.recentActivity.map((activity) => (
						<FinanceRecentActivityRow
							key={activity.id}
							title={activity.title}
							entityName={activity.entityDisplayName}
							dateLabel={formatFinanceEventDate(activity.eventDate)}
							onClick={() => navigate(financeHistoryEventPath(activity.id))}
						/>
					))}
					{home.showHistoryLink ? (
						<div style={{ marginTop: 4 }}>
							<FinanceHistoryLink
								label="View all history →"
								onClick={() => navigate(ROUTES.financeHistory)}
							/>
						</div>
					) : null}
				</div>
			) : home.showHistoryLink ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>History</FinanceSectionLabel>
					<FinanceHistoryLink
						label="View financial history →"
						onClick={() => navigate(ROUTES.financeHistory)}
					/>
				</div>
			) : null}

			{home.attentionItems.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Needs attention</FinanceSectionLabel>
					{home.attentionItems.map((item) => (
						<div
							key={item.id}
							style={{
								borderRadius: 18,
								padding: '14px 16px',
								marginBottom: 10,
								background: 'rgba(255,255,255,0.04)',
								border: '1px solid rgba(255,255,255,0.08)',
							}}
						>
							<p
								style={{
									color: 'rgba(255,255,255,0.9)',
									fontSize: 14,
									fontWeight: 600,
									margin: '0 0 4px',
								}}
							>
								{item.headline}
							</p>
							<p
								style={{
									color: 'rgba(255,255,255,0.55)',
									fontSize: 12,
									margin: 0,
								}}
							>
								{item.subline}
							</p>
						</div>
					))}
				</div>
			) : null}

			{home.showLibraryLink ? (
				<div style={{ marginBottom: 18 }}>
					<FinanceSectionLabel>Important documents</FinanceSectionLabel>
					<FinanceLibraryLink
						onClick={() => navigate(documentsCategoryPath('financial'))}
					/>
				</div>
			) : null}

			<FinanceAskBlock
				suggestions={home.askSuggestions}
				onSelect={(question) =>
					navigate(globalAskPath({ q: question, context: 'finance' }))
				}
			/>
		</div>
	)
}
