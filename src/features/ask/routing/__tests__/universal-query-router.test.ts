import { describe, expect, it } from 'vitest'
import {
	classifyUniversalQuery,
	isHealthOnlyQuestion,
	prefersStructuredAnswer,
} from '@/features/ask/routing/universal-query-router'

describe('classifyUniversalQuery', () => {
	it('classifies LDL as health fact lookup', () => {
		const result = classifyUniversalQuery({ question: 'What is my LDL?' })

		expect(result.domains).toEqual(['health'])
		expect(result.questionKind).toBe('FACT_LOOKUP')
		expect(isHealthOnlyQuestion(result)).toBe(true)
		expect(prefersStructuredAnswer(result.questionKind)).toBe(true)
	})

	it('classifies car insurance expiry as cross-module status', () => {
		const result = classifyUniversalQuery({
			question: 'When does my car insurance expire?',
		})

		expect(result.domains).toContain('insurance')
		expect(result.domains).toContain('vehicles')
		expect(result.isCrossModule).toBe(true)
		expect(result.questionKind).toBe('CROSS_MODULE')
	})

	it('classifies home loan balance as finance latest value', () => {
		const result = classifyUniversalQuery({
			question: 'What is my home loan balance?',
		})

		expect(result.domains).toContain('finance')
		expect(['LATEST_VALUE', 'CROSS_MODULE']).toContain(result.questionKind)
	})

	it('classifies Pune home purchase as property fact lookup', () => {
		const result = classifyUniversalQuery({
			question: 'When did I buy my Pune home?',
		})

		expect(result.domains).toContain('property')
		expect(['FACT_LOOKUP', 'CROSS_MODULE']).toContain(result.questionKind)
	})

	it('classifies passport expiry as identity status', () => {
		const result = classifyUniversalQuery({
			question: 'When does my passport expire?',
		})

		expect(result.domains).toContain('identity')
		expect(['STATUS', 'FACT_LOOKUP']).toContain(result.questionKind)
	})

	it('classifies document coverage as cross-module coverage', () => {
		const result = classifyUniversalQuery({
			question: 'Do you have all my important documents?',
		})

		expect(result.questionKind).toBe('COVERAGE')
	})

	it('boosts context module without creating a separate route', () => {
		const result = classifyUniversalQuery({
			question: 'What is the outstanding amount?',
			contextModule: 'finance',
		})

		expect(result.domains[0]).toBe('finance')
		expect(isHealthOnlyQuestion(result)).toBe(false)
	})

	it('detects entity hints for XEV and Pune home', () => {
		const result = classifyUniversalQuery({
			question: 'Show me everything about my XEV 9e.',
		})

		expect(result.entityHints.some((hint) => /xev/i.test(hint))).toBe(true)

		const homeResult = classifyUniversalQuery({
			question: 'Show me everything about my Pune home.',
		})

		expect(homeResult.entityHints.some((hint) => /pune home/i.test(hint))).toBe(
			true,
		)
		expect(homeResult.domains).toContain('property')
	})
})

describe('prefersStructuredAnswer', () => {
	it('prefers structured answers for fact and status questions', () => {
		expect(prefersStructuredAnswer('FACT_LOOKUP')).toBe(true)
		expect(prefersStructuredAnswer('STATUS')).toBe(true)
		expect(prefersStructuredAnswer('EXPLAIN')).toBe(false)
		expect(prefersStructuredAnswer('GENERAL')).toBe(false)
	})
})
