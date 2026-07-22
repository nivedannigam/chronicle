import { Outlet } from 'react-router-dom'
import { StatusBar } from '@/components/layout/StatusBar'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'
import { phoneFrameStyle } from '@/constants/colors'

export function AppLayout() {
	return (
		<div style={phoneFrameStyle.outer}>
			<div style={phoneFrameStyle.inner}>
				<StatusBar />
				<div style={phoneFrameStyle.content}>
					<Outlet />
				</div>
				<BottomNavigation />
			</div>
		</div>
	)
}
