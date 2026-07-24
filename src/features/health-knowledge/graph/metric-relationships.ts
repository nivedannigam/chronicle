import type { MetricRelationship } from '@/features/health-knowledge/types'

export const METRIC_RELATIONSHIPS: MetricRelationship[] = [
	{
		id: 'rel-hba1c-glucose',
		fromMetricId: 'hba1c',
		toMetricId: 'fasting-glucose',
		relationshipType: 'indicates',
		label: 'HbA1c reflects long-term blood sugar control',
	},
	{
		id: 'rel-glucose-diabetes',
		fromMetricId: 'fasting-glucose',
		toMetricId: 'diabetes-category',
		relationshipType: 'indicates',
		label: 'Blood sugar markers relate to diabetes monitoring',
	},
	{
		id: 'rel-hba1c-diabetes',
		fromMetricId: 'hba1c',
		toMetricId: 'diabetes-category',
		relationshipType: 'indicates',
		label: 'HbA1c is a primary diabetes marker',
	},
	{
		id: 'rel-creatinine-egfr',
		fromMetricId: 'creatinine',
		toMetricId: 'egfr',
		relationshipType: 'influences',
		label: 'Creatinine levels influence eGFR calculation',
	},
	{
		id: 'rel-egfr-kidney',
		fromMetricId: 'egfr',
		toMetricId: 'kidney-category',
		relationshipType: 'indicates',
		label: 'eGFR indicates kidney function',
	},
	{
		id: 'rel-creatinine-kidney',
		fromMetricId: 'creatinine',
		toMetricId: 'kidney-category',
		relationshipType: 'indicates',
		label: 'Creatinine indicates kidney filtration',
	},
	{
		id: 'rel-alt-liver',
		fromMetricId: 'alt',
		toMetricId: 'liver-category',
		relationshipType: 'indicates',
		label: 'ALT indicates liver enzyme activity',
	},
	{
		id: 'rel-ast-liver',
		fromMetricId: 'ast',
		toMetricId: 'liver-category',
		relationshipType: 'indicates',
		label: 'AST indicates liver enzyme activity',
	},
	{
		id: 'rel-ldl-heart',
		fromMetricId: 'ldl',
		toMetricId: 'heart-category',
		relationshipType: 'indicates',
		label: 'LDL relates to cardiovascular lipid profile',
	},
	{
		id: 'rel-hdl-heart',
		fromMetricId: 'hdl',
		toMetricId: 'heart-category',
		relationshipType: 'indicates',
		label: 'HDL relates to cardiovascular lipid profile',
	},
	{
		id: 'rel-vitd-vitamin',
		fromMetricId: 'vitamin-d',
		toMetricId: 'vitamin-category',
		relationshipType: 'indicates',
		label: 'Vitamin D is a core vitamin panel marker',
	},
]

export function getMetricRelationships(): MetricRelationship[] {
	return METRIC_RELATIONSHIPS
}

export function getRelationshipsForMetric(
	metricId: string,
): MetricRelationship[] {
	return METRIC_RELATIONSHIPS.filter(
		(relationship) =>
			relationship.fromMetricId === metricId ||
			relationship.toMetricId === metricId,
	)
}
