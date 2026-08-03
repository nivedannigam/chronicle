import { HealthImportCenterPage } from '@/features/health/pages/HealthImportCenterPage'

interface ImportCenterProps {
	userId: string
}

/** Consumer Import Center — calm presentation over existing import state. */
export function ImportCenter({ userId }: ImportCenterProps) {
	void userId
	return <HealthImportCenterPage />
}
