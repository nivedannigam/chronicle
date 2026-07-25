import { describe, expect, it, beforeEach, vi } from 'vitest'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { resolveQuestionWithContext } from '@/features/ask/retrieval/intent-detector'
import {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
import {
	buildPersonalContext,
	buildConversationContext,
	assertMemberScopedUserId,
} from '@/features/personalization/services/personal-context.engine'
import {
	adaptAnswerForStyle,
	shouldIncludeAnswerCards,
} from '@/features/personalization/services/response-adapter.service'
import {
	filterUsageSignalsForUser,
	getFrequentTopicsForMember,
	recordUsageSignal,
} from '@/features/personalization/services/usage-tracker.service'
import {
	parsePersonalPreferences,
	saveLocalPersonalPreferences,
	loadLocalPersonalPreferences,
} from '@/features/personalization/services/personal-preferences.service'
import { buildPersonalizedSuggestions } from '@/features/personalization/services/personalized-suggestions.service'
import { DEFAULT_PERSONAL_PREFERENCES } from '@/features/personalization/types/personal-context.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'

const members: FamilyMemberWithAliases[] = [
	{
		id: 'member-a',
		userId: 'user-1',
		familyId: 'family-1',
		displayName: 'Alex',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'owner',
		dateOfBirth: null,
		gender: null,
		status: 'active',
		avatarUrl: null,
		sortOrder: 0,
		createdAt: '',
		updatedAt: '',
		aliases: ['Me'],
	},
	{
		id: 'member-b',
		userId: 'user-1',
		familyId: 'family-1',
		displayName: 'Sarah',
		relationship: 'spouse',
		isAccountOwner: false,
		roleId: 'adult',
		dateOfBirth: null,
		gender: null,
		status: 'active',
		avatarUrl: null,
		sortOrder: 1,
		createdAt: '',
		updatedAt: '',
		aliases: ['Sarah K'],
	},
]

describe('family member switching', () => {
	it('defaults to selected member when question does not name someone else', () => {
		const member = resolveMemberFromQuestion({
			question: 'What is my LDL?',
			selectedMemberId: 'member-a',
			selectedMemberName: 'Alex',
			members,
		})

		expect(member.memberId).toBe('member-a')
		expect(member.memberName).toBe('Alex')
	})

	it('switches to explicitly named family member', () => {
		const member = resolveMemberFromQuestion({
			question: "Show Sarah's latest report",
			selectedMemberId: 'member-a',
			selectedMemberName: 'Alex',
			members,
		})

		expect(member.memberId).toBe('member-b')
		expect(member.memberName).toBe('Sarah')
	})

	it('resolves member aliases in questions', () => {
		const member = resolveMemberFromQuestion({
			question: 'What does Sarah K need to review?',
			selectedMemberId: 'member-a',
			selectedMemberName: 'Alex',
			members,
		})

		expect(member.memberId).toBe('member-b')
	})

	it('uses separate session keys per member for privacy scoping', () => {
		expect(buildMemorySessionKey('user-1', 'member-a')).not.toBe(
			buildMemorySessionKey('user-1', 'member-b'),
		)
	})
})

describe('conversation continuity', () => {
	beforeEach(() => {
		conversationMemory.clear()
	})

	it('resolves LDL follow-up comparison question from prior metric topic', () => {
		const sessionKey = buildMemorySessionKey('user-1', 'member-a')

		conversationMemory.hydrateFromTurns(sessionKey, [
			{
				question: 'What was my latest LDL?',
				answer: 'Your LDL is 120.',
				intent: 'metric_lookup',
				metricName: 'LDL',
			},
		])

		const resolved = resolveQuestionWithContext(
			'How does that compare with last year?',
			conversationMemory.getPreviousTopic(sessionKey),
		)

		expect(resolved).toContain('LDL')
		expect(resolved.toLowerCase()).toContain('compare')
	})

	it('resolves trend follow-up after metric question', () => {
		const sessionKey = buildMemorySessionKey('user-1', 'member-a')

		conversationMemory.hydrateFromTurns(sessionKey, [
			{
				question: 'What was my latest LDL?',
				answer: 'Your LDL is 120.',
				intent: 'metric_lookup',
				metricName: 'LDL',
			},
		])

		const resolved = resolveQuestionWithContext(
			'Was it improving before that?',
			conversationMemory.getPreviousTopic(sessionKey),
		)

		expect(resolved).toContain('LDL')
		expect(resolved.toLowerCase()).toContain('trend')
	})

	it('builds conversation context from memory turns', () => {
		const sessionKey = buildMemorySessionKey('user-1', 'member-a')

		conversationMemory.hydrateFromTurns(sessionKey, [
			{
				question: 'What was my latest LDL?',
				answer: '120',
				intent: 'metric_lookup',
				metricName: 'LDL',
				memberId: 'member-a',
				memberName: 'Alex',
			},
		])

		const context = buildConversationContext(sessionKey)

		expect(context.lastMetricName).toBe('LDL')
		expect(context.turnCount).toBe(1)
	})
})

describe('preference persistence', () => {
	const storage = new Map<string, string>()

	beforeEach(() => {
		storage.clear()
		const localStorageMock = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value)
			},
			removeItem: (key: string) => {
				storage.delete(key)
			},
			clear: () => storage.clear(),
		}
		vi.stubGlobal('window', { localStorage: localStorageMock })
		vi.stubGlobal('localStorage', localStorageMock)
	})

	it('parses stored preferences with defaults for missing fields', () => {
		const parsed = parsePersonalPreferences({
			communicationStyle: 'simple',
		})

		expect(parsed.communicationStyle).toBe('simple')
		expect(parsed.units).toBe('metric')
	})

	it('persists preferences locally per user', () => {
		saveLocalPersonalPreferences('user-test', {
			...DEFAULT_PERSONAL_PREFERENCES,
			communicationStyle: 'clinical',
		})

		const loaded = loadLocalPersonalPreferences('user-test')
		expect(loaded.communicationStyle).toBe('clinical')
	})
})

