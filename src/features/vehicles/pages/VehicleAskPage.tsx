import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useVehicleAsk } from '@/features/vehicles/hooks/useVehicleAsk'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { FigmaAskComposer } from '@/ui/figma/v2/atoms'
import { FigmaScreenHeader } from '@/ui/figma/shell/FigmaScreenHeader'

function createEmptyVehicleKnowledge(userId: string): VehicleKnowledge {
	return {
		userId,
		familyMember: {
			id: null,
			displayName: 'You',
			relationship: 'self',
			isAccountOwner: true,
		},
		vehicles: [],
		documents: [],
		facts: [],
		timeline: [],
		attention: [],
		summary: {
			headline: 'No vehicles yet',
			lines: [],
		},
		hasVehicles: false,
		documentCount: 0,
		limitations: [],
	}
}

export function VehicleAskPage() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const userName =
		(typeof user?.user_metadata?.full_name === 'string'
			? user.user_metadata.full_name
			: null) ??
		(typeof user?.user_metadata?.name === 'string'
			? user.user_metadata.name
			: null)

	const { selectedMember, selectedMemberId } = useFamilyContext()
	const [searchParams] = useSearchParams()
	const { knowledge, isLoading: knowledgeLoading } = useVehicleKnowledge()
	const [input, setInput] = useState('')
	const taRef = useRef<HTMLTextAreaElement>(null)
	const initialQueryHandled = useRef(false)

	const memberContext = {
		selectedMemberId,
		selectedMemberName: resolveMemberDisplayName({
			profileName: userName,
			memberDisplayName: selectedMember?.displayName,
			isAccountOwner: selectedMember?.isAccountOwner,
		}),
	}

	const resolvedKnowledge = knowledge ?? createEmptyVehicleKnowledge(userId)

	const { ask, dismissError, isLoading, turns, pendingTurn, error } =
		useVehicleAsk(userId, resolvedKnowledge, memberContext)

	useEffect(() => {
		const initialQuery = searchParams.get('q')?.trim()

		if (!initialQuery || initialQueryHandled.current || isLoading) {
			return
		}

		initialQueryHandled.current = true
		void ask(initialQuery)
	}, [ask, isLoading, searchParams])

	const resize = useCallback(() => {
		const element = taRef.current
		if (!element) return
		element.style.height = 'auto'
		element.style.height = `${Math.min(element.scrollHeight, 140)}px`
	}, [])

	const send = useCallback(
		(text = input) => {
			const question = text.trim()
			if (!question || isLoading || knowledgeLoading) return
			setInput('')
			if (taRef.current) {
				taRef.current.style.height = 'auto'
			}
			void ask(question)
		},
		[ask, input, isLoading, knowledgeLoading],
	)

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flex: 1,
				minHeight: 0,
				margin: '-4px -22px 0',
			}}
		>
			<FigmaScreenHeader title="Ask about your vehicles" />
			<div
				style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 22px' }}
			>
				{error ? (
					<AskErrorBanner
						kind={error.kind}
						message={error.message}
						onDismiss={dismissError}
					/>
				) : null}
				{turns.length === 0 && !pendingTurn ? (
					<p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
						Ask about registration, insurance expiry, service history, or
						vehicle documents.
					</p>
				) : null}
				<ConversationThread
					turns={turns}
					streamingTurn={pendingTurn}
					isTyping={isLoading}
					onFollowUpSelect={send}
				/>
			</div>
			<div style={{ padding: '12px 22px 16px' }}>
				<FigmaAskComposer
					taRef={taRef}
					input={input}
					setInput={setInput}
					thinking={isLoading}
					resize={resize}
					send={send}
				/>
			</div>
		</div>
	)
}
