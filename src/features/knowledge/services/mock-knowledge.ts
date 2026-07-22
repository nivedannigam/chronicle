import { C } from '@/constants/colors'
import type {
	CreateKnowledgeItemInput,
	KnowledgeItem,
} from '@/features/knowledge/types'

const MOCK_USER_ID = 'mock-user'

export const MOCK_KNOWLEDGE_SEED: CreateKnowledgeItemInput[] = [
	{
		userId: MOCK_USER_ID,
		type: 'Event',
		title: 'Team standup',
		summary: 'Team standup · 30 min',
		source: 'calendar',
		sourceId: 'event-standup-2026-07-20',
		tags: ['work', 'calendar'],
		confidence: 1,
		metadata: { displayTime: '9:00 AM', color: C.accentBlue },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Email',
		title: 'Reply to Priya re: Series A',
		summary: 'Pitch deck feedback requires review by Friday.',
		source: 'mail',
		sourceId: 'email-priya-series-a',
		tags: ['work', 'reply'],
		confidence: 0.95,
		metadata: { displayTime: '11:30 AM', color: C.red },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Finance',
		title: 'HDFC payment reminder',
		summary: 'Credit card payment of ₹24,800 due today.',
		source: 'finance',
		sourceId: 'finance-hdfc-payment',
		tags: ['finance', 'bill'],
		confidence: 0.99,
		metadata: { displayTime: '5:00 PM', color: C.orange },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Trip',
		title: 'Paris trip begins',
		summary: 'Flight arrives at CDG · Aug 14',
		source: 'travel',
		sourceId: 'trip-paris-2026-08',
		tags: ['travel', 'paris'],
		confidence: 1,
		metadata: { displayTime: 'Aug 14', color: C.green },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Task',
		title: 'Review Q2 expense report',
		summary: 'Overdue finance task from Zerodha module.',
		source: 'tasks',
		sourceId: 'task-q2-expense',
		tags: ['finance', 'overdue'],
		confidence: 0.9,
		metadata: { displayTime: 'Today', color: C.red },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Document',
		title: 'Passport scan added',
		summary: 'Identity document stored in Documents.',
		source: 'documents',
		sourceId: 'doc-passport-scan',
		tags: ['identity', 'travel'],
		confidence: 1,
		metadata: { displayTime: 'Yesterday', color: C.accent },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Photo',
		title: '18 new photos',
		summary: 'Photos imported this week.',
		source: 'system',
		sourceId: 'photos-week-2026-07',
		tags: ['photos'],
		confidence: 1,
		metadata: { displayTime: 'This week', color: C.photos },
	},
	{
		userId: MOCK_USER_ID,
		type: 'Insurance',
		title: 'Travel insurance quote',
		summary: 'Paris trip insurance options ready for review.',
		source: 'travel',
		sourceId: 'insurance-paris-quote',
		tags: ['travel', 'insurance'],
		confidence: 0.85,
		metadata: { displayTime: 'Jul 18', color: C.teal },
	},
]

export function isMockSeedUser(userId: string): boolean {
	return userId === MOCK_USER_ID
}

export function getMockSeedInputs(userId: string): CreateKnowledgeItemInput[] {
	if (userId === MOCK_USER_ID) {
		return MOCK_KNOWLEDGE_SEED.map((item) => ({ ...item, userId }))
	}

	return MOCK_KNOWLEDGE_SEED.map((item) => ({
		...item,
		userId,
		sourceId: `${item.sourceId}-${userId.slice(0, 8)}`,
	}))
}

export function buildKnowledgeItemFromInput(
	input: CreateKnowledgeItemInput,
	id = crypto.randomUUID(),
): KnowledgeItem {
	const now = new Date().toISOString()

	return {
		id,
		userId: input.userId,
		type: input.type,
		title: input.title,
		summary: input.summary,
		source: input.source,
		sourceId: input.sourceId,
		tags: input.tags ?? [],
		confidence: input.confidence ?? 1,
		createdAt: now,
		updatedAt: now,
		metadata: input.metadata ?? {},
	}
}
