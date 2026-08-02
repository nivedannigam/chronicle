import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import { C } from '@/constants/colors'
import { classifyGeminiFailure } from '@/shared/ai/errors/ai-errors'

export type AskErrorKind =
	'no_data' | 'timeout' | 'llm_failure' | 'network' | 'provider' | 'unknown'

interface AskErrorBannerProps {
	kind: AskErrorKind
	message?: string
	onRetry?: () => void
	onDismiss?: () => void
}

const COPY: Record<AskErrorKind, { title: string; description: string }> = {
	no_data: {
		title: 'Not enough data yet',
		description:
			'Chronicle needs health reports or documents before it can answer this question.',
	},
	timeout: {
		title: 'Request timed out',
		description: 'The answer took too long. Try a simpler question or retry.',
	},
	llm_failure: {
		title: 'AI response unavailable',
		description:
			'Chronicle could not complete the AI response. A summary from your records may still be available.',
	},
	network: {
		title: 'Connection issue',
		description: 'Check your network and try again.',
	},
	provider: {
		title: 'AI provider unavailable',
		description:
			'The AI service is not responding. Chronicle will answer from your records when possible.',
	},
	unknown: {
		title: 'Something went wrong',
		description: 'Please try again in a moment.',
	},
}

export function AskErrorBanner({
	kind,
	message,
	onRetry,
	onDismiss,
}: AskErrorBannerProps) {
	const copy = COPY[kind]
	const Icon = kind === 'network' ? WifiOff : AlertCircle

	return (
		<div
			role="alert"
			style={{
				display: 'flex',
				gap: 12,
				padding: '14px 16px',
				borderRadius: 16,
				background: `${C.orange}12`,
				border: `1px solid ${C.orange}44`,
				marginBottom: 16,
			}}
		>
			<Icon
				size={18}
				color={C.orange}
				style={{ flexShrink: 0, marginTop: 2 }}
			/>
			<div style={{ flex: 1 }}>
				<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
					{copy.title}
				</div>
				<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
					{message ?? copy.description}
				</div>
				<div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
					{onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 5,
								fontSize: 12,
								fontWeight: 700,
								color: C.orange,
								background: 'transparent',
								border: `1px solid ${C.orange}55`,
								borderRadius: 100,
								padding: '6px 10px',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							<RefreshCw size={13} />
							Try again
						</button>
					) : null}
					{onDismiss ? (
						<button
							type="button"
							onClick={onDismiss}
							style={{
								fontSize: 12,
								fontWeight: 600,
								color: C.textMuted,
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							Dismiss
						</button>
					) : null}
				</div>
			</div>
		</div>
	)
}

export function classifyAskError(error: unknown): AskErrorKind {
	const message = error instanceof Error ? error.message : String(error)
	const providerResponse =
		error instanceof Error &&
		'providerResponse' in error &&
		typeof error.providerResponse === 'string'
			? error.providerResponse
			: undefined
	const statusCode =
		error instanceof Error &&
		'statusCode' in error &&
		typeof error.statusCode === 'number'
			? error.statusCode
			: undefined
	const normalized = `${message} ${providerResponse ?? ''}`.toLowerCase()
	const geminiFailure = classifyGeminiFailure({
		statusCode,
		message,
		providerResponse,
	})

	if (/network|fetch|offline|connection/i.test(normalized)) {
		return 'network'
	}

	if (geminiFailure.kind === 'timeout') {
		return 'timeout'
	}

	if (geminiFailure.kind === 'auth') {
		return 'provider'
	}

	if (geminiFailure.kind === 'billing' || geminiFailure.kind === 'rate_limit') {
		return 'provider'
	}

	if (geminiFailure.kind === 'model_not_found') {
		return 'llm_failure'
	}

	if (/provider|api key|unauthorized|429|503/i.test(normalized)) {
		return 'provider'
	}

	if (/no data|not enough|empty/i.test(normalized)) {
		return 'no_data'
	}

	if (/llm|model|completion|json|validation/i.test(normalized)) {
		return 'llm_failure'
	}

	return 'unknown'
}

export function formatAskErrorMessage(error: unknown): string | undefined {
	if (!(error instanceof Error)) {
		return undefined
	}

	const providerResponse =
		'providerResponse' in error && typeof error.providerResponse === 'string'
			? error.providerResponse
			: undefined
	const statusCode =
		'statusCode' in error && typeof error.statusCode === 'number'
			? error.statusCode
			: undefined

	return classifyGeminiFailure({
		statusCode,
		message: error.message,
		providerResponse,
	}).userMessage
}
