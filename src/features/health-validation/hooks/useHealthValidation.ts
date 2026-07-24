import { useCallback, useState } from 'react'
import {
	rerunReportOcr,
	runHealthDataValidation,
} from '@/features/health-validation/services/health-data-validator.service'
import type { HealthValidationReport } from '@/features/health-validation/types/health-validation.types'

export function useHealthValidation(userId: string | undefined) {
	const [report, setReport] = useState<HealthValidationReport | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const runValidation = useCallback(async () => {
		if (!userId) {
			return null
		}

		setIsRunning(true)
		setError(null)

		try {
			const result = await runHealthDataValidation(userId)
			setReport(result)
			return result
		} catch (validationError) {
			const message =
				validationError instanceof Error
					? validationError.message
					: 'Validation failed'
			setError(message)
			return null
		} finally {
			setIsRunning(false)
		}
	}, [userId])

	const rerunOcr = useCallback(
		async (reportId: string) => {
			if (!userId) {
				return
			}

			await rerunReportOcr(userId, reportId)
			await runValidation()
		},
		[userId, runValidation],
	)

	return {
		report,
		isRunning,
		error,
		runValidation,
		rerunOcr,
	}
}
