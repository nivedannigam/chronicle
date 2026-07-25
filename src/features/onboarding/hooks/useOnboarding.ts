import { useCallback, useSyncExternalStore } from 'react'
import {
	completeOnboardingStep,
	dismissOnboarding,
	readOnboardingProgress,
	type OnboardingStepId,
} from '@/features/onboarding/services/onboarding.service'

function subscribe(onStoreChange: () => void) {
	window.addEventListener('storage', onStoreChange)
	window.addEventListener('chronicle-onboarding-change', onStoreChange)

	return () => {
		window.removeEventListener('storage', onStoreChange)
		window.removeEventListener('chronicle-onboarding-change', onStoreChange)
	}
}

function notifyChange() {
	window.dispatchEvent(new Event('chronicle-onboarding-change'))
}

export function useOnboarding() {
	const progress = useSyncExternalStore(
		subscribe,
		readOnboardingProgress,
		readOnboardingProgress,
	)

	const isVisible = !progress.completed && !progress.dismissed

	const completeStep = useCallback((stepId: OnboardingStepId) => {
		completeOnboardingStep(stepId)
		notifyChange()
	}, [])

	const dismiss = useCallback(() => {
		dismissOnboarding()
		notifyChange()
	}, [])

	return {
		progress,
		isVisible,
		completeStep,
		dismiss,
	}
}
