import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
	documentPath,
	identityAskPath,
	identityMemberPath,
	ROUTES,
} from '@/constants/routes'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getDocumentSignedUrl } from '@/features/documents/services/document-upload.service'
import { useIdentityContext } from '@/features/identity/context/useIdentityContext'
import {
	buildIdentityStatusLabel,
	setIdentityVersionOverride,
} from '@/features/identity-knowledge'
import {
	IdentityBackLink,
	IdentityOriginalDocumentBlock,
	IdentitySecondaryMenu,
	IdentityStatusPill,
} from '@/ui/figma/identity/identity-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/v2/atoms'
import type { IdentityDocumentRecord } from '@/features/identity-knowledge/types/identity-knowledge.types'

function formatDisplayDate(value: string | null): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export function IdentityDocumentDetailPage() {
	const navigate = useNavigate()
	const { documentId = '' } = useParams()
	const { knowledge } = useIdentityContext()

	const record = useMemo(
		() =>
			knowledge.documents.find((doc) => doc.chronicleDocumentId === documentId),
		[knowledge.documents, documentId],
	)

	if (!record) {
		return (
			<div>
				<IdentityBackLink
					label="Identity"
					onClick={() => navigate(ROUTES.identity)}
				/>
				<p style={{ color: FC.dim, fontSize: 14 }}>Document not found.</p>
			</div>
		)
	}

	return <IdentityDocumentDetailView key={documentId} record={record} />
}

