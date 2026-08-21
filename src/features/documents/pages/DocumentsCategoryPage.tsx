import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { getCategoryDisplayMeta } from '@/features/documents/constants/document-category-display'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import {
	DocumentSectionLabel,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { ProfilePageShell } from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'
import { ListSkeleton } from '@/components/common/ListSkeleton'

export function DocumentsCategoryPage() {
	const navigate = useNavigate()
	const { categoryId = '' } = useParams()
	const { selectedMember } = useFamilyContext()
	const { hub, allDocuments, isLoading } = useDocumentsContext()
	const meta = getCategoryDisplayMeta(categoryId)

	const items = useMemo(() => {
		return hub.allDocuments.filter(
			(document) => document.categoryId === categoryId,
		)
	}, [categoryId, hub.allDocuments])

	const totalInCategory = useMemo(
		() =>
			allDocuments.filter((document) => document.category_id === categoryId)
				.length,
		[allDocuments, categoryId],
	)

	const subtitle = useMemo(() => {
		if (selectedMember && totalInCategory !== items.length) {
			return `${items.length} for ${selectedMember.displayName} · ${totalInCategory} for all family`
		}

		return `${items.length} document${items.length === 1 ? '' : 's'} in this category`
	}, [items.length, selectedMember, totalInCategory])

	if (isLoading) {
		return (
			<div style={{ padding: '0 22px' }}>
				<ListSkeleton rows={4} />
			</div>
		)
	}

	return (
		<ProfilePageShell
			title={meta.label}
			subtitle={subtitle}
			backLabel="Documents"
			onBack={() => navigate(ROUTES.documents)}
		>
			{items.length === 0 ? (
				<p style={{ color: FC.mid, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
					No {meta.label.toLowerCase()} documents yet. They will appear here
					when imported from Google Drive or added to Chronicle.
				</p>
			) : (
				<div>
					<div style={{ marginBottom: 12 }}>
						<DocumentSectionLabel>{meta.label}</DocumentSectionLabel>
					</div>
					{items.map((document) => (
						<DocumentSummaryCard
							key={document.id}
							document={document}
							showActions
						/>
					))}
				</div>
			)}
		</ProfilePageShell>
	)
}
