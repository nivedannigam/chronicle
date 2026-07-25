const STORAGE_KEY = 'chronicle-onboarding-v1'

export type OnboardingStepId =
	'welcome' | 'family' | 'health' | 'document' | 'ask' | 'complete'

export interface OnboardingProgress {
	completed: boolean
	dismissed: boolean
	stepsCompleted: OnboardingStepId[]
	completedAt: string | null
}

const DEFAULT_PROGRESS: OnboardingProgress = {
	completed: false,
	dismissed: false,
	stepsCompleted: [],
	completedAt: null,
}

let cachedRaw: string | null | undefined
let cachedSnapshot: OnboardingProgress = DEFAULT_PROGRESS

function parseProgress(raw: string | null): OnboardingProgress {
	if (!raw) {
		return DEFAULT_PROGRESS
	}

	try {
		return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) }
	} catch {
		return DEFAULT_PROGRESS
	}
}

function invalidateProgressCache(): void {
	cachedRaw = undefined
}

/** Stable snapshot for useSyncExternalStore — same reference until storage changes. */
export function readOnboardingProgress(): OnboardingProgress {
	const raw = localStorage.getItem(STORAGE_KEY)

	if (raw === cachedRaw) {
		return cachedSnapshot
	}

	cachedRaw = raw
	cachedSnapshot = parseProgress(raw)
	return cachedSnapshot
}

export function writeOnboardingProgress(progress: OnboardingProgress): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
	cachedRaw = JSON.stringify(progress)
	cachedSnapshot = progress
}

export function completeOnboardingStep(
	stepId: OnboardingStepId,
): OnboardingProgress {
	const current = readOnboardingProgress()
	const stepsCompleted = current.stepsCompleted.includes(stepId)
		? current.stepsCompleted
		: [...current.stepsCompleted, stepId]

	const progress: OnboardingProgress = {
		...current,
		stepsCompleted,
		completed: stepId === 'complete',
		completedAt:
			stepId === 'complete' ? new Date().toISOString() : current.completedAt,
	}

	writeOnboardingProgress(progress)
	return progress
}

export function dismissOnboarding(): OnboardingProgress {
	const progress: OnboardingProgress = {
		...readOnboardingProgress(),
		dismissed: true,
		completed: true,
		completedAt: new Date().toISOString(),
	}

	writeOnboardingProgress(progress)
	return progress
}

export function shouldShowOnboarding(): boolean {
	const progress = readOnboardingProgress()
	return !progress.completed && !progress.dismissed
}

export function resetOnboardingForDev(): void {
	localStorage.removeItem(STORAGE_KEY)
	invalidateProgressCache()
}
