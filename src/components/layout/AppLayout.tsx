import { Outlet } from 'react-router-dom'
import { FigmaPhoneShell } from '@/ui/figma/shell/FigmaPhoneShell'

export function AppLayout() {
	return (
		<FigmaPhoneShell>
			<Outlet />
		</FigmaPhoneShell>
	)
}
