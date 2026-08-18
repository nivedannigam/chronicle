import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/mobile'
import { ROUTES } from '@/constants/routes'
import { useDocumentsContext } from '@/features/documents/context/DocumentsContext'
import {
	DocumentSectionLabel,
	DocumentSummaryCard,
} from '@/ui/figma/documents/document-ui'
import { ModuleReturnLink } from '@/ui/figma/modules/module-ui'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import { FC } from '@/ui/figma/v2/atoms'
import { ListSkeleton } from '@/components/common/ListSkeleton'

export function PersonalPage() {
	const navigate = useNavigate()
	const { hub, isLoading } = useDocumentsContext()

	const items = useMemo(
		() =>
			hub.allDocuments.filter((document) => document.categoryId === 'personal'),
		[hub.allDocuments],
	)

	return (
		<AppShell>
			<div style={{ padding: '0 22px 24px' }}>
				<ModuleReturnLink onClick={() => navigate(ROUTES.modules)} />
				<FigmaScreenHeader
					title="Personal"
					subtitle="Your personal documents"
					paddingBottom={18}
				/>

				{isLoading ? (
					<ListSkeleton rows={4} />
				) : items.length === 0 ? (
					<p
						style={{ color: FC.dim, fontSize: 14, lineHeight: 1.5, margin: 0 }}
					>
						Personal documents from your Library will appear here.
					</p>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						<DocumentSectionLabel>
							{`${items.length} document${items.length === 1 ? '' : 's'}`}
						</DocumentSectionLabel>
						{items.map((document) => (
							<DocumentSummaryCard key={document.id} document={document} />
						))}
					</div>
				)}
			</div>
		</AppShell>
	)
}
