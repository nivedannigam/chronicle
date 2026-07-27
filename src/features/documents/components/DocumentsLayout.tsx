import { Outlet } from 'react-router-dom'
import { C } from '@/constants/colors'

export function DocumentsLayout() {
	return (
		<div style={{ color: C.text }}>
			<Outlet />
		</div>
	)
}
