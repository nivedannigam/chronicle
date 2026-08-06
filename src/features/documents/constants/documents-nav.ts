import { ROUTES } from '@/constants/routes'

export const DOCUMENT_NAV_ITEMS = [
	{ label: 'Home', path: ROUTES.documents },
	{ label: 'Library', path: ROUTES.documentsLibrary },
	{ label: 'Expiring', path: ROUTES.documentsExpiring },
] as const
