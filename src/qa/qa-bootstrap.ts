import { clearQaStorage, isQaModeEnabled, setQaScenario } from '@/qa/qa-mode'
import { getQaDataset, resetQaDataset, seedQaDataset } from '@/qa/qa-repository'
import type { QaScenario } from '@/qa/qa-constants'
import { getLastAskDebugInfo } from '@/features/ask/services/ai-ask-reasoning.engine'

declare global {
	interface Window {
		__CHRONICLE_QA__?: {
			clear: () => void
			seed: (scenario?: QaScenario) => void
			reset: (scenario?: QaScenario) => void
			setScenario: (scenario: QaScenario) => void
			getLastAskDebug: () => ReturnType<typeof getLastAskDebugInfo>
		}
	}
}

export function bootstrapQaHarness(): void {
	if (!isQaModeEnabled() || typeof window === 'undefined') {
		return
	}

	window.__CHRONICLE_QA__ = {
		clear: () => {
			clearQaStorage()
		},
		seed: (scenario: QaScenario = 'FULL') => {
			seedQaDataset(scenario)
		},
		reset: (scenario: QaScenario = 'FULL') => {
			resetQaDataset(scenario)
		},
		setScenario: (scenario: QaScenario) => {
			setQaScenario(scenario)
			resetQaDataset(scenario)
		},
		getLastAskDebug: () => getLastAskDebugInfo(),
	}

	getQaDataset()
}
