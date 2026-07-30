import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, RefreshCw, User, X } from 'lucide-react'
import { AppShell } from '@/components/layout/mobile'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { useImportReview } from '@/features/medical-discovery/hooks/useImportReview'
import { processApprovedImports } from '@/features/medical-discovery/services/import-pipeline.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import type { ReviewDocument } from '@/features/medical-discovery/types/medical-discovery.types'
import { useUser } from '@/features/user/hooks/useUser'
import { useMemo, useState } from 'react'

export function ImportReviewPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const userId = user?.id
	const review = useImportReview(userId)
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')
	const uniqueMembers = dedupeFamilyMembers(members)
	const [isImporting, setIsImporting] = useState(false)
	const [importMessage, setImportMessage] = useState<string | null>(null)

	const pendingDocuments = useMemo(
		() => review.documents.filter((doc) => doc.approvalStatus === 'pending'),
		[review.documents],
	)
	const failedDocuments = useMemo(
		() => review.documents.filter((doc) => doc.importStatus === 'failed'),
		[review.documents],
	)
	const approvedPendingImport = useMemo(
		() =>
			review.documents.filter(
				(doc) =>
					doc.approvalStatus === 'approved' &&
					doc.importStatus !== 'completed' &&
					doc.importStatus !== 'failed',
			),
		[review.documents],
	)

	if (!userId) {
		return null
	}

	const handleImportApproved = async () => {
		setIsImporting(true)
		setImportMessage(null)

		try {
			const summary = await processApprovedImports(userId)
			invalidateAfterHealthImport(userId)
			await review.refresh()

			const detail =
				summary.lastError && summary.errors > 0
					? ` Last error: ${summary.lastError}`
					: ''

			setImportMessage(
				`Imported ${summary.imported}, skipped ${summary.skipped}, duplicates ${summary.duplicates}, errors ${summary.errors}.${detail}`,
			)
		} catch (error) {
			setImportMessage(error instanceof Error ? error.message : 'Import failed')
		} finally {
			setIsImporting(false)
		}
	}

	const hasActionableDocuments = review.documents.length > 0
	const subtitle =
		pendingDocuments.length > 0
			? 'Approve documents before import. Approved reports enter the import pipeline.'
			: failedDocuments.length > 0
				? 'These reports were detected but import failed. Review errors and retry import.'
				: 'Review detected reports and import approved documents into Chronicle.'

	return (
		<AppShell
			paddingX={18}
			paddingTop={18}
			paddingBottom={20}
			style={{ flex: 1, minHeight: 0, color: C.text }}
			footer={
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{importMessage ? (
						<div
							style={{
								fontSize: 12,
								color: importMessage.includes('errors 0')
									? C.greenAlt
									: C.orange,
								lineHeight: 1.5,
							}}
						>
							{importMessage}
						</div>
					) : null}
					<div style={{ display: 'flex', gap: 10, width: '100%', minWidth: 0 }}>
						{pendingDocuments.length > 0 ? (
							<button
								type="button"
								onClick={() => void review.approveAllLikely()}
								disabled={review.isLoading || isImporting}
								style={{
									flex: 1,
									background: C.accentDim,
									border: '1px solid rgba(108,111,255,0.25)',
									borderRadius: 100,
									padding: '12px 14px',
									fontSize: 13,
									fontWeight: 700,
									color: C.accent,
									cursor: 'pointer',
									fontFamily: 'inherit',
									minHeight: 44,
								}}
							>
								Approve All Likely
							</button>
						) : null}
						<button
							type="button"
							onClick={() => void handleImportApproved()}
							disabled={isImporting || !hasActionableDocuments}
							style={{
								flex: 1,
								background: C.accent,
								border: 'none',
								borderRadius: 100,
								padding: '12px 14px',
								fontSize: 13,
								fontWeight: 700,
								color: C.white,
								cursor:
									isImporting || !hasActionableDocuments
										? 'not-allowed'
										: 'pointer',
								fontFamily: 'inherit',
								opacity: isImporting || !hasActionableDocuments ? 0.6 : 1,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: 6,
								minHeight: 44,
							}}
						>
							{isImporting ? (
								<Loader2
									size={16}
									style={{ animation: 'spin 1s linear infinite' }}
								/>
							) : (
								<RefreshCw size={16} />
							)}
							{failedDocuments.length > 0 ? 'Retry Import' : 'Import Approved'}
						</button>
					</div>
				</div>
			}
		>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthSettings)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Review Reports
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 16,
					lineHeight: 1.5,
				}}
			>
				{subtitle}
			</div>

			{hasActionableDocuments ? (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(3, 1fr)',
						gap: 8,
						marginBottom: 16,
					}}
				>
					<StatChip
						label="Pending approval"
						value={String(pendingDocuments.length)}
					/>
					<StatChip
						label="Ready to import"
						value={String(approvedPendingImport.length)}
					/>
					<StatChip
						label="Failed"
						value={String(failedDocuments.length)}
						accent={C.red}
					/>
				</div>
			) : null}

			{review.error ? (
				<div style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>
					{review.error}
				</div>
			) : null}

			{review.isLoading ? (
				<div style={{ fontSize: 13, color: C.textSec }}>
					Loading review queue…
				</div>
			) : !hasActionableDocuments ? (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						padding: 20,
						fontSize: 13,
						color: C.textMuted,
						textAlign: 'center',
						lineHeight: 1.6,
					}}
				>
					No reports awaiting review. Connect a health folder and run a scan
					from Health Setup first.
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{review.documents.map((doc) => (
						<ReviewDocumentCard
							key={doc.registryId}
							doc={doc}
							members={uniqueMembers}
							onApprove={() => void review.approve(doc.registryId)}
							onReject={() => void review.reject(doc.registryId)}
							onReassign={(memberId) =>
								void review.reassign(doc.registryId, memberId)
							}
						/>
					))}
				</div>
			)}
		</AppShell>
	)
}

