export type {
	ClinicalAnswer,
	ClinicalPriority,
	ClinicalResponseInput,
	RankedEvidence,
	RankedMetric,
	RankedTrend,
} from '@/features/ask/clinical/clinical-response.types'

export {
	rankEvidence,
	selectImportantMetrics,
} from '@/features/ask/clinical/evidence-ranking.engine'

export {
	buildClinicalAnswer,
	clinicalAnswerToProse,
} from '@/features/ask/clinical/clinical-reasoning.engine'

export {
	buildClinicalCards,
	buildClinicalEvidenceLines,
} from '@/features/ask/clinical/clinical-response.builder'