function IdentityDocumentDetailView({
	record,
}: {
	record: IdentityDocumentRecord
}) {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { refetch } = useIdentityContext()
	const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>(
		{},
	)
	const [viewerOpen, setViewerOpen] = useState(false)

	const signedUrlQuery = useQuery({
		queryKey: ['identity-document-signed-url', record.storagePath],
		queryFn: () => getDocumentSignedUrl(record.storagePath),
		enabled: Boolean(record.storagePath),
		staleTime: 55 * 60 * 1000,
	})

	const backLabel = record.ownerMemberId
		? `${record.ownerName}'s documents`
		: 'Identity'

	const toggleReveal = (field: string) => {
		setRevealedFields((current) => ({
			...current,
			[field]: !current[field],
		}))
	}

	const handleMarkPrevious = () => {
		if (!userId) return
		setIdentityVersionOverride({
			userId,
			documentId: record.chronicleDocumentId,
			role: 'previous',
		})
		void refetch()
	}

	const handleMarkCurrent = () => {
		if (!userId) return
		setIdentityVersionOverride({
			userId,
			documentId: record.chronicleDocumentId,
			role: 'current',
		})
		void refetch()
	}

	return (
		<div style={{ paddingBottom: 28 }}>
			<IdentityBackLink
				label={backLabel}
				onClick={() =>
					record.ownerMemberId
						? navigate(identityMemberPath(record.ownerMemberId))
						: navigate(ROUTES.identity)
				}
			/>

			<FigmaScreenHeader title={record.typeLabel} subtitle={record.ownerName} />

			<IdentityStatusPill label={buildIdentityStatusLabel(record)} />

			<p
				style={{
					color: FC.mid,
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					margin: '0 0 10px',
				}}
			>
				Key details
			</p>

			<div style={{ marginBottom: 20 }}>
				{record.documentNumber ? (
					<DetailRow
						label="Document number"
						value={
							revealedFields.number
								? record.documentNumber
								: (record.maskedDocumentNumber ?? '••••')
						}
						onToggleReveal={() => toggleReveal('number')}
						revealable
					/>
				) : null}
				{record.nationality ? (
					<DetailRow label="Nationality" value={record.nationality} />
				) : null}
				{formatDisplayDate(record.dateOfBirth) ? (
					<DetailRow
						label="Date of birth"
						value={formatDisplayDate(record.dateOfBirth)!}
					/>
				) : null}
				{formatDisplayDate(record.issueDate) ? (
					<DetailRow
						label="Issued"
						value={formatDisplayDate(record.issueDate)!}
					/>
				) : null}
				{formatDisplayDate(record.expiryDate) ? (
					<DetailRow
						label="Expires"
						value={formatDisplayDate(record.expiryDate)!}
					/>
				) : null}
			</div>

			<p
				style={{
					color: FC.mid,
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					margin: '0 0 10px',
				}}
			>
				Chronicle summary
			</p>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 22px',
				}}
			>
				{record.summary}
			</p>

			<p
				style={{
					color: FC.mid,
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					margin: '0 0 10px',
				}}
			>
				Original document
			</p>
			<IdentityOriginalDocumentBlock
				fileName={record.fileName}
				thumbnailUrl={
					record.mimeType.startsWith('image/') ? signedUrlQuery.data : null
				}
				onView={() => setViewerOpen(true)}
			/>

			<button
				type="button"
				onClick={() =>
					navigate(
						identityAskPath({
							q: `Tell me about this ${record.typeLabel.toLowerCase()}`,
							documentId: record.chronicleDocumentId,
						}),
					)
				}
				style={{
					marginTop: 18,
					background: 'none',
					border: 'none',
					padding: 0,
					color: C.accentBlue,
					fontSize: 14,
					fontWeight: 600,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				Ask about this document →
			</button>

			<IdentitySecondaryMenu
				onMarkPrevious={
					record.versionRole !== 'previous' ? handleMarkPrevious : undefined
				}
				onMarkCurrent={
					record.versionRole === 'previous' ? handleMarkCurrent : undefined
				}
				onOpenLibrary={() => navigate(documentPath(record.chronicleDocumentId))}
			/>

			{viewerOpen && signedUrlQuery.data ? (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.92)',
						zIndex: 200,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '16px 18px',
						}}
					>
						<span style={{ color: FC.fg, fontSize: 14, fontWeight: 600 }}>
							{record.fileName}
						</span>
						<button
							type="button"
							onClick={() => setViewerOpen(false)}
							style={{
								background: 'none',
								border: 'none',
								color: FC.fg,
								fontSize: 14,
								cursor: 'pointer',
							}}
						>
							Close
						</button>
					</div>
					<div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
						{record.mimeType.includes('pdf') ? (
							<iframe
								title={record.fileName}
								src={signedUrlQuery.data}
								style={{
									width: '100%',
									height: '100%',
									minHeight: '70vh',
									border: 'none',
									borderRadius: 12,
								}}
							/>
						) : (
							<img
								src={signedUrlQuery.data}
								alt={record.fileName}
								style={{
									width: '100%',
									height: 'auto',
									borderRadius: 12,
								}}
							/>
						)}
					</div>
				</div>
			) : viewerOpen && signedUrlQuery.isLoading ? (
				<p style={{ color: FC.dim, fontSize: 13 }}>Opening document…</p>
			) : viewerOpen && signedUrlQuery.isError ? (
				<p style={{ color: FC.dim, fontSize: 13 }}>
					Could not open this document.
				</p>
			) : null}
		</div>
	)
}

function DetailRow({
	label,
	value,
	revealable,
	onToggleReveal,
}: {
	label: string
	value: string
	revealable?: boolean
	onToggleReveal?: () => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 16,
				padding: '11px 0',
				borderBottom: `1px solid ${FC.line}`,
			}}
		>
			<span style={{ color: FC.mid, fontSize: 13 }}>{label}</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<span
					style={{
						color: FC.fg,
						fontSize: 13,
						fontWeight: 600,
						textAlign: 'right',
					}}
				>
					{value}
				</span>
				{revealable && onToggleReveal ? (
					<button
						type="button"
						onClick={onToggleReveal}
						style={{
							background: 'none',
							border: 'none',
							padding: 4,
							cursor: 'pointer',
							color: FC.mid,
							fontSize: 12,
							fontWeight: 600,
						}}
					>
						{value.includes('•') ? 'Show' : 'Hide'}
					</button>
				) : null}
			</div>
		</div>
	)
}
