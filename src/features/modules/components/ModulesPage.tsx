import { DocumentsProvider } from '@/features/documents/context/DocumentsContext'
import { FigmaModulesScreen } from '@/ui/figma/screens/FigmaModulesScreen'

export function ModulesPage() {
	return (
		<DocumentsProvider>
			<FigmaModulesScreen />
		</DocumentsProvider>
	)
}
