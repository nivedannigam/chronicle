import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'
import {
	isStandaloneDisplayMode,
	phoneFrameStyle,
	standaloneLayoutStyle,
} from '@/constants/colors'

export function AppLayout() {
	const standalone = isStandaloneDisplayMode()
	const layout = standalone ? standaloneLayoutStyle : phoneFrameStyle

	return (
		<div style={layout.outer}>
			<div style={layout.inner}>
				<AppHeader />
				<div style={layout.content}>
					<Outlet />
				</div>
				<BottomNavigation />
			</div>
		</div>
	)
}
