import { getLatestAiObservabilityLog } from '@/features/ai/services/ai-observability.service'
import { getLastAskDebugInfo } from '@/features/ask/services/ai-ask-reasoning.engine'
import { C } from '@/constants/colors'

interface AiDebugPanelProps {
	visible?: boolean
}

export function AiDebugPanel({
	visible = import.meta.env.DEV,
}: AiDebugPanelProps) {
	if (!visible) {
		return null
	}

	const debug = getLastAskDebugInfo()
	const observability = getLatestAiObservabilityLog()

	if (!debug && !observability) {
		return null
	}

	return (
		<div style={{ marginTop: 24 }}>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.orange,
					marginBottom: 12,
				}}
			>
				AI Debug Panel (Dev Only)
			</div>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.orange}44`,
					borderRadius: 18,
					padding: 16,
					fontSize: 12,
					color: C.textSec,
					lineHeight: 1.6,
				}}
			>
				{debug ? (
					<>
						<div style={{ marginBottom: 12 }}>
							<strong style={{ color: C.text }}>Intent</strong>
							<div>{debug.intent}</div>
							<div>Resolved: {debug.resolvedQuestion}</div>
						</div>
						<div style={{ marginBottom: 12 }}>
							<strong style={{ color: C.text }}>Retrieved Knowledge</strong>
							<div>
								Reports: {debug.retrievedKnowledge.reports.length} · Metrics:{' '}
								{debug.retrievedKnowledge.metrics.length} · Observations:{' '}
								{debug.retrievedKnowledge.observations.length}
							</div>
						</div>
						{debug.prompt ? (
							<div style={{ marginBottom: 12 }}>
								<strong style={{ color: C.text }}>Constructed Prompt</strong>
								<pre
									style={{
										marginTop: 8,
										padding: 12,
										background: C.card2,
										borderRadius: 12,
										overflowX: 'auto',
										whiteSpace: 'pre-wrap',
										fontSize: 11,
										color: C.textMuted,
										maxHeight: 180,
									}}
								>
									{debug.prompt.user.slice(0, 2500)}
								</pre>
							</div>
						) : null}
						{debug.providerResponse ? (
							<div style={{ marginBottom: 12 }}>
								<strong style={{ color: C.text }}>Provider Response</strong>
								<pre
									style={{
										marginTop: 8,
										padding: 12,
										background: C.card2,
										borderRadius: 12,
										overflowX: 'auto',
										whiteSpace: 'pre-wrap',
										fontSize: 11,
										color: C.textMuted,
										maxHeight: 120,
									}}
								>
									{debug.providerResponse}
								</pre>
							</div>
						) : null}
					</>
				) : null}

				{observability ? (
					<div>
						<strong style={{ color: C.text }}>Observability</strong>
						<div>Provider: {observability.provider}</div>
						<div>Latency: {observability.latencyMs}ms</div>
						<div>
							Tokens: {observability.totalTokens} (prompt{' '}
							{observability.promptTokens} / completion{' '}
							{observability.completionTokens})
						</div>
						<div>Prompt size: {observability.promptSizeChars} chars</div>
						<div>Cache hit: {observability.cacheHit ? 'yes' : 'no'}</div>
						{observability.error ? (
							<div style={{ color: C.red }}>{observability.error}</div>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	)
}
