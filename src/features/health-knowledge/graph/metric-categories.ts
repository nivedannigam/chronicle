import { C } from '@/constants/colors'
import { METRIC_DEFINITIONS } from '@/features/health/extraction/metric-definitions'
import type {
	HealthMetricDefinition,
	MetricCategory,
	MetricCategoryId,
} from '@/features/health-knowledge/types'

const CATEGORY_META: Record<
	MetricCategoryId,
	{ name: string; emoji: string; color: string }
> = {
	heart: { name: 'Heart', emoji: '❤️', color: C.red },
	liver: { name: 'Liver', emoji: '🫀', color: C.orange },
	kidney: { name: 'Kidney', emoji: '🧪', color: C.teal },
	diabetes: { name: 'Diabetes', emoji: '💉', color: C.yellow },
	thyroid: { name: 'Thyroid', emoji: '🦋', color: C.accentBlue },
	vitamin: { name: 'Vitamin', emoji: '🦴', color: C.greenAlt },
	blood: { name: 'Blood', emoji: '🩸', color: C.photos },
}

const CATEGORY_ALIASES: Record<string, MetricCategoryId> = {
	heart: 'heart',
	liver: 'liver',
	kidney: 'kidney',
	diabetes: 'diabetes',
	thyroid: 'thyroid',
	vitamin: 'vitamin',
	'blood-count': 'blood',
	blood: 'blood',
	general: 'blood',
}

const EXTRA_METRICS: HealthMetricDefinition[] = [
	{
		canonicalId: 'alp',
		displayName: 'ALP',
		categoryId: 'liver',
		aliases: ['alp', 'alkaline phosphatase'],
		defaultUnit: 'U/L',
	},
	{
		canonicalId: 'urea',
		displayName: 'Urea',
		categoryId: 'kidney',
		aliases: ['urea', 'blood urea', 'bun'],
		defaultUnit: 'mg/dL',
	},
	{
		canonicalId: 'random-glucose',
		displayName: 'Random Sugar',
		categoryId: 'diabetes',
		aliases: ['random glucose', 'random sugar', 'post prandial glucose'],
		defaultUnit: 'mg/dL',
	},
	{
		canonicalId: 'rbc',
		displayName: 'RBC',
		categoryId: 'blood',
		aliases: ['rbc', 'rbc count', 'red blood cell'],
		defaultUnit: 'M/µL',
	},
	{
		canonicalId: 'ferritin',
		displayName: 'Ferritin',
		categoryId: 'vitamin',
		aliases: ['ferritin', 'serum ferritin'],
		defaultUnit: 'ng/mL',
	},
	{
		canonicalId: 'esr',
		displayName: 'ESR',
		categoryId: 'blood',
		aliases: ['esr', 'erythrocyte sedimentation rate'],
		defaultUnit: 'mm/hr',
	},
	{
		canonicalId: 'crp',
		displayName: 'CRP',
		categoryId: 'blood',
		aliases: ['crp', 'c-reactive protein'],
		defaultUnit: 'mg/L',
	},
	{
		canonicalId: 'height',
		displayName: 'Height',
		categoryId: 'blood',
		aliases: ['height'],
		defaultUnit: 'cm',
	},
	{
		canonicalId: 'weight',
		displayName: 'Weight',
		categoryId: 'blood',
		aliases: ['weight', 'body weight'],
		defaultUnit: 'kg',
	},
	{
		canonicalId: 'bmi',
		displayName: 'BMI',
		categoryId: 'blood',
		aliases: ['bmi', 'body mass index'],
		defaultUnit: 'kg/m²',
	},
	{
		canonicalId: 'systolic-bp',
		displayName: 'Blood Pressure (Systolic)',
		categoryId: 'heart',
		aliases: ['systolic', 'systolic bp', 'blood pressure systolic'],
		defaultUnit: 'mmHg',
	},
	{
		canonicalId: 'diastolic-bp',
		displayName: 'Blood Pressure (Diastolic)',
		categoryId: 'heart',
		aliases: ['diastolic', 'diastolic bp', 'blood pressure diastolic'],
		defaultUnit: 'mmHg',
	},
	{
		canonicalId: 'pulse',
		displayName: 'Pulse',
		categoryId: 'heart',
		aliases: ['pulse', 'heart rate', 'hr'],
		defaultUnit: 'bpm',
	},
]

export function getHealthMetricDefinitions(): HealthMetricDefinition[] {
	const fromExtraction = METRIC_DEFINITIONS.map((definition) => ({
		canonicalId: definition.canonicalId,
		displayName: definition.displayName,
		categoryId: mapCategoryId(definition.category),
		aliases: definition.aliases,
		defaultUnit: definition.defaultUnit,
	}))

	const merged = new Map<string, HealthMetricDefinition>()

	for (const definition of [...fromExtraction, ...EXTRA_METRICS]) {
		merged.set(definition.canonicalId, definition)
	}

	return [...merged.values()]
}

export function mapCategoryId(category: string): MetricCategoryId {
	return CATEGORY_ALIASES[category] ?? 'blood'
}

export function getMetricCategories(): MetricCategory[] {
	const definitions = getHealthMetricDefinitions()

	return (Object.keys(CATEGORY_META) as MetricCategoryId[]).map(
		(categoryId) => ({
			id: categoryId,
			name: CATEGORY_META[categoryId].name,
			emoji: CATEGORY_META[categoryId].emoji,
			color: CATEGORY_META[categoryId].color,
			metricIds: definitions
				.filter((definition) => definition.categoryId === categoryId)
				.map((definition) => definition.canonicalId),
		}),
	)
}

export function getCategoryMeta(categoryId: MetricCategoryId) {
	return CATEGORY_META[categoryId]
}

export function findMetricDefinitionById(
	canonicalId: string,
): HealthMetricDefinition | undefined {
	return getHealthMetricDefinitions().find(
		(definition) => definition.canonicalId === canonicalId,
	)
}
