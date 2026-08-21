import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { HealthSourceAssignment } from '@/features/family/types/family.types'
import type { HealthImportStatus } from '@/features/health-import/services/health-import-status.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'
import type { ChronicleModuleId } from '@/features/settings/types/chronicle-module.types'
import type { VehicleKnowledgeRawData } from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'
import {
	assertQaUserId,
	getQaDataset,
	maybeDelayQaProviders,
} from '@/qa/qa-repository'
import { isQaModeEnabled } from '@/qa/qa-mode'
import { QA_FAMILY_ID, QA_USER_ID } from '@/qa/qa-constants'

export function qaInterceptDocuments(
	userId: string,
): ChronicleDocument[] | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	return getQaDataset()?.documents ?? []
}

export function qaInterceptDocument(
	documentId: string,
	userId?: string,
): ChronicleDocument | null {
	if (!isQaModeEnabled()) {
		return null
	}

	const documents = userId
		? qaInterceptDocuments(userId)
		: getQaDataset()?.documents

	return documents?.find((document) => document.id === documentId) ?? null
}

export async function qaInterceptHealthReports(): Promise<
	UploadedHealthReport[] | null
> {
	if (!isQaModeEnabled()) {
		return null
	}

	await maybeDelayQaProviders()
	return getQaDataset()?.healthReports ?? []
}

export async function qaInterceptHealthMetrics(
	userId: string,
): Promise<StoredHealthMetric[] | null> {
	if (!assertQaUserId(userId)) {
		return null
	}

	await maybeDelayQaProviders()
	return getQaDataset()?.healthMetrics ?? []
}

export function qaInterceptFamilyMembers(
	userId: string,
): FamilyMemberWithAliases[] | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	return getQaDataset()?.members ?? []
}

export function qaInterceptFolderAssignments(
	userId: string,
	moduleId: ChronicleModuleId,
): ModuleFolderAssignment[] | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	const assignments = getQaDataset()?.folderAssignments ?? []
	return assignments.filter((assignment) => assignment.moduleId === moduleId)
}

export function qaInterceptVehicleKnowledgeRawData(
	userId: string,
): VehicleKnowledgeRawData | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	return getQaDataset()?.vehicleKnowledge ?? null
}

export function qaInterceptFamily(userId: string) {
	if (!assertQaUserId(userId)) {
		return null
	}

	return {
		id: QA_FAMILY_ID,
		name: 'QA Family',
		ownerUserId: QA_USER_ID,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	}
}

export function qaShouldSimulateAiFailure(): boolean {
	return Boolean(getQaDataset()?.flags.aiFailure)
}

export function qaIsDriveConnected(): boolean {
	return Boolean(getQaDataset()?.flags.driveConnected)
}

export function qaInterceptHealthSourceAssignments(
	userId: string,
): HealthSourceAssignment[] | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	return []
}

export function qaInterceptHealthImportStatus(
	userId: string,
): HealthImportStatus | null {
	if (!assertQaUserId(userId)) {
		return null
	}

	const reports = getQaDataset()?.healthReports ?? []
	const completedReportsCount = reports.filter(
		(report) => report.processing_status === 'completed',
	).length

	return {
		hasImportedReports: completedReportsCount > 0,
		completedReportsCount,
		failedImportsCount: 0,
		importingCount: 0,
		processingCount: reports.filter(
			(report) => report.processing_status === 'processing',
		).length,
		filesFound: 0,
		documentsScanned: 0,
		medicalReportsCount: reports.length,
		needsReviewCount: 0,
		actionableReviewCount: 0,
		importCandidatesCount: 0,
		skippedIgnoredCount: 0,
		lastScanAt: null,
		nextScheduledScanAt: null,
		folders: [],
	}
}
