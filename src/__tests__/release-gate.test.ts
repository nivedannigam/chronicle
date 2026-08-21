import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import {
	ACTIVE_LIFE_MODULE_IDS,
	COMING_SOON_MODULE_IDS,
	getAvailableLifeModules,
	LIFE_MODULE_REGISTRY,
} from '@/constants/modules'
import { askReasoningEngine } from '@/features/ask/services/ask-engine.factory'
import { aiAskReasoningEngine } from '@/features/ask/services/ai-ask-reasoning.engine'
import { classifyUniversalQuery } from '@/features/ask/routing/universal-query-router'
import { buildStructuredUniversalTurn } from '@/features/ask/services/universal-ask-turn.builder'
import { mergeCrossModuleEvidence } from '@/shared/ai/evidence-planning/cross-module-evidence.adapter'
import {
	IMPORT_TIMELINE_EVENT_TYPES,
	isLifeTimelineEvent,
} from '@/features/timeline/utils/life-timeline.utils'
import { runPropertyIntegrityAudit } from '@/features/property-knowledge'
import { runPlatformIntegrityAudit } from '@/core/platform'

describe('Chronicle release gate', () => {
	it('uses production Ask engine rather than mock reasoning', () => {
		expect(askReasoningEngine).toBe(aiAskReasoningEngine)
	})

	it('keeps all six beta modules navigable', () => {
		const navigableIds = getAvailableLifeModules().map((module) => module.id)
		expect(
			ACTIVE_LIFE_MODULE_IDS.every((id) => navigableIds.includes(id)),
		).toBe(true)
		expect(navigableIds).toContain('property')
	})

	it('limits coming soon modules to future domains only', () => {
		expect(COMING_SOON_MODULE_IDS).toEqual([
			'travel',
			'education',
			'employment',
		])
		expect(
			LIFE_MODULE_REGISTRY.find((module) => module.id === 'property')?.status,
		).toBe('available')
	})

	it('filters import/system events out of life timeline', () => {
		for (const eventType of IMPORT_TIMELINE_EVENT_TYPES) {
			expect(
				isLifeTimelineEvent({
					id: eventType,
					title: 'System event',
					eventType,
					eventDate: '2026-01-01',
					domain: 'documents',
				}),
			).toBe(false)
		}
	})

	it('asks for clarification instead of guessing ambiguous balances', () => {
		const classification = classifyUniversalQuery({
			question: 'What is my latest balance?',
		})
		const turn = buildStructuredUniversalTurn({
			question: 'What is my latest balance?',
			classification,
			bundle: mergeCrossModuleEvidence({ domainBundles: [] }),
			memberId: null,
			memberName: null,
			domains: ['finance'],
		})

		expect(turn.answer).toContain('Which balance should I check')
	})

	it('prevents finance entity leakage from property home-loan reference docs', () => {
		const audit = runPropertyIntegrityAudit({
			userId: 'release-gate-user',
			documents: [
				{
					id: 'doc-home-loan',
					category_id: 'property',
					sub_category_id: 'home-loan',
					file_name: 'home-loan-statement.pdf',
					status: 'ready',
				} as never,
			],
			hasFolderAssigned: true,
		})

		expect(audit.findings.financeEntityLeakage).toEqual([])
	})

	it('includes property in platform integrity audit modules', () => {
		const audit = runPlatformIntegrityAudit({ documents: [] })
		expect(audit.modules.some((module) => module.moduleId === 'property')).toBe(
			true,
		)
	})

	it('gates DEV-only debug routes in production router', () => {
		const routerSource = readFileSync(
			resolve(process.cwd(), 'src/app/router.tsx'),
			'utf8',
		)

		expect(routerSource).toContain('const isDev = import.meta.env.DEV')
		expect(routerSource).toContain('ROUTES.healthKnowledgeDebug')
		expect(routerSource).toContain('ROUTES.connectorsDebug')
		expect(routerSource).toContain('ROUTES.healthOcrPreview')
	})

	it('redirects legacy module Ask routes to universal Ask', () => {
		expect(ROUTES.healthAsk).toBe('/health/ask')
		expect(ROUTES.insuranceAsk).toBe('/insurance/ask')
		expect(ROUTES.vehiclesAsk).toBe('/vehicles/ask')
	})

	it('registers first-class Property module routes', () => {
		expect(ROUTES.property).toBe('/property')
		expect(ROUTES.propertySettings).toBe('/property/settings')
		expect(ROUTES.propertyHistory).toBe('/property/history')
		expect(
			LIFE_MODULE_REGISTRY.find((module) => module.id === 'property')?.route,
		).toBe(ROUTES.property)
	})
})
