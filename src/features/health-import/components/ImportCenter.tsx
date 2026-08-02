import { HealthImportReportList } from '@/features/health-import/components/HealthImportReportList'

interface ImportCenterProps {
	userId: string
}

/** Unified setup report list — replaces legacy registry grid and section stacks. */
export function ImportCenter({ userId }: ImportCenterProps) {
	return <HealthImportReportList userId={userId} />
}
