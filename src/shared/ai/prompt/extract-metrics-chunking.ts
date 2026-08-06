import type { ExtractMetricsAiEdgeMetric } from '@/shared/ai/transport/extract-metrics.types'
import { normalizeMetricName } from '@/features/health/extraction/metric-normalization.engine'

/** Max OCR chars per AI request (prompt budget). */
export const EXTRACT_METRICS_CHUNK_SIZE = 12_000

/** Overlap so metrics split across chunk boundaries are not lost. */
export const EXTRACT_METRICS_CHUNK_OVERLAP = 800

/** @deprecated Use chunking — kept for single-chunk prompts. */
export const EXTRACT_METRICS_MAX_OCR_CHARS = EXTRACT_METRICS_CHUNK_SIZE

export function splitOcrTextForExtraction(text: string): string[] {
	const trimmed = text.trim()

	if (!trimmed) {
		return []
	}

	if (trimmed.length <= EXTRACT_METRICS_CHUNK_SIZE) {
		return [trimmed]
	}

	const chunks: string[] = []
	let start = 0

	while (start < trimmed.length) {
		const end = Math.min(start + EXTRACT_METRICS_CHUNK_SIZE, trimmed.length)
		chunks.push(trimmed.slice(start, end))

		if (end >= trimmed.length) {
			break
		}

		start = Math.max(0, end - EXTRACT_METRICS_CHUNK_OVERLAP)
	}

	return chunks
}

function metricMergeKey(metric: ExtractMetricsAiEdgeMetric): string {
	const normalized = normalizeMetricName(metric.rawName)

	return (
		normalized.canonicalId ??
		metric.displayName?.trim().toLowerCase() ??
		metric.rawName.trim().toLowerCase()
	)
}

/** Merge metrics from multiple AI chunk calls; later chunks win on duplicate keys. */
export function mergeAiExtractedMetrics(
	chunkResults: ExtractMetricsAiEdgeMetric[][],
): ExtractMetricsAiEdgeMetric[] {
	const merged = new Map<string, ExtractMetricsAiEdgeMetric>()

	for (const metrics of chunkResults) {
		for (const metric of metrics) {
			merged.set(metricMergeKey(metric), metric)
		}
	}

	return [...merged.values()]
}
