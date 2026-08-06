import { useMemo } from 'react'
import { useHealthContext } from '@/features/health/context/HealthContext'

/** @deprecated Prefer useHealthContext inside HealthLayout. */
export function useHealthProgress() {
	const context = useHealthContext()

	return useMemo(
		() => ({
			...context,
			progress: context.progress,
		}),
		[context],
	)
}
