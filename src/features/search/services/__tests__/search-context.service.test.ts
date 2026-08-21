import { describe, expect, it } from 'vitest'
import {
	applySearchContextRanking,
	parseSearchContextModule,
	resolveSearchScopeCopy,
} from '@/features/search/services/search-context.service'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'

function hit(
	overrides: Partial<SemanticSearchHit> &
		Pick<SemanticSearchHit, 'id' | 'domain'>,
): SemanticSearchHit {
	return {
		kind: 'report',
		title: 'Example',
		snippet: '',
		score: 0.5,
		...overrides,
	}
}

describe('parseSearchContextModule', () => {
	it('parses supported module contexts', () => {
		expect(parseSearchContextModule('finance')).toBe('finance')
		expect(parseSearchContextModule('IDENTITY')).toBe('identity')
		expect(parseSearchContextModule('health')).toBe('health')
	})

	it('returns null for unknown contexts', () => {
		expect(parseSearchContextModule('personal')).toBeNull()
		expect(parseSearchContextModule(null)).toBeNull()
	})
})

describe('resolveSearchScopeCopy', () => {
	it('uses global copy when no context is set', () => {
		expect(resolveSearchScopeCopy(null).title).toBe('Search')
		expect(resolveSearchScopeCopy(null).placeholder).toBe('Search everything…')
	})

	it('scopes copy to finance search', () => {
		const copy = resolveSearchScopeCopy('finance')

		expect(copy.title).toBe('Finance search')
		expect(copy.subtitle).toContain('finance')
		expect(copy.emptyMessage).toContain('finance')
	})
})

describe('applySearchContextRanking', () => {
	it('boosts hits from the requested module', () => {
		const ranked = applySearchContextRanking(
			[
				hit({ id: 'health-1', domain: 'health', score: 0.9 }),
				hit({ id: 'finance-1', domain: 'finance', score: 0.7 }),
			],
			'finance',
		)

		expect(ranked[0]?.id).toBe('finance-1')
	})

	it('leaves ordering unchanged without context', () => {
		const hits = [
			hit({ id: 'health-1', domain: 'health', score: 0.9 }),
			hit({ id: 'finance-1', domain: 'finance', score: 0.7 }),
		]

		expect(applySearchContextRanking(hits, null)).toEqual(hits)
	})
})
