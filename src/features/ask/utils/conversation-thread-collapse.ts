import type { AskConversationTurn } from '@/features/ask/types'

const NO_DATA_MARKERS = [
	"I don't have records",
	"don't have records in Chronicle",
] as const

export function isNoDataTurn(turn: AskConversationTurn): boolean {
	if (turn.dataAvailable) {
		return false
	}

	const answer = turn.answer.toLowerCase()
	return NO_DATA_MARKERS.some((marker) => answer.includes(marker.toLowerCase()))
}

export function buildCollapsedTurnPreview(turn: AskConversationTurn): string {
	if (isNoDataTurn(turn)) {
		return 'No matching records in Chronicle'
	}

	const answer =
		turn.trust?.directAnswer ??
		turn.answer.replace(/\s+/g, ' ').trim().slice(0, 100)

	return answer.length > 80 ? `${answer.slice(0, 80)}…` : answer
}

/** Whether a turn should start collapsed in the thread. */
export function shouldCollapseTurnByDefault(input: {
	turn: AskConversationTurn
	index: number
	totalTurns: number
}): boolean {
	if (isNoDataTurn(input.turn)) {
		return true
	}

	if (input.totalTurns <= 2) {
		return false
	}

	const lastExpandedIndex = input.totalTurns - 2
	return input.index < lastExpandedIndex
}
