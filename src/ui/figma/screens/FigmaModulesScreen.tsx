import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getHubComingSoonModules } from '@/constants/modules'
import { useModuleHubCards } from '@/features/modules/hooks/useModuleHubCards'
import {
	ModuleComingSoonCard,
	ModuleHubCard,
	ModuleHubSkeleton,
	ModuleSectionLabel,
	ModulesScreenHeader,
} from '@/ui/figma/modules/module-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaModulesScreen() {
	const navigate = useNavigate()
	const { primaryCards, secondaryCards, isLoading } = useModuleHubCards()
	const comingSoonModules = getHubComingSoonModules()

	const handleNavigate = (path: string) => {
		navigate(path)
	}

	return (
		<div
			style={{
				padding: '8px 22px 28px',
				maxWidth: 720,
				margin: '0 auto',
			}}
		>
			<ModulesScreenHeader />

			{isLoading ? (
				<ModuleHubSkeleton />
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{primaryCards.map((card) => (
						<ModuleHubCard
							key={card.id}
							card={card}
							onNavigate={handleNavigate}
						/>
					))}
				</div>
			)}

			{secondaryCards.length > 0 ? (
				<div style={{ marginTop: 18 }}>
					{secondaryCards.map((card) => (
						<ModuleHubCard
							key={card.id}
							card={card}
							onNavigate={handleNavigate}
						/>
					))}
				</div>
			) : null}

			{comingSoonModules.length > 0 ? (
				<div style={{ marginTop: 28 }}>
					<ModuleSectionLabel>Coming later</ModuleSectionLabel>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
							gap: 10,
						}}
					>
						{comingSoonModules.map((module) => (
							<ModuleComingSoonCard key={module.id} module={module} />
						))}
					</div>
				</div>
			) : null}

			<p
				style={{
					color: FC.dim,
					fontSize: 12,
					lineHeight: 1.5,
					margin: '24px 0 0',
				}}
			>
				All your documents live in{' '}
				<button
					type="button"
					onClick={() => navigate(ROUTES.documents)}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						color: FC.mid,
						fontSize: 12,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textDecoration: 'underline',
						textUnderlineOffset: 2,
					}}
				>
					Library
				</button>
				. Ask Chronicle anything from the Ask tab.
			</p>
		</div>
	)
}

/** @deprecated Use FigmaModulesScreen */
export const FigmaMoreScreen = FigmaModulesScreen
