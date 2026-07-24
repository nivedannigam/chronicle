export type MetricStatus =
	'normal' | 'high' | 'low' | 'borderline' | 'critical' | 'unknown'

/** @deprecated Use MetricStatus */
export type DomainMetricStatus = MetricStatus

export interface ReferenceRange {
	lowerLimit: number | null
	upperLimit: number | null
	unit: string | null
	rawText: string
}

export interface MetricDefinition {
	canonicalId: string
	displayName: string
	aliases: string[]
	category: string
	defaultUnit?: string
}

export interface MetricResult {
	rawName: string
	canonicalId: string | null
	displayName: string
	value: string
	numericValue: number | null
	unit: string | null
	referenceRange: ReferenceRange
	status: MetricStatus
	confidence: number
	source: 'table' | 'text'
}

export interface HealthMetric {
	id: string
	canonicalId: string
	displayName: string
	rawName: string
	value: string
	numericValue: number | null
	unit: string | null
	referenceRange: ReferenceRange
	status: MetricStatus
	confidence: number
}