describe('response adaptation', () => {
	it('shortens answers for simple style', () => {
		const answer =
			'Your LDL is 120 mg/dL. It has improved since last year. This is within a reasonable range for monitoring. This is informational and not medical advice.'

		const adapted = adaptAnswerForStyle({
			answer,
			style: 'simple',
			knowledge: null,
		})

		expect(adapted.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4)
	})

	it('includes clinical structured detail for clinical style', () => {
		const adapted = adaptAnswerForStyle({
			answer: 'Your LDL is 120.',
			style: 'clinical',
			knowledge: {
				domain: 'health',
				intent: 'metric_lookup',
				reports: [],
				metrics: [
					{
						canonicalId: 'ldl',
						displayName: 'LDL',
						latestValue: '120',
						unit: 'mg/dL',
						status: 'normal',
						referenceRange: '<100',
						trend: 'stable',
						categoryId: 'heart',
						reportId: 'r1',
						reportTitle: 'Lipid',
						observedAt: '2026-01-01',
					},
				],
				timelines: [],
				trends: [],
				observations: [],
				relationships: [],
				insights: [],
				alerts: [],
				summaryLines: [],
				comparisons: [],
			},
		})

		expect(adapted).toContain('Structured findings')
		expect(adapted).toContain('ref:')
	})

	it('hides cards for simple summary display format', () => {
		expect(shouldIncludeAnswerCards('simple', 'summary')).toBe(false)
		expect(shouldIncludeAnswerCards('detailed', 'detailed')).toBe(true)
	})
})

describe('privacy isolation', () => {
	const storage = new Map<string, string>()

	beforeEach(() => {
		conversationMemory.clear()
		storage.clear()
		const localStorageMock = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value)
			},
			removeItem: (key: string) => {
				storage.delete(key)
			},
			clear: () => storage.clear(),
		}
		vi.stubGlobal('window', { localStorage: localStorageMock })
		vi.stubGlobal('localStorage', localStorageMock)
	})

	it('throws when personal context user mismatches requested user', () => {
		const context = buildPersonalContext({
			userId: 'user-a',
			question: 'What is my LDL?',
			selectedMemberId: 'member-a',
			selectedMemberName: 'Alex',
			members,
			preferences: DEFAULT_PERSONAL_PREFERENCES,
			sessionKey: buildMemorySessionKey('user-a', 'member-a'),
		})

		expect(() => assertMemberScopedUserId(context, 'user-b')).toThrow(
			/data isolation/i,
		)
	})

	it('keeps usage signals scoped per user', () => {
		recordUsageSignal({
			userId: 'user-a',
			memberId: 'member-a',
			type: 'ask_question',
			topic: 'LDL',
			timestamp: new Date().toISOString(),
		})

		recordUsageSignal({
			userId: 'user-b',
			memberId: 'member-b',
			type: 'ask_question',
			topic: 'HbA1c',
			timestamp: new Date().toISOString(),
		})

		expect(getFrequentTopicsForMember('user-a', 'member-a')).toEqual(['LDL'])
		expect(getFrequentTopicsForMember('user-b', 'member-b')).toEqual(['HbA1c'])

		const filtered = filterUsageSignalsForUser('user-a', [
			{
				userId: 'user-a',
				memberId: 'member-a',
				type: 'ask_question',
				timestamp: '',
			},
			{
				userId: 'user-b',
				memberId: 'member-b',
				type: 'ask_question',
				timestamp: '',
			},
		])

		expect(filtered).toHaveLength(1)
		expect(filtered[0]?.userId).toBe('user-a')
	})
})

describe('personalized suggestions', () => {
	it('includes member-scoped latest report suggestion', () => {
		const suggestions = buildPersonalizedSuggestions({
			userId: 'user-1',
			memberId: 'member-a',
			memberName: 'Alex',
			uploadedReports: [
				{
					id: 'report-1',
					user_id: 'user-1',
					family_member_id: 'member-a',
					file_name: 'lipid.pdf',
					storage_path: 'path',
					report_date: '2026-01-01',
					report_type: 'lab',
					uploaded_at: '2026-01-01',
					created_at: '2026-01-01',
					status: 'completed',
					extracted_text: null,
					parsed_data: null,
					ocr_page_count: null,
					ocr_confidence: null,
					ocr_provider: null,
					ocr_processing_time_ms: null,
					ocr_metadata: null,
					processed_at: null,
					processing_error: null,
				},
			],
			preferences: DEFAULT_PERSONAL_PREFERENCES,
			recentQuestions: [],
		})

		expect(
			suggestions.some((item) => item.includes("Alex's latest report")),
		).toBe(true)
	})
})
