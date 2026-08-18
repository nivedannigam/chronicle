import type { IdentityDocumentRecord } from '@/features/identity-knowledge/types/identity-knowledge.types'
import { getIdentityTypeDefinition } from '@/features/identity-knowledge/services/identity-type.registry'

function formatDisplayDate(value: string): string {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return date.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		day: 'numeric',
	})
}

function formatMonthYear(value: string): string {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
	})
}

export function buildIdentityDocumentSummary(
	document: IdentityDocumentRecord,
): string {
	const owner = document.ownerName
	const parts: string[] = []

	if (document.nationality && document.typeId === 'passport') {
		parts.push(`${document.nationality} passport for ${owner}`)
	} else {
		parts.push(`${document.typeLabel} for ${owner}`)
	}

	if (document.status === 'valid_until' && document.expiryDate) {
		parts.push(`valid until ${formatDisplayDate(document.expiryDate)}`)
	} else if (document.status === 'expires_soon' && document.expiryDate) {
		parts.push(`expires ${formatMonthYear(document.expiryDate)}`)
	} else if (document.status === 'expired') {
		parts.push('expired')
	} else if (document.status === 'on_file') {
		const typeDef = getIdentityTypeDefinition(document.typeId)
		parts.push(typeDef.hasExpiry ? 'on file' : 'on file')
	} else if (document.status === 'still_organizing') {
		parts.push('still being organized')
	} else if (document.status === 'needs_clearer_copy') {
		parts.push('needs a clearer copy')
	} else if (document.status === 'review_needed') {
		parts.push('review needed')
	}

	const sentence = parts.join(', ')
	return sentence.endsWith('.') ? sentence : `${sentence}.`
}

export function buildIdentityStatusLabel(
	document: IdentityDocumentRecord,
): string {
	switch (document.status) {
		case 'valid_until':
			return document.expiryDate
				? `Valid until ${formatDisplayDate(document.expiryDate)}`
				: 'On file'
		case 'expires_soon':
			return document.expiryDate
				? `Expires ${formatMonthYear(document.expiryDate)}`
				: 'Expires soon'
		case 'expired':
			return 'Expired'
		case 'still_organizing':
			return 'Still organizing'
		case 'needs_clearer_copy':
			return 'Needs a clearer copy'
		case 'review_needed':
			return 'Review needed'
		default:
			return 'On file'
	}
}

export function buildWalletChipStatusLine(
	document: IdentityDocumentRecord,
): string | null {
	if (document.versionRole === 'previous') {
		return null
	}

	if (document.status === 'expires_soon' || document.status === 'valid_until') {
		return document.expiryDate
			? `Expires ${formatMonthYear(document.expiryDate)}`
			: null
	}

	if (document.status === 'expired') {
		return 'Expired'
	}

	if (
		document.status === 'still_organizing' ||
		document.status === 'needs_clearer_copy' ||
		document.status === 'review_needed'
	) {
		return buildIdentityStatusLabel(document)
	}

	return null
}
