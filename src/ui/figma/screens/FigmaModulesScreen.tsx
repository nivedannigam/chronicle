import { useNavigate } from 'react-router-dom'
import { getActiveLifeModules, getComingSoonModules } from '@/constants/modules'
import { useFederatedLibrary } from '@/features/documents/hooks/useFederatedLibrary'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'
import {
	ModuleComingSoonCard,
	ModuleLauncherCard,
} from '@/ui/figma/modules/module-ui'
import { FC, FigmaLbl } from '@/ui/figma/v2/atoms'

export function FigmaModulesScreen() {
	const navigate = useNavigate()
	const federated = useFederatedLibrary()
	const activeModules = getActiveLifeModules()
	const comingSoonModules = getComingSoonModules()

	const documentCountByModule = new Map<string, number>(
		federated.moduleSummaries.map((summary) => [
			summary.moduleId,
			summary.documentCount,
		]),
	)

	return (
		<div style={{ padding: '0 22px 24px' }}>
			<FigmaScreenHeader
				title="Modules"
				subtitle="These are the things Chronicle can manage for you"
				paddingBottom={22}
			/>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Active</FigmaLbl>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{activeModules.map((module) => (
						<ModuleLauncherCard
							key={module.id}
							module={module}
							documentCount={documentCountByModule.get(module.id)}
							onClick={() => {
								if (module.route) {
									navigate(module.route)
								}
							}}
						/>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 22 }}>
				<div style={{ marginBottom: 12 }}>
					<FigmaLbl>Coming Soon</FigmaLbl>
				</div>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
				>
					{comingSoonModules.map((module) => (
						<ModuleComingSoonCard key={module.id} module={module} />
					))}
				</div>
			</div>

			<p style={{ color: FC.dim, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
				Looking for all your files? Open Library from the bottom navigation.
			</p>
		</div>
	)
}

/** @deprecated Use FigmaModulesScreen */
export const FigmaMoreScreen = FigmaModulesScreen
