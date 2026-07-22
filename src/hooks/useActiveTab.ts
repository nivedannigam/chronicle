import { useLocation, useNavigate } from 'react-router-dom'
import { pathFromTab, tabFromPath } from '@/lib/navigation'
import type { Tab } from '@/types/navigation'

export function useActiveTab() {
	const navigate = useNavigate()
	const location = useLocation()
	const tab = tabFromPath(location.pathname)

	const setTab = (nextTab: Tab) => {
		navigate(pathFromTab(nextTab))
	}

	return { tab, setTab, navigate }
}
