import { useNavigate } from 'react-router-dom'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import { INSURANCE_COPY } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import { FigmaInsuranceHomeView } from '@/ui/figma/insurance/FigmaInsuranceHomeView'
import {
	InsuranceHomeEmptyState,
	InsuranceHomeSkeleton,
} from '@/features/insurance/components/InsuranceHomeStates'

function resolveHomeEmptyState(setupStatus: string) {
	switch (setupStatus) {
		case 'connect_drive':
		case 'assign_folder':
			return {
				title: INSURANCE_COPY.emptyTitle,
				body: INSURANCE_COPY.emptyBody,
				primaryLabel: INSURANCE_COPY.connectFolder,
			}
		case 'scanning':
		case 'processing':
			return {
				title: 'Organizing your insurance folder',
				body: 'Chronicle is scanning your connected folder and preparing policies for review.',
				primaryLabel: 'View settings',
			}
		case 'partial':
			return {
				title: 'Insurance documents found',
				body: 'Your policies are being organized. Check back shortly or rescan from settings.',
				primaryLabel: 'Open settings',
			}
		case 'empty_folder':
			return {
				title: 'No insurance documents found',
				body: 'Your folder is connected but no policy PDFs were discovered yet.',
				primaryLabel: 'Rescan folder',
			}
		default:
			return {
				title: INSURANCE_COPY.emptyTitle,
				body: INSURANCE_COPY.emptyBody,
				primaryLabel: INSURANCE_COPY.connectFolder,
			}
	}
}

export function InsuranceHomePage() {
	const navigate = useNavigate()
	const { home, hasPolicies, setupStatus, isLoading, isError, refetch } =
		useInsuranceContext()

	if (isLoading) {
		return <InsuranceHomeSkeleton />
	}

	if (isError) {
		return (
			<InsuranceHomeEmptyState
				emoji="⚠️"
				title="Could not load insurance data"
				body="Check your connection and try again."
				primaryLabel="Try again"
				onPrimary={() => void refetch()}
			/>
		)
	}

	if (!hasPolicies) {
		const emptyState = resolveHomeEmptyState(setupStatus)

		return (
			<InsuranceHomeEmptyState
				emoji="🛡️"
				title={emptyState.title}
				body={emptyState.body}
				primaryLabel={emptyState.primaryLabel}
				onPrimary={() => navigate(ROUTES.insuranceSettings)}
				secondaryLabel={INSURANCE_COPY.dropPolicyHint}
				onSecondary={() => navigate(ROUTES.insuranceSettings)}
			/>
		)
	}

	return <FigmaInsuranceHomeView home={home} />
}
