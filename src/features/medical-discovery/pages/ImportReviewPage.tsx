import { Navigate } from 'react-router-dom'
import { healthSettingsSection } from '@/constants/routes'

/** @deprecated Review is embedded in Health Setup */
export function ImportReviewPage() {
	return <Navigate to={healthSettingsSection('review')} replace />
}
