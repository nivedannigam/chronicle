import type {
	IdentityAttentionItem,
	IdentityDocumentRecord,
} from '@/features/identity-knowledge/types/identity-knowledge.types'
import { getIdentityTypeDefinition } from '@/features/identity-knowledge/services/identity-type.registry'

const MS_DAY = 1000 * 60 * 60 * 24
const ATTENTION_WINDOW_DAYS = 90

function daysUntil(isoDate: string): number | null {
	const parsed = Date.parse(isoDate)

	if (Number.isNaN(parsed)) {
		return null
	}

	return Math.ceil((parsed - Date.now()) / MS_DAY)
}

export function buildIdentityAttentionItems(
	documents: IdentityDocumentRecord[],
): IdentityAttentionItem[] {
	const items: IdentityAttentionItem[] = []

	for (const document of documents) {
		if (document.versionRole === 'previous') {
			continue
		}

		const typeDef = getIdentityTypeDefinition(document.typeId)

		if (!typeDef.hasExpiry || !document.expiryDate) {
			continue
		}

		const remaining = daysUntil(document.expiryDate)

		if (remaining === null) {
			continue
		}

		if (remaining < 0) {
			items.push({
				id: `attention-${document.chronicleDocumentId}`,
				documentId: document.chronicleDocumentId,
				typeLabel: document.typeLabel,
				ownerName: document.ownerName,
				headline: `${document.typeLabel} · ${document.ownerName}`,
				subline: 'Expired',
				tone: 'expired',
			})
			continue
		}

		if (remaining <= ATTENTION_WINDOW_DAYS) {
			items.push({
				id: `attention-${document.chronicleDocumentId}`,
				documentId: document.chronicleDocumentId,
				typeLabel: document.typeLabel,
				ownerName: document.ownerName,
				headline: `${document.typeLabel} · ${document.ownerName}`,
				subline: `Expires in ${remaining} day${remaining === 1 ? '' : 's'}`,
				tone: 'expiring',
			})
		}
	}

	return items
		.sort((a, b) => {
			if (a.tone !== b.tone) {
				return a.tone === 'expired' ? -1 : 1
			}

			return a.headline.localeCompare(b.headline)
		})
		.slice(0, 3)
}

export function countIdentityAttentionItems(
	documents: IdentityDocumentRecord[],
): number {
	return buildIdentityAttentionItems(documents).length
}
