import { useNavigate } from 'react-router-dom'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'
import { FigmaInsuranceTimelineView } from '@/ui/figma/insurance/FigmaInsuranceTimelineView'

export function InsuranceTimelinePage() {
	const navigate = useNavigate()
	const { timeline, hasPolicies, isLoading, isError, refetch } =
		useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load your insurance story"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (timeline.totalEvents === 0) {
		return (
			<InsuranceHomeEmptyState
				emoji="✨"
				title={INSURANCE_COPY.emptyTimelineTitle}
				body={INSURANCE_COPY.emptyTimelineBody}
				primaryLabel={
					hasPolicies
						? INSURANCE_COPY.viewPolicies
						: INSURANCE_COPY.connectFolder
				}
				onPrimary={() =>
					navigate(
						hasPolicies ? ROUTES.insurancePolicies : ROUTES.insuranceSettings,
					)
				}
			/>
		)
	}

	return <FigmaInsuranceTimelineView />
}