function StatChip({
	label,
	value,
	accent,
}: {
	label: string
	value: string
	accent?: string
}) {
	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 18, fontWeight: 800, color: accent ?? C.text }}>
				{value}
			</div>
		</div>
	)
}

function ReviewDocumentCard({
	doc,
	members,
	onApprove,
	onReject,
	onReassign,
}: {
	doc: ReviewDocument
	members: ReturnType<typeof dedupeFamilyMembers>
	onApprove: () => void
	onReject: () => void
	onReassign: (memberId: string) => void
}) {
	const isPending = doc.approvalStatus === 'pending'
	const isFailed = doc.importStatus === 'failed'

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${isFailed ? 'rgba(255,69,58,0.25)' : C.border}`,
				borderRadius: 16,
				padding: 14,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 10,
					marginBottom: 4,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
					{doc.fileName}
				</div>
				<StatusBadge doc={doc} />
			</div>
			<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
				{doc.folderPath || 'Unknown folder'} · {doc.confidence}% confidence ·{' '}
				{doc.category.replace('_', ' ')}
			</div>
			<div style={{ fontSize: 12, color: C.textSec, marginBottom: 10 }}>
				Detected patient:{' '}
				{doc.familyMemberName ?? doc.detectedPatient ?? 'Unknown'}
			</div>
			{doc.errorMessage ? (
				<div
					style={{
						fontSize: 12,
						color: C.red,
						background: 'rgba(255,69,58,0.08)',
						border: '1px solid rgba(255,69,58,0.15)',
						borderRadius: 10,
						padding: '8px 10px',
						marginBottom: 10,
						lineHeight: 1.5,
					}}
				>
					{doc.errorMessage}
				</div>
			) : null}
			{isPending ? (
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<ActionChip
						label="Approve"
						icon={<Check size={14} />}
						color={C.greenAlt}
						onClick={onApprove}
					/>
					<ActionChip
						label="Reject"
						icon={<X size={14} />}
						color={C.red}
						onClick={onReject}
					/>
					{members.map((member) => (
						<ActionChip
							key={member.id}
							label={formatMemberLabel(member)}
							icon={<User size={14} />}
							color={C.textSec}
							onClick={() => onReassign(member.id)}
						/>
					))}
				</div>
			) : null}
		</div>
	)
}

function StatusBadge({ doc }: { doc: ReviewDocument }) {
	let label: string = doc.approvalStatus
	let color: string = C.textSec

	if (doc.importStatus === 'completed') {
		label = 'imported'
		color = C.greenAlt
	} else if (doc.importStatus === 'failed') {
		label = 'failed'
		color = C.red
	} else if (doc.approvalStatus === 'approved') {
		label = doc.importStatus === 'queued' ? 'queued' : 'approved'
		color = C.accent
	} else if (doc.approvalStatus === 'pending') {
		label = 'needs approval'
		color = C.orange
	}

	return (
		<span
			style={{
				fontSize: 10,
				fontWeight: 700,
				textTransform: 'uppercase',
				letterSpacing: '0.06em',
				color,
				flexShrink: 0,
			}}
		>
			{label}
		</span>
	)
}

function ActionChip({
	label,
	icon,
	color,
	onClick,
}: {
	label: string
	icon: React.ReactNode
	color: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 100,
				padding: '6px 10px',
				fontSize: 11,
				fontWeight: 700,
				color,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			{icon}
			{label}
		</button>
	)
}
