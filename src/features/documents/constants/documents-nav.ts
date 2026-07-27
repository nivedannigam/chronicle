import { ROUTES } from '@/constants/routes'

export const DOCUMENT_NAV_ITEMS = [
	{ label: 'Library', path: ROUTES.documents },
	{ label: 'Expiring', path: ROUTES.documentsExpiring },
] as const
