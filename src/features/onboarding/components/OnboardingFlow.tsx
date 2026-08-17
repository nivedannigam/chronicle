import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { ONBOARDING_COPY, PRODUCT } from '@/constants/product-copy'
import { ROUTES } from '@/constants/routes'
import type { OnboardingStepId } from '@/features/onboarding/services/onboarding.service'

interface OnboardingFlowProps {
	onCompleteStep: (stepId: OnboardingStepId) => void
	onDismiss: () => void
}

const STEPS: {
	id: OnboardingStepId
	title: string
	body: string
	action?: { label: string; path: string }
}[] = [
	{
		id: 'welcome',
		title: ONBOARDING_COPY.welcomeTitle,
		body: ONBOARDING_COPY.welcomeBody,
	},
	{
		id: 'family',
		title: ONBOARDING_COPY.stepFamilyTitle,
		body: ONBOARDING_COPY.stepFamilyBody,
		action: { label: 'Add a family member', path: ROUTES.familyMemberNew },
	},
	{
		id: 'health',
		title: ONBOARDING_COPY.stepHealthTitle,
		body: ONBOARDING_COPY.stepHealthBody,
		action: { label: 'Connect Google Drive', path: ROUTES.setup },
	},
	{
		id: 'document',
		title: ONBOARDING_COPY.stepDocumentTitle,
		body: ONBOARDING_COPY.stepDocumentBody,
		action: { label: 'Upload a document', path: ROUTES.documents },
	},
	{
		id: 'ask',
		title: ONBOARDING_COPY.stepAskTitle,
		body: ONBOARDING_COPY.stepAskBody,
		action: { label: 'Open Ask Chronicle', path: ROUTES.ask },
	},
	{
		id: 'complete',
		title: ONBOARDING_COPY.completeTitle,
		body: ONBOARDING_COPY.completeBody,
	},
]

export function OnboardingFlow({
	onCompleteStep,
	onDismiss,
}: OnboardingFlowProps) {
	const navigate = useNavigate()
	const [stepIndex, setStepIndex] = useState(0)
	const step = STEPS[stepIndex]!
	const isLast = stepIndex === STEPS.length - 1

	const advance = () => {
		onCompleteStep(step.id)

		if (isLast) {
			onDismiss()
			return
		}

		setStepIndex((current) => current + 1)
	}

	const handleAction = () => {
		onCompleteStep(step.id)

		if (step.action) {
			navigate(step.action.path)
			onDismiss()
			return
		}

		advance()
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 200,
				background: 'rgba(6,6,10,0.92)',
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
				padding: '24px 16px calc(24px + env(safe-area-inset-bottom))',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 393,
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 28,
					padding: '28px 22px 22px',
					boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 20,
					}}
				>
					<div
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: C.textMuted,
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
						}}
					>
						{PRODUCT.name}
					</div>
					<button
						type="button"
						onClick={onDismiss}
						style={{
							background: 'none',
							border: 'none',
							color: C.textMuted,
							fontSize: 13,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
							padding: '4px 0',
						}}
					>
						{ONBOARDING_COPY.skip}
					</button>
				</div>

				<div
					style={{
						width: 52,
						height: 52,
						borderRadius: 16,
						background: C.accentDim,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						marginBottom: 18,
					}}
				>
					{isLast ? (
						<Check size={26} color={C.green} />
					) : (
						<Sparkles size={26} color={C.accent} />
					)}
				</div>

				<h2
					style={{
						fontSize: 26,
						fontWeight: 800,
						letterSpacing: '-0.03em',
						margin: '0 0 10px',
						color: C.text,
					}}
				>
					{step.title}
				</h2>
				<p
					style={{
						fontSize: 15,
						lineHeight: 1.6,
						color: C.textSec,
						margin: '0 0 22px',
					}}
				>
					{step.body}
				</p>

				<div
					style={{
						display: 'flex',
						gap: 6,
						marginBottom: 22,
					}}
				>
					{STEPS.map((entry, index) => (
						<div
							key={entry.id}
							style={{
								flex: 1,
								height: 4,
								borderRadius: 100,
								background:
									index <= stepIndex ? C.accent : 'rgba(255,255,255,0.08)',
								transition: 'background 0.25s ease',
							}}
						/>
					))}
				</div>

				{step.action ? (
					<button
						type="button"
						onClick={handleAction}
						style={{
							width: '100%',
							minHeight: 48,
							borderRadius: 100,
							border: 'none',
							background: C.accent,
							color: C.text,
							fontSize: 15,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 6,
							marginBottom: 10,
						}}
					>
						{step.action.label}
						<ChevronRight size={18} />
					</button>
				) : null}

				<button
					type="button"
					onClick={advance}
					style={{
						width: '100%',
						minHeight: 48,
						borderRadius: 100,
						border: step.action ? `1px solid ${C.border}` : 'none',
						background: step.action ? 'transparent' : C.accent,
						color: C.text,
						fontSize: 15,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{isLast
						? ONBOARDING_COPY.done
						: step.action
							? ONBOARDING_COPY.continue
							: ONBOARDING_COPY.getStarted}
				</button>
			</div>
		</div>
	)
}
