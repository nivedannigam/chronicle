import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ROUTES, documentsCategoryPath } from '@/constants/routes'
import { useDocumentIntelligence } from '@/features/documents/hooks/useDocumentIntelligence'
import {
	buildDocumentIntelligenceView,
	toDocumentSummary,
} from '@/features/documents/services/document-intelligence.service'
import { getDocumentSignedUrl } from '@/features/documents/services/document-upload.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { getCategoryDisplayMeta } from '@/features/documents/constants/document-category-display'
import {
	DocumentActionChip,
	DocumentActivityRow,
	DocumentAiBadge,
	DocumentModuleChip,
	DocumentSectionLabel,
	DocumentStatusBadge,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { ProfilePageShell } from '@/ui/figma/profile/profile-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'
import { ListSkeleton } from '@/components/common/ListSkeleton'

function formatSource(document: ChronicleDocument): string {
	if (document.source === 'google-drive') {
		return 'Synced from Google Drive · Chronicle intelligence layer'
	}
	return 'Stored in Chronicle · Original in secure vault'
}

export function FigmaDocumentDetailScreen({
	document,
}: {
	document: ChronicleDocument
}) {
	const navigate = useNavigate()
	const { allDocuments, memberNames } = useDocumentIntelligence()

	const intelligence = useMemo(
		() =>
			buildDocumentIntelligenceView({
				document,
				allDocuments,
			}),
		[allDocuments, document],
	)

	const summary = useMemo(
		() => toDocumentSummary(document, memberNames),
		[document, memberNames],
	)

	const categoryMeta = getCategoryDisplayMeta(document.category_id)

	const relatedSummaries = useMemo(() => {
		const byId = new Map(allDocuments.map((item) => [item.id, item]))

		return intelligence.relatedDocuments.map((related) => {
			const source = byId.get(related.id)
			if (!source) {
				return {
					id: related.id,
					title: related.title,
					categoryId: '',
					categoryLabel: related.categoryLabel,
					subCategoryLabel: null,
					ownerLabel: '',
					sourceLabel: '',
					summary: related.reason,
					displayDate: '',
					expiresLabel: null,
					isExpiringSoon: false,
					isExpired: false,
					fileType: 'DOC',
					hasAiSummary: true,
					tags: [],
					relatedModules: [],
					consumerStatus: 'Ready' as const,
					aiDiscoveryLabel: null,
					year: null,
				}
			}

			return {
				...toDocumentSummary(source, memberNames),
				summary: related.reason,
			}
		})
	}, [allDocuments, intelligence.relatedDocuments, memberNames])

	const signedUrlQuery = useQuery({
		queryKey: ['document-signed-url', document.storage_path],
		queryFn: () => getDocumentSignedUrl(document.storage_path),
		enabled: Boolean(document.storage_path),
		staleTime: 55 * 60 * 1000,
	})

	const ask = (prompt: string) =>
		navigate(`${ROUTES.ask}?q=${encodeURIComponent(prompt)}`)

	return (
		<ProfilePageShell
			title={document.title}
			subtitle={`${categoryMeta.label} · ${summary.ownerLabel}`}
			backLabel="Documents"
			onBack={() => navigate(ROUTES.documents)}
		>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 20,
					padding: '18px 18px 16px',
					marginBottom: 16,
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: 12,
					}}
				>
					<span style={{ color: FC.mid, fontSize: 13 }}>
						{formatSource(document)}
					</span>
					<DocumentAiBadge />
				</div>

				{signedUrlQuery.data ? (
					<div
						style={{
							background: FC.raise,
							borderRadius: 14,
							height: 160,
							marginBottom: 14,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							border: `1px solid ${FC.line}`,
						}}
					>
						{document.mime_type.startsWith('image/') ? (
							<img
								src={signedUrlQuery.data}
								alt=""
								style={{
									maxWidth: '100%',
									maxHeight: '100%',
									objectFit: 'contain',
									borderRadius: 10,
								}}
							/>
						) : (
							<button
								type="button"
								onClick={() =>
									window.open(
										signedUrlQuery.data!,
										'_blank',
										'noopener,noreferrer',
									)
								}
								style={{
									background: FC.blue,
									border: 'none',
									borderRadius: 100,
									padding: '10px 18px',
									color: '#fff',
									fontWeight: 700,
									fontSize: 13,
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								Preview document
							</button>
						)}
					</div>
				) : null}

				<p style={{ color: FC.mid, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
					{intelligence.summary}
				</p>
				{intelligence.aiDiscoveryLabel ? (
					<p
						style={{
							color: FC.blue,
							fontSize: 13,
							fontWeight: 600,
							margin: '12px 0 0',
						}}
					>
						{intelligence.aiDiscoveryLabel}
					</p>
				) : null}
			</div>

			{intelligence.relatedModules.length > 0 ? (
				<div style={{ marginBottom: 16 }}>
					<DocumentSectionLabel>Used by</DocumentSectionLabel>
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 8,
							marginTop: 10,
						}}
					>
						{intelligence.relatedModules.map((module) => (
							<DocumentModuleChip
								key={module.moduleId}
								label={module.label}
								onClick={
									module.route ? () => navigate(module.route!) : undefined
								}
							/>
						))}
					</div>
				</div>
			) : null}

			<div style={{ marginBottom: 16 }}>
				<DocumentSectionLabel>Actions</DocumentSectionLabel>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						marginTop: 10,
					}}
				>
					<DocumentActionChip
						label="Summarize"
						onClick={() => ask(`Summarize ${document.title} in plain language`)}
					/>
					<DocumentActionChip
						label="Ask Chronicle"
						onClick={() => ask(`Tell me about ${document.title}`)}
					/>
					{document.tags.length > 0 ? (
						<DocumentStatusBadge status={summary.consumerStatus} />
					) : null}
					{signedUrlQuery.data ? (
						<DocumentActionChip
							label="Open"
							onClick={() =>
								window.open(
									signedUrlQuery.data!,
									'_blank',
									'noopener,noreferrer',
								)
							}
						/>
					) : null}
					{document.source === 'google-drive' ? (
						<DocumentActionChip
							label="Drive settings"
							onClick={() => navigate(ROUTES.profileConnectionsDrive)}
						/>
					) : null}
				</div>
			</div>

			{intelligence.displayFields.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<DocumentSectionLabel>Key details</DocumentSectionLabel>
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							overflow: 'hidden',
							marginTop: 10,
						}}
					>
						{intelligence.displayFields.map((field, index) => (
							<div
								key={field.label}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
									padding: '13px 16px',
									borderBottom:
										index < intelligence.displayFields.length - 1
											? `1px solid ${FC.line}`
											: 'none',
									fontSize: 14,
								}}
							>
								<span style={{ color: FC.mid }}>{field.label}</span>
								<span
									style={{
										color: FC.fg,
										fontWeight: 600,
										textAlign: 'right',
									}}
								>
									{field.value}
								</span>
							</div>
						))}
					</div>
				</div>
			) : null}

			{intelligence.relatedDocuments.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<DocumentSectionLabel>Related documents</DocumentSectionLabel>
					<div style={{ marginTop: 10 }}>
						{relatedSummaries.map((related) => (
							<DocumentSummaryCard key={related.id} document={related} />
						))}
					</div>
				</div>
			) : null}

			{intelligence.activity.length > 0 ? (
				<div style={{ marginBottom: 18 }}>
					<DocumentSectionLabel>Document timeline</DocumentSectionLabel>
					<div style={{ marginTop: 10 }}>
						{intelligence.activity.map((item) => (
							<DocumentActivityRow key={item.id} item={item} />
						))}
					</div>
				</div>
			) : null}

			{document.notes ? (
				<div style={{ marginBottom: 18 }}>
					<DocumentSectionLabel>Notes</DocumentSectionLabel>
					<p
						style={{
							color: FC.mid,
							fontSize: 14,
							lineHeight: 1.6,
							margin: '10px 0 0',
						}}
					>
						{document.notes}
					</p>
				</div>
			) : null}

			<button
				type="button"
				onClick={() => navigate(documentsCategoryPath(document.category_id))}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					cursor: 'pointer',
					fontFamily: 'inherit',
					color: FC.blue,
					fontSize: 13,
					fontWeight: 600,
				}}
			>
				View all {categoryMeta.label} documents
				<ExternalLink size={14} />
			</button>
		</ProfilePageShell>
	)
}

export function FigmaDocumentDetailSkeleton() {
	return (
		<div style={{ padding: '0 22px' }}>
			<ListSkeleton rows={5} />
		</div>
	)
}
