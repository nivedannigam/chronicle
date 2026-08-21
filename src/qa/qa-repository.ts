import type { QaDataset } from '@/qa/seed/build-qa-dataset'
import {
	buildEmptyQaDataset,
	buildErrorQaDataset,
	buildFullQaDataset,
	buildLoadingQaDataset,
} from '@/qa/seed/build-qa-dataset'
import {
	QA_STORAGE_PREFIX,
	QA_USER_ID,
	type QaScenario,
} from '@/qa/qa-constants'
import { getQaScenario, isQaModeEnabled, setQaScenario } from '@/qa/qa-mode'

const DATASET_KEY = `${QA_STORAGE_PREFIX}dataset`

function readStoredDataset(): QaDataset | null {
	if (typeof window === 'undefined') {
		return null
	}

	const raw = window.localStorage.getItem(DATASET_KEY)

	if (!raw) {
		return null
	}

	try {
		return JSON.parse(raw) as QaDataset
	} catch {
		return null
	}
}

function writeStoredDataset(dataset: QaDataset): void {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(DATASET_KEY, JSON.stringify(dataset))
}

export function buildDatasetForScenario(scenario: QaScenario): QaDataset {
	switch (scenario) {
		case 'EMPTY':
			return buildEmptyQaDataset()
		case 'ERROR':
			return buildErrorQaDataset()
		case 'LOADING':
			return buildLoadingQaDataset()
		case 'FULL':
		default:
			return buildFullQaDataset()
	}
}

export function seedQaDataset(scenario: QaScenario = 'FULL'): QaDataset {
	if (!isQaModeEnabled()) {
		return buildFullQaDataset()
	}

	setQaScenario(scenario)
	const dataset = buildDatasetForScenario(scenario)
	writeStoredDataset(dataset)
	return dataset
}

export function resetQaDataset(scenario: QaScenario = 'FULL'): QaDataset {
	return seedQaDataset(scenario)
}

export function getQaDataset(): QaDataset | null {
	if (!isQaModeEnabled()) {
		return null
	}

	const existing = readStoredDataset()

	if (existing) {
		return existing
	}

	return seedQaDataset(getQaScenario())
}

export function assertQaUserId(userId: string | undefined): boolean {
	return isQaModeEnabled() && userId === QA_USER_ID
}

export async function maybeDelayQaProviders(): Promise<void> {
	const dataset = getQaDataset()
	const delayMs = dataset?.flags.providerDelayMs ?? 0

	if (delayMs <= 0) {
		return
	}

	await new Promise((resolve) => setTimeout(resolve, delayMs))
}
