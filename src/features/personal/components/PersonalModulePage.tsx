import { DocumentsProvider } from '@/features/documents/context/DocumentsContext'
import { PersonalPage } from '@/features/personal/components/PersonalPage'

export function PersonalModulePage() {
	return (
		<DocumentsProvider>
			<PersonalPage />
		</DocumentsProvider>
	)
}
