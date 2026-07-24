import { useNavigate } from 'react-router-dom'
import { C, pagePadding } from '@/constants/colors'
import {
	getComingSoonModules,
	getMoreGridModules,
	MODULE_ROUTES,
} from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import { ChevronRight } from 'lucide-react'

export function MorePage() {
	const navigate = useNavigate()
	const moreGridModules = getMoreGridModules()
	const comingSoonModules = getComingSoonModules()

	const handleModuleClick = (moduleId: string) => {
		const route = MODULE_ROUTES[moduleId]

		if (route) {
			navigate(route)
		}
	}

	return (
		<div style={{ padding: pagePadding.more, color: C.text }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 20,
				}}
			>
				<div
					style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}
				>
					Modules
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.profile)}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 4,
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 600,
						color: C.textSec,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Profile
					<ChevronRight size={14} />
				</button>
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				All Modules
			</div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: 10,
					marginBottom: 28,
				}}
			>
				{moreGridModules.map((mod) => (
					<div
						key={mod.id}
						onClick={() => handleModuleClick(mod.id)}
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 20,
							padding: '18px 0',
							aspectRatio: '1',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 10,
							cursor: 'pointer',
						}}
					>
						<div
							style={{
								width: 42,
								height: 42,
								borderRadius: 14,
								background: `${mod.color}18`,
								border: `1px solid ${mod.color}25`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<mod.icon size={22} color={mod.color} strokeWidth={1.7} />
						</div>
						<span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
							{mod.name}
						</span>
					</div>
				))}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Coming Soon
			</div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-around',
					marginBottom: 28,
				}}
			>
				{comingSoonModules.map((mod) => (
					<div
						key={mod.id}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							opacity: 0.35,
						}}
					>
						<div
							style={{
								width: 52,
								height: 52,
								borderRadius: 16,
								background: C.card,
								border: `1px solid ${C.border}`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<mod.icon size={22} color={C.textMuted} strokeWidth={1.5} />
						</div>
						<span style={{ fontSize: 12, color: C.textMuted }}>{mod.name}</span>
					</div>
				))}
			</div>
		</div>
	)
}
