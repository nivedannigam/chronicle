import type { IdentityDocumentTypeId } from '@/features/identity-knowledge/types/identity-knowledge.types'

export interface IdentityTypeDefinition {
	id: IdentityDocumentTypeId
	label: string
	tier: 'primary' | 'secondary' | 'tertiary'
	hasExpiry: boolean
	keywords: string[]
}

export const IDENTITY_TYPE_REGISTRY: IdentityTypeDefinition[] = [
	{
		id: 'passport',
		label: 'Passport',
		tier: 'primary',
		hasExpiry: true,
		keywords: ['passport', 'passport_', ' pp_', 'indian passport'],
	},
	{
		id: 'pan',
		label: 'PAN',
		tier: 'primary',
		hasExpiry: false,
		keywords: ['pan', 'permanent account'],
	},
	{
		id: 'aadhaar',
		label: 'Aadhaar',
		tier: 'primary',
		hasExpiry: false,
		keywords: ['aadhaar', 'aadhar', 'uid'],
	},
	{
		id: 'driving-licence',
		label: 'Driving Licence',
		tier: 'primary',
		hasExpiry: true,
		keywords: ['driving', 'licence', 'license', ' dl'],
	},
	{
		id: 'birth-certificate',
		label: 'Birth Certificate',
		tier: 'secondary',
		hasExpiry: false,
		keywords: ['birth certificate', 'birth cert'],
	},
	{
		id: 'voter-id',
		label: 'Voter ID',
		tier: 'secondary',
		hasExpiry: false,
		keywords: ['voter', 'election'],
	},
	{
		id: 'marriage-certificate',
		label: 'Marriage Certificate',
		tier: 'secondary',
		hasExpiry: false,
		keywords: ['marriage certificate', 'marriage cert'],
	},
	{
		id: 'oci',
		label: 'OCI',
		tier: 'tertiary',
		hasExpiry: true,
		keywords: ['oci', 'overseas citizen'],
	},
	{
		id: 'other',
		label: 'Other',
		tier: 'tertiary',
		hasExpiry: false,
		keywords: [],
	},
]

const SUB_CATEGORY_MAP: Record<string, IdentityDocumentTypeId> = {
	passport: 'passport',
	aadhaar: 'aadhaar',
	pan: 'pan',
	'driving-licence': 'driving-licence',
	'voter-id': 'voter-id',
}

export function getIdentityTypeDefinition(
	typeId: IdentityDocumentTypeId,
): IdentityTypeDefinition {
	return (
		IDENTITY_TYPE_REGISTRY.find((entry) => entry.id === typeId) ??
		IDENTITY_TYPE_REGISTRY.find((entry) => entry.id === 'other')!
	)
}

export function resolveIdentityTypeId(input: {
	subCategoryId: string | null
	fileName: string
	folderPath?: string | null
	text?: string | null
}): IdentityDocumentTypeId {
	if (input.subCategoryId && SUB_CATEGORY_MAP[input.subCategoryId]) {
		return SUB_CATEGORY_MAP[input.subCategoryId]
	}

	const haystack =
		`${input.fileName} ${input.folderPath ?? ''} ${input.text ?? ''}`.toLowerCase()

	for (const entry of IDENTITY_TYPE_REGISTRY) {
		if (entry.id === 'other') {
			continue
		}

		if (entry.keywords.some((keyword) => haystack.includes(keyword.trim()))) {
			return entry.id
		}
	}

	if (/^pp[_\s-]/i.test(haystack) || /\bpp[_\s-]/i.test(haystack)) {
		return 'passport'
	}

	if (/birth/i.test(haystack)) return 'birth-certificate'
	if (/marriage/i.test(haystack)) return 'marriage-certificate'

	return 'other'
}

export const PRIMARY_IDENTITY_TYPE_IDS = IDENTITY_TYPE_REGISTRY.filter(
	(entry) => entry.tier === 'primary',
).map((entry) => entry.id)
