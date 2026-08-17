import type { AIPlatformConfig } from '@/shared/ai/types/ai-platform.types'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { recordAICost } from '@/shared/ai/cost/cost-tracker'
import { isLlmSupportedIntent } from '@/shared/ai/intent/intent.types'
import { classifyAndSelectHealthEvidence } from '@/shared/ai/intent-evidence/intent-evidence.orchestrator'
import { AIGateway } from '@/shared/ai/gateway/ai-gateway'
import { createDefaultKnowledgeRegistry } from '@/shared/ai/knowledge/knowledge-bootstrap'
import { healthKnowledgeToNormalized } from '@/shared/ai/knowledge/health-knowledge-normalizer'
import { HealthKnowledgePlatformAdapter } from '@/shared/ai/knowledge/health-knowledge.provider'
import { KnowledgeProviderRegistry } from '@/shared/ai/knowledge/knowledge-provider.registry'
import { recordAIObservability } from '@/shared/ai/observability/ai-observability'
import { buildEvidencePrompt } from '@/shared/ai/prompt/evidence-prompt.builder'
import {
	assertStructuredResponse,
	buildGroundedValidationContextFromEvidenceItems,
	validateStructuredResponseContent,
} from '@/shared/ai/response/response-validator'
import type { SelectedEvidence } from '@/shared/ai/evidence/evidence.types'
import type {
	ToolResult,
	HealthToolPayload,
} from '@/shared/ai/tools/tool.types'
import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import { healthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import { planAndResolveInsuranceEvidence } from '@/shared/ai/evidence-planning/plan-insurance-evidence'
import { planAndResolveVehicleEvidence } from '@/shared/ai/evidence-planning/plan-vehicle-evidence'
import { domainEvidenceToNormalized } from '@/shared/ai/knowledge/domain-knowledge-normalizer'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { IntentId } from '@/shared/ai/types/ai-platform.types'
import type {
	AIPlatformRequest,
	AIPlatformResult,
} from '@/shared/ai/types/pipeline.types'

export interface AIPlatformPipelineDeps {
	gateway: AIGateway
	knowledgeRegistry: KnowledgeProviderRegistry
	healthKnowledge?: typeof healthKnowledgeProvider
}

export function createDefaultAIPlatformPipeline(
	config?: AIPlatformConfig,
): AIPlatformPipeline {
	return new AIPlatformPipeline({
		gateway: new AIGateway(config),
		knowledgeRegistry: createDefaultKnowledgeRegistry(),
	})
}

export interface RunHealthQuestionInput {
	userId: string
	question: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
	memberName?: string | null
	categoryId?: string
	reportId?: string
	reportIds?: string[]
	conversationTurns?: Array<{
		question: string
		answer: string
		intent?: string
		metricName?: string
		categoryId?: string
	}>
	memoryContextPrompt?: string | null
	insuranceScope?: InsuranceAskScope
}

const CHRONICLE_TO_LEGACY_INTENT: Partial<Record<ChronicleIntent, IntentId>> = {
	GENERAL_HEALTH_SUMMARY: 'summarize_health',
	LATEST_REPORT: 'summarize_report',
	ABNORMAL_RESULTS: 'abnormal_summary',
	NORMAL_RESULTS: 'normal_results',
	SPECIFIC_METRIC: 'metric_query',
	TREND_ANALYSIS: 'trend_analysis',
	COMPARE_REPORTS: 'compare_reports',
	RECOMMENDATIONS: 'recommendations',
	FOLLOW_UP_TESTS: 'follow_up_tests',
	EXPLAIN_METRIC: 'explain_metric',
}

function resolveLegacyIntent(
	classifiedIntent: ChronicleIntent,
	requestIntent?: IntentId,
): IntentId {
	return (
		CHRONICLE_TO_LEGACY_INTENT[classifiedIntent] ??
		requestIntent ??
		classifiedIntent.toLowerCase()
	)
}

function buildValidationContextFromEvidence(evidence: SelectedEvidence) {
	return buildGroundedValidationContextFromEvidenceItems(evidence.items)
}

export class AIPlatformPipeline {
	private readonly gateway: AIGateway
	private readonly knowledgeRegistry: KnowledgeProviderRegistry
	private readonly healthKnowledgeProvider: typeof healthKnowledgeProvider

	constructor(deps: AIPlatformPipelineDeps) {
		this.gateway = deps.gateway
		this.knowledgeRegistry = deps.knowledgeRegistry
		this.healthKnowledgeProvider =
			deps.healthKnowledge ?? healthKnowledgeProvider

		if (!this.knowledgeRegistry.get('health')) {
			this.knowledgeRegistry.register(new HealthKnowledgePlatformAdapter())
		}
	}

	async summarizeLatestReport(
		input: RunHealthQuestionInput,
	): Promise<AIPlatformResult> {
		return this.runHealthQuestion(input)
	}

	async runHealthQuestion(
		input: RunHealthQuestionInput,
	): Promise<AIPlatformResult> {
		const healthKnowledge = await this.healthKnowledgeProvider.getKnowledge({
			userId: input.userId,
			familyMemberId: input.familyMemberId,
			accountOwnerMemberId: input.accountOwnerMemberId,
		})

		return this.run({
			question: input.question,
			domain: 'health',
			userId: input.userId,
			memberName: input.memberName,
			memoryContextPrompt: input.memoryContextPrompt,
			knowledgePayload: {
				familyMemberId: input.familyMemberId,
				accountOwnerMemberId: input.accountOwnerMemberId,
				categoryId: input.categoryId,
				reportId: input.reportId,
				reportIds: input.reportIds,
			},
			healthKnowledge,
		})
	}

	async runInsuranceQuestion(
		input: RunHealthQuestionInput,
	): Promise<AIPlatformResult> {
		const insuranceKnowledge = await insuranceKnowledgeProvider.getKnowledge({
			userId: input.userId,
			familyMemberId: input.familyMemberId,
			accountOwnerMemberId: input.accountOwnerMemberId,
		})

		return this.runDomainQuestion({
			question: input.question,
			domain: 'insurance',
			userId: input.userId,
			memberName: input.memberName,
			memoryContextPrompt: input.memoryContextPrompt,
			insuranceKnowledge,
			insuranceScope: input.insuranceScope,
		})
	}

	async runVehicleQuestion(
		input: RunHealthQuestionInput,
	): Promise<AIPlatformResult> {
		const vehicleKnowledge = await vehicleKnowledgeProvider.getKnowledge({
			userId: input.userId,
			familyMemberId: input.familyMemberId,
			accountOwnerMemberId: input.accountOwnerMemberId,
		})

		return this.runDomainQuestion({
			question: input.question,
			domain: 'vehicles',
			userId: input.userId,
			memberName: input.memberName,
			memoryContextPrompt: input.memoryContextPrompt,
			vehicleKnowledge,
		})
	}

	private async runDomainQuestion(input: {
		question: string
		domain: Extract<KnowledgeDomainId, 'insurance' | 'vehicles'>
		userId: string
		memberName?: string | null
		memoryContextPrompt?: string | null
		insuranceKnowledge?: InsuranceKnowledge
		vehicleKnowledge?: VehicleKnowledge
		insuranceScope?: InsuranceAskScope
	}): Promise<AIPlatformResult> {
		const requestId = crypto.randomUUID()
		const config = loadAIPlatformConfig()
		const prepared =
			input.domain === 'insurance'
				? planAndResolveInsuranceEvidence({
						question: input.question,
						knowledge: input.insuranceKnowledge!,
						scope: input.insuranceScope,
					})
				: planAndResolveVehicleEvidence({
						question: input.question,
						knowledge: input.vehicleKnowledge!,
					})

		const { classifiedIntent, evidence, evidenceBundle } = prepared
		const selectedTool =
			input.domain === 'insurance'
				? 'insurance.evidence_resolver.v1'
				: 'vehicles.evidence_resolver.v1'
		const toolResult: ToolResult<HealthToolPayload> = {
			success: true,
			tool: `${input.domain}.evidence_resolver.v1`,
			domain: input.domain,
			data: {
				items: [],
				excluded: [],
				confidence: classifiedIntent.confidence,
			},
			confidence: classifiedIntent.confidence,
			executionTimeMs: 0,
			inputSizeChars: input.question.length,
			outputSizeChars: JSON.stringify(evidenceBundle.summary).length,
			retryCount: 0,
		}

		if (!isLlmSupportedIntent(classifiedIntent.intent)) {
			throw new Error(
				`Intent "${classifiedIntent.intent}" is not supported by production AI.`,
			)
		}

		const legacyIntent = resolveLegacyIntent(classifiedIntent.intent)
		const knowledge = domainEvidenceToNormalized({
			domain: input.domain,
			intent: legacyIntent,
			question: input.question,
			bundle: evidenceBundle,
			insuranceKnowledge: input.insuranceKnowledge,
			vehicleKnowledge: input.vehicleKnowledge,
		})

		const prompt = buildEvidencePrompt({
			question: input.question,
			intent: classifiedIntent,
			evidence,
			evidenceBundle,
			memberName: input.memberName,
			memoryContextPrompt: input.memoryContextPrompt,
		})

		const validationContext = buildValidationContextFromEvidence(evidence)
		let aiResponse: Awaited<ReturnType<AIGateway['generate']>> | null = null
		let response: ReturnType<typeof assertStructuredResponse> | null = null
		let retryCount = 0
		let validationSuccess = false
		let lastValidationError = ''

		while (retryCount <= config.maxRetries) {
			aiResponse = await this.gateway.generate({
				requestId: `${requestId}-attempt-${retryCount}`,
				messages: prompt.messages,
				responseFormat: 'json',
				metadata: {
					intent: legacyIntent,
					classifiedIntent: classifiedIntent.intent,
					knowledgeProvider: `${input.domain}-knowledge-provider`,
					knowledgeDomain: input.domain,
					userId: input.userId,
					evidenceCount: evidence.metadata.evidenceCount,
					estimatedContextTokens: evidence.metadata.estimatedTokens,
					selectedTool,
				},
			})

			const validation = validateStructuredResponseContent(aiResponse.content)

			if (!validation.ok) {
				lastValidationError = validation.errors.join('; ')
				retryCount += 1
				continue
			}

			try {
				response = assertStructuredResponse(
					aiResponse.content,
					validationContext,
				)
				validationSuccess = true
				break
			} catch (error) {
				lastValidationError =
					error instanceof Error ? error.message : 'Grounded validation failed'
				retryCount += 1
			}
		}

		if (!aiResponse || !response) {
			throw new Error(
				lastValidationError || 'AI response validation failed after retries',
			)
		}

		recordAIObservability({
			requestId,
			timestamp: new Date().toISOString(),
			provider: aiResponse.provider,
			model: aiResponse.model,
			intent: legacyIntent,
			classifiedIntent: classifiedIntent.intent,
			knowledgeProvider: `${input.domain}-knowledge-provider`,
			knowledgeDomain: input.domain,
			promptTokens: aiResponse.usage.promptTokens,
			completionTokens: aiResponse.usage.completionTokens,
			totalTokens: aiResponse.usage.totalTokens,
			estimatedCostUsd: aiResponse.estimatedCostUsd,
			latencyMs: aiResponse.latencyMs,
			confidence: 0,
			cacheHit: false,
			validationSuccess,
			retryCount,
			evidenceCount: evidence.metadata.evidenceCount,
			excludedEvidence: evidence.metadata.excludedItems,
			estimatedContextTokens: evidence.metadata.estimatedTokens,
			selectedTool,
			toolExecutionTimeMs: toolResult.executionTimeMs,
			error: validationSuccess ? undefined : lastValidationError,
		})

		return {
			requestId,
			intent: legacyIntent,
			domain: input.domain,
			classifiedIntent,
			selectedEvidence: evidence,
			selectedTool,
			toolResult,
			knowledge,
			response,
			observability: {
				requestId,
				timestamp: new Date().toISOString(),
				provider: aiResponse.provider,
				model: aiResponse.model,
				intent: legacyIntent,
				classifiedIntent: classifiedIntent.intent,
				knowledgeProvider: `${input.domain}-knowledge-provider`,
				knowledgeDomain: input.domain,
				promptTokens: aiResponse.usage.promptTokens,
				completionTokens: aiResponse.usage.completionTokens,
				totalTokens: aiResponse.usage.totalTokens,
				estimatedCostUsd: aiResponse.estimatedCostUsd,
				latencyMs: aiResponse.latencyMs,
				confidence: response.confidence,
				cacheHit: false,
				validationSuccess,
				retryCount,
				evidenceCount: evidence.metadata.evidenceCount,
				excludedEvidence: evidence.metadata.excludedItems,
				estimatedContextTokens: evidence.metadata.estimatedTokens,
				selectedTool,
				toolExecutionTimeMs: toolResult.executionTimeMs,
			},
		}
	}

	async run(request: AIPlatformRequest): Promise<AIPlatformResult> {
		const requestId = request.requestId ?? crypto.randomUUID()
		const config = loadAIPlatformConfig()

		const healthKnowledge =
			request.healthKnowledge ??
			(request.userId
				? await this.healthKnowledgeProvider.getKnowledge({
						userId: request.userId,
						familyMemberId:
							typeof request.knowledgePayload.familyMemberId === 'string'
								? request.knowledgePayload.familyMemberId
								: null,
						accountOwnerMemberId:
							typeof request.knowledgePayload.accountOwnerMemberId === 'string'
								? request.knowledgePayload.accountOwnerMemberId
								: null,
					})
				: undefined)

		if (!healthKnowledge) {
			throw new Error(
				'Health knowledge is required for production AI requests.',
			)
		}

		const {
			classifiedIntent,
			evidence,
			evidenceBundle,
			selectedTool,
			toolResult,
		} = await classifyAndSelectHealthEvidence({
			question: request.question,
			knowledge: healthKnowledge,
			userId: request.userId ?? 'unknown',
			familyMemberId:
				typeof request.knowledgePayload.familyMemberId === 'string'
					? request.knowledgePayload.familyMemberId
					: null,
			accountOwnerMemberId:
				typeof request.knowledgePayload.accountOwnerMemberId === 'string'
					? request.knowledgePayload.accountOwnerMemberId
					: null,
			memberName: request.memberName,
			categoryId:
				typeof request.knowledgePayload.categoryId === 'string'
					? request.knowledgePayload.categoryId
					: undefined,
			reportId:
				typeof request.knowledgePayload.reportId === 'string'
					? request.knowledgePayload.reportId
					: undefined,
			reportIds: Array.isArray(request.knowledgePayload.reportIds)
				? request.knowledgePayload.reportIds.filter(
						(id): id is string => typeof id === 'string',
					)
				: undefined,
		})

		if (!isLlmSupportedIntent(classifiedIntent.intent)) {
			throw new Error(
				`Intent "${classifiedIntent.intent}" is not supported by production AI.`,
			)
		}

		const legacyIntent = resolveLegacyIntent(
			classifiedIntent.intent,
			request.intent,
		)

		const knowledge = healthKnowledgeToNormalized(
			healthKnowledge,
			legacyIntent,
			request.question,
		)

		const prompt = buildEvidencePrompt({
			question: request.question,
			intent: classifiedIntent,
			evidence,
			evidenceBundle,
			memberName: request.memberName,
			memoryContextPrompt: request.memoryContextPrompt,
		})

		const validationContext = buildValidationContextFromEvidence(evidence)

		let aiResponse: Awaited<ReturnType<AIGateway['generate']>> | null = null
		let response: ReturnType<typeof assertStructuredResponse> | null = null
		let retryCount = 0
		let validationSuccess = false
		let lastValidationError = ''

		while (retryCount <= config.maxRetries) {
			aiResponse = await this.gateway.generate({
				requestId: `${requestId}-attempt-${retryCount}`,
				messages: prompt.messages,
				responseFormat: 'json',
				metadata: {
					intent: legacyIntent,
					classifiedIntent: classifiedIntent.intent,
					knowledgeProvider: `${request.domain}-knowledge-provider`,
					knowledgeDomain: request.domain,
					userId: request.userId,
					evidenceCount: evidence.metadata.evidenceCount,
					estimatedContextTokens: evidence.metadata.estimatedTokens,
					selectedTool,
				},
			})

			const validation = validateStructuredResponseContent(aiResponse.content)

			if (!validation.ok) {
				lastValidationError = validation.errors.join('; ')
				retryCount += 1
				continue
			}

			try {
				response = assertStructuredResponse(
					aiResponse.content,
					validationContext,
				)
				validationSuccess = true
				break
			} catch (error) {
				lastValidationError =
					error instanceof Error ? error.message : 'Grounded validation failed'
				retryCount += 1
			}
		}

		if (!aiResponse || !response) {
			recordAIObservability({
				requestId,
				timestamp: new Date().toISOString(),
				provider: config.provider,
				model: config.model,
				intent: legacyIntent,
				classifiedIntent: classifiedIntent.intent,
				knowledgeProvider: `${request.domain}-knowledge-provider`,
				knowledgeDomain: request.domain,
				promptTokens: aiResponse?.usage.promptTokens ?? 0,
				completionTokens: aiResponse?.usage.completionTokens ?? 0,
				totalTokens: aiResponse?.usage.totalTokens ?? 0,
				estimatedCostUsd: aiResponse?.estimatedCostUsd ?? 0,
				latencyMs: aiResponse?.latencyMs ?? 0,
				confidence: 0,
				cacheHit: false,
				validationSuccess: false,
				retryCount,
				evidenceCount: evidence.metadata.evidenceCount,
				excludedEvidence: evidence.metadata.excludedItems,
				estimatedContextTokens: evidence.metadata.estimatedTokens,
				selectedTool,
				toolExecutionTimeMs: toolResult.executionTimeMs,
				error: lastValidationError || 'Validation failed after retries',
			})

			throw new Error(
				lastValidationError || 'AI response validation failed after retries',
			)
		}

		recordAICost({
			requestId,
			provider: aiResponse.provider,
			model: aiResponse.model,
			intent: legacyIntent,
			promptTokens: aiResponse.usage.promptTokens,
			completionTokens: aiResponse.usage.completionTokens,
		})

		const observability = {
			requestId,
			timestamp: new Date().toISOString(),
			provider: aiResponse.provider,
			model: aiResponse.model,
			intent: legacyIntent,
			classifiedIntent: classifiedIntent.intent,
			knowledgeProvider: `${request.domain}-knowledge-provider`,
			knowledgeDomain: request.domain,
			promptTokens: aiResponse.usage.promptTokens,
			completionTokens: aiResponse.usage.completionTokens,
			totalTokens: aiResponse.usage.totalTokens,
			estimatedCostUsd: aiResponse.estimatedCostUsd,
			latencyMs: aiResponse.latencyMs,
			confidence: response.confidence,
			cacheHit: false,
			validationSuccess,
			retryCount,
			evidenceCount: evidence.metadata.evidenceCount,
			excludedEvidence: evidence.metadata.excludedItems,
			estimatedContextTokens: evidence.metadata.estimatedTokens,
			selectedTool,
			toolExecutionTimeMs: toolResult.executionTimeMs,
		}

		recordAIObservability(observability)

		return {
			requestId,
			intent: legacyIntent,
			domain: request.domain,
			classifiedIntent,
			selectedEvidence: evidence,
			selectedTool,
			toolResult,
			knowledge,
			response,
			observability,
			healthKnowledge,
		}
	}
}

export const defaultAIPlatformPipeline = createDefaultAIPlatformPipeline()
