import { Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { ASK_COPY } from '@/constants/product-copy'
import {
	buildDynamicSuggestionChips,
	type DynamicSuggestionChip,
} from '@/features/ask/services/dynamic-suggestions.service'
import { DynamicSuggestionChips } from '@/features/ask/components/FollowUpChips'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { useMemo } from 'react'

interface AskEmptyStateProps {
	uploadedReports: UploadedHealthReport[]
	documents?: ChronicleDocument[]
	memberName?: string | null
	onSelect: (question: string) => void
	disabled?: boolean
}

export function AskEmptyState({
	uploadedReports,
	documents = [],
	memberName,
	onSelect,
	disabled = false,
}: AskEmptyStateProps) {
	const chips = useMemo(
		() =>
			buildDynamicSuggestionChips({
				uploadedReports,
				documents,
				memberName,
			}),
		[uploadedReports, documents, memberName],
	)

	return (
		<div
			style={{
				padding: '28px 18px',
				borderRadius: 22,
				background: `linear-gradient(160deg, ${C.accent}14 0%, ${C.card} 55%)`,
				border: `1px solid ${C.border}`,
				marginBottom: 20,
			}}
		>
			<div
				style={{
					width: 52,
					height: 52,
					borderRadius: 16,
					background: C.accentDim,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 16,
					boxShadow: `0 0 28px rgba(108,111,255,0.18)`,
				}}
			>
				<Sparkles size={26} color={C.accent} />
			</div>

			<div
				style={{
					fontSize: 22,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Ask anything about your family
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.6,
					marginBottom: 18,
					maxWidth: 420,
				}}
			>
				{ASK_COPY.subtitle} Answers include sources from your records so you can
				check the details.
			</div>

			<DynamicSuggestionChips
				chips={chips as DynamicSuggestionChip[]}
				onSelect={onSelect}
				disabled={disabled}
			/>
		</div>
	)
}
