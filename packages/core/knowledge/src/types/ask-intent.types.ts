/** Cross-domain intents (documents, timeline, general). */
export type BaseAskIntent =
	| 'find_document'
	| 'list_documents'
	| 'document_expiry'
	| 'document_summary'
	| 'general_documents'
	| 'timeline_query'
	| 'timeline_search'
	| 'timeline_last_event'
	| 'explain_response'

/** Health-specific intents — re-exported from health module for domain typing. */
export type HealthAskIntent =
	| 'organ_status'
	| 'metric_trend'
	| 'metric_history'
	| 'abnormal_reports'
	| 'improving_metrics'
	| 'declining_metrics'
	| 'compare_reports'
	| 'summarize_report'
	| 'latest_report'
	| 'doctor_discussion'
	| 'metric_lookup'
	| 'general_health'
	| 'health_journey'
	| 'resolved_findings'
	| 'attention_summary'
	| 'summarize_health'
	| 'since_last_report'

export type AskIntent = HealthAskIntent | BaseAskIntent
