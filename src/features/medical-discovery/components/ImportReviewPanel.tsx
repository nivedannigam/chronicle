import { useMemo, useState } from 'react'
import { Check, Loader2, RefreshCw, User, X } from 'lucide-react'
import { C } from '@/constants/colors'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { useImportReview } from '@/features/medical-discovery/hooks/useImportReview'
import { processApprovedImports } from '@/features/medical-discovery/services/import-pipeline.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import type { ReviewDocument } from '@/features/medical-discovery/types/medical-discovery.types'
import { useUser } from '@/features/user/hooks/useUser'

interface ImportReviewPanelProps {
	userId: string
}

export function ImportReviewPanel({ userId }: ImportReviewPanelProps) {
	const review = useImportReview(userId)
	const { profile } = useUser()
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')
	const uniqueMembers = dedupeFamilyMembers(members)
	const [isImporting, setIsImporting] = useState(false)
	const [importMessage, setImportMessage] = useState<string | null>(null)

	const pendingDocuments = useMemo(
		() =>
			review.documents.filter(
				(doc) =>
					doc.approvalStatus === 'pending' && doc.importStatus !== 'failed',
			),
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
		<div
			style={{
				...panelStyle,
				color: C.text,
			}}
		>
			<p
				style={{
					fontSize: 13,
					color: C.textSec,
					margin: '0 0 14px',
					lineHeight: 1.5,
				}}
			>
				{subtitle}
			</p>

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
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: 16,
						fontSize: 13,
						color: C.textMuted,
						textAlign: 'center',
						lineHeight: 1.6,
					}}
				>
					No reports awaiting review. Run a scan above when new files appear in
					your health folder.
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					{pendingDocuments.length > 0 ? (
						<div>
							<p
								style={{
									fontSize: 11,
									fontWeight: 700,
									color: C.textMuted,
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
									margin: '0 0 10px',
								}}
							>
								Pending approval
							</p>
							<div
								style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
							>
								{pendingDocuments.map((doc) => (
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
						</div>
					) : null}

					{failedDocuments.length > 0 ? (
						<div>
							<p
								style={{
									fontSize: 11,
									fontWeight: 700,
									color: C.red,
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
									margin: '0 0 10px',
								}}
							>
								Failed import — retry from Setup
							</p>
							<div
								style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
							>
								{failedDocuments.map((doc) => (
									<ReviewDocumentCard
										key={doc.registryId}
										doc={doc}
										members={uniqueMembers}
										onApprove={() => void review.approve(doc.registryId)}
										onReject={() => void review.reject(doc.registryId)}
										onReassign={(memberId) =>
											void review.reassign(doc.registryId, memberId)
										}
										onRetry={() => void review.retryImport(doc.registryId)}
									/>
								))}
							</div>
						</div>
					) : null}

					{review.documents
						.filter(
							(doc) =>
								!pendingDocuments.includes(doc) &&
								!failedDocuments.includes(doc),
						)
						.map((doc) => (
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

			{importMessage ? (
				<div
					style={{
						fontSize: 12,
						color: importMessage.includes('errors 0') ? C.greenAlt : C.orange,
						lineHeight: 1.5,
						marginTop: 14,
					}}
				>
					{importMessage}
				</div>
			) : null}

			{hasActionableDocuments ? (
				<div
					style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}
				>
					{pendingDocuments.length > 0 ? (
						<button
							type="button"
							onClick={() => void review.approveAllLikely()}
							disabled={review.isLoading || isImporting}
							style={secondaryActionStyle}
						>
							Approve All Likely
						</button>
					) : null}
					<button
						type="button"
						onClick={() => void handleImportApproved()}
						disabled={isImporting || !hasActionableDocuments}
						style={{
							...primaryActionStyle,
							opacity: isImporting || !hasActionableDocuments ? 0.6 : 1,
							cursor:
								isImporting || !hasActionableDocuments
									? 'not-allowed'
									: 'pointer',
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
			) : null}
		</div>
	)
}

const panelStyle = {
	background: C.card,
	border: `1px solid ${C.border}`,
	borderRadius: 20,
	padding: '16px 18px',
} as const

const primaryActionStyle = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: 6,
	background: C.accent,
	border: 'none',
	borderRadius: 100,
	padding: '10px 16px',
	fontSize: 13,
	fontWeight: 700,
	color: C.white,
	fontFamily: 'inherit',
	minHeight: 40,
} as const

const secondaryActionStyle = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	background: C.accentDim,
	border: '1px solid rgba(108,111,255,0.25)',
	borderRadius: 100,
	padding: '10px 16px',
	fontSize: 13,
	fontWeight: 700,
	color: C.accent,
	cursor: 'pointer',
	fontFamily: 'inherit',
	minHeight: 40,
} as const

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
	onRetry,
}: {
	doc: ReviewDocument
	members: ReturnType<typeof dedupeFamilyMembers>
	onApprove: () => void
	onReject: () => void
	onReassign: (memberId: string) => void
	onRetry?: () => void
}) {
	const isPending = doc.approvalStatus === 'pending'
	const isFailed = doc.importStatus === 'failed'

	return (
		<div
			style={{
				background: C.card2,
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
			{isFailed && onRetry ? (
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<ActionChip
						label="Retry import"
						icon={<RefreshCw size={14} />}
						color={C.accent}
						onClick={onRetry}
					/>
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
				background: C.card,
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
