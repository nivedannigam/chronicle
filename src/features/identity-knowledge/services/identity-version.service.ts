import type {
	IdentityDocumentRecord,
	IdentityVersionRole,
} from '@/features/identity-knowledge/types/identity-knowledge.types'

const STORAGE_PREFIX = 'chronicle:identity-version-overrides:'

export interface IdentityVersionOverride {
	documentId: string
	role: IdentityVersionRole
}

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`
}

export function readIdentityVersionOverrides(
	userId: string,
): Record<string, IdentityVersionRole> {
	if (typeof window === 'undefined') {
		return {}
	}

	try {
		const raw = window.localStorage.getItem(storageKey(userId))
		return raw ? (JSON.parse(raw) as Record<string, IdentityVersionRole>) : {}
	} catch {
		return {}
	}
}

export function setIdentityVersionOverride(input: {
	userId: string
	documentId: string
	role: IdentityVersionRole
}): void {
	if (typeof window === 'undefined') {
		return
	}

	const overrides = readIdentityVersionOverrides(input.userId)
	overrides[input.documentId] = input.role
	window.localStorage.setItem(
		storageKey(input.userId),
		JSON.stringify(overrides),
	)
}

function compareDocumentsForCurrent(
	a: IdentityDocumentRecord,
	b: IdentityDocumentRecord,
): number {
	const expiryA = a.expiryDate ? Date.parse(a.expiryDate) : 0
	const expiryB = b.expiryDate ? Date.parse(b.expiryDate) : 0

	if (expiryA !== expiryB) {
		return expiryB - expiryA
	}

	const issueA = a.issueDate ? Date.parse(a.issueDate) : 0
	const issueB = b.issueDate ? Date.parse(b.issueDate) : 0

	if (issueA !== issueB) {
		return issueB - issueA
	}

	return Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)
}

export function assignVersionRoles(input: {
	userId: string
	documents: IdentityDocumentRecord[]
}): IdentityDocumentRecord[] {
	const overrides = readIdentityVersionOverrides(input.userId)
	const groups = new Map<string, IdentityDocumentRecord[]>()

	for (const document of input.documents) {
		const key = `${document.ownerMemberId ?? 'unknown'}:${document.typeId}`
		const group = groups.get(key) ?? []
		group.push(document)
		groups.set(key, group)
	}

	const next: IdentityDocumentRecord[] = []

	for (const group of groups.values()) {
		if (group.length === 1) {
			const only = group[0]!
			const override = overrides[only.chronicleDocumentId]
			next.push({
				...only,
				versionRole: override ?? 'current',
				status:
					override === 'previous'
						? only.status
						: only.status === 'review_needed'
							? only.status
							: only.status,
			})
			continue
		}

		const sorted = [...group].sort(compareDocumentsForCurrent)
		const forcedCurrent = sorted.find(
			(document) => overrides[document.chronicleDocumentId] === 'current',
		)
		const forcedPrevious = new Set(
			sorted
				.filter(
					(document) => overrides[document.chronicleDocumentId] === 'previous',
				)
				.map((document) => document.chronicleDocumentId),
		)

		let currentId = forcedCurrent?.chronicleDocumentId ?? null

		if (!currentId) {
			const candidate = sorted.find(
				(document) => !forcedPrevious.has(document.chronicleDocumentId),
			)
			currentId =
				candidate?.chronicleDocumentId ?? sorted[0]!.chronicleDocumentId
		}

		const hasConflict =
			sorted.filter(
				(document) => !forcedPrevious.has(document.chronicleDocumentId),
			).length > 1 && !forcedCurrent

		for (const document of sorted) {
			let versionRole: IdentityVersionRole = 'previous'

			if (document.chronicleDocumentId === currentId) {
				versionRole = hasConflict ? 'unknown' : 'current'
			} else if (forcedPrevious.has(document.chronicleDocumentId)) {
				versionRole = 'previous'
			} else if (overrides[document.chronicleDocumentId]) {
				versionRole = overrides[document.chronicleDocumentId]!
			}

			next.push({
				...document,
				versionRole,
				status: versionRole === 'unknown' ? 'review_needed' : document.status,
			})
		}
	}

	return next
}
