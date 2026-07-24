import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'
import { phoneFrameStyle } from '@/constants/colors'

export function AppLayout() {
	return (
		<div style={phoneFrameStyle.outer}>
			<div style={phoneFrameStyle.inner}>
				<AppHeader />
				<div style={phoneFrameStyle.content}>
					<Outlet />
				</div>
				<BottomNavigation />
			</div>
		</div>
	)
}
