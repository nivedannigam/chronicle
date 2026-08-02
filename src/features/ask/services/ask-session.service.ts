import type { AskConversationTurn } from '@/features/ask/types'
import { buildMemorySessionKey } from '@/features/intelligence/services/member-context.service'

const SESSION_INDEX_KEY = 'chronicle:ask:session-index'
const SESSION_DATA_PREFIX = 'chronicle:ask:session:'
const LEGACY_STORAGE_KEY = 'chronicle:ask:conversations'
const MIGRATION_V2_KEY = 'chronicle:ask:migration-v2'

export interface AskSessionMeta {
	id: string
	title: string
	memberId: string | null
	memberName: string | null
	sessionKey: string | null
	createdAt: string
	updatedAt: string
	turnCount: number
	preview: string
	pinned?: boolean
	archived?: boolean
}

export const MAX_PINNED_ASK_SESSIONS = 3
const RECENT_SESSION_DAYS = 7
const RECENT_SESSION_CAP = 5
const HOME_SESSION_CAP = 3

function readIndex(): AskSessionMeta[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(SESSION_INDEX_KEY)
		const parsed = raw ? (JSON.parse(raw) as AskSessionMeta[]) : []
		return parsed.map(normalizeSessionMeta)
	} catch {
		return []
	}
}

function normalizeSessionMeta(session: AskSessionMeta): AskSessionMeta {
	const userId = parseUserIdFromSessionId(session.id)

	return {
		...session,
		pinned: session.pinned === true,
		archived: session.archived === true,
		sessionKey:
			session.sessionKey ??
			(userId ? buildMemorySessionKey(userId, session.memberId) : null),
	}
}

export function sortAskSessions(sessions: AskSessionMeta[]): AskSessionMeta[] {
	return [...sessions].sort((left, right) => {
		const leftPinned = left.pinned ? 1 : 0
		const rightPinned = right.pinned ? 1 : 0

		if (leftPinned !== rightPinned) {
			return rightPinned - leftPinned
		}

		return (
			new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
		)
	})
}

function writeIndex(sessions: AskSessionMeta[]): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(sessions))
	} catch {
		// Ignore quota errors.
	}
}

function sessionDataKey(sessionId: string): string {
	return `${SESSION_DATA_PREFIX}${sessionId}`
}

function deriveTitle(question: string): string {
	const cleaned = question.trim().replace(/\s+/g, ' ')
	return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned
}

export function parseUserIdFromSessionId(sessionId: string): string | null {
	const separatorIndex = sessionId.indexOf(':')

	if (separatorIndex <= 0) {
		return null
	}

	return sessionId.slice(0, separatorIndex)
}

export function parseMemberIdFromSessionKey(sessionKey: string): string | null {
	const separatorIndex = sessionKey.indexOf(':')

	if (separatorIndex < 0) {
		return null
	}

	const memberPart = sessionKey.slice(separatorIndex + 1)
	return memberPart === 'default' ? null : memberPart
}

export function buildSessionDedupeKey(input: {
	title: string
	turnCount: number
	memberId: string | null
	firstQuestion?: string
}): string {
	const label = (input.firstQuestion ?? input.title).trim().toLowerCase()
	const normalized = label.replace(/\s+/g, ' ')
	return `${normalized}|${input.turnCount}|${input.memberId ?? 'default'}`
}

function readMigrationV2Store(): Record<string, boolean> {
	if (typeof window === 'undefined') {
		return {}
	}

	try {
		const raw = window.localStorage.getItem(MIGRATION_V2_KEY)
		return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
	} catch {
		return {}
	}
}

function writeMigrationV2Store(store: Record<string, boolean>): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(MIGRATION_V2_KEY, JSON.stringify(store))
	} catch {
		// Ignore quota errors.
	}
}

function hasCompletedMigrationV2(userId: string): boolean {
	return readMigrationV2Store()[userId] === true
}

function markMigrationV2Complete(userId: string): void {
	writeMigrationV2Store({
		...readMigrationV2Store(),
		[userId]: true,
	})
}

export function loadSessionTurns(sessionId: string): AskConversationTurn[] {
	if (typeof window === 'undefined' || !sessionId) {
		return []
	}

	try {
		const raw = window.localStorage.getItem(sessionDataKey(sessionId))
		return raw ? (JSON.parse(raw) as AskConversationTurn[]) : []
	} catch {
		return []
	}
}

export function saveSessionTurns(
	sessionId: string,
	turns: AskConversationTurn[],
): void {
	if (typeof window === 'undefined' || !sessionId) {
		return
	}

	try {
		window.localStorage.setItem(
			sessionDataKey(sessionId),
			JSON.stringify(turns.slice(-50)),
		)
	} catch {
		// Ignore quota errors.
	}
}

export function listAskSessions(
	userId: string,
	options?: { includeArchived?: boolean },
): AskSessionMeta[] {
	const includeArchived = options?.includeArchived ?? false

	return sortAskSessions(
		readIndex()
			.filter((session) => session.id.startsWith(`${userId}:`))
			.filter((session) => includeArchived || !session.archived),
	)
}

export function listArchivedAskSessions(userId: string): AskSessionMeta[] {
	return sortAskSessions(
		readIndex().filter(
			(session) =>
				session.id.startsWith(`${userId}:`) && session.archived === true,
		),
	)
}

export function listAskSessionsForHome(userId: string): AskSessionMeta[] {
	return listAskSessions(userId).slice(0, HOME_SESSION_CAP)
}

export interface AskSessionDrawerGroups {
	pinned: AskSessionMeta[]
	recent: AskSessionMeta[]
	older: AskSessionMeta[]
	archived: AskSessionMeta[]
}

export function groupAskSessionsForDrawer(
	userId: string,
	options?: { includeArchived?: boolean },
): AskSessionDrawerGroups {
	const includeArchived = options?.includeArchived ?? false
	const active = listAskSessions(userId)
	const pinned = active.filter((session) => session.pinned)
	const unpinned = active.filter((session) => !session.pinned)
	const recentCutoff = Date.now() - RECENT_SESSION_DAYS * 24 * 60 * 60 * 1000
	const recent = unpinned
		.filter((session) => new Date(session.updatedAt).getTime() >= recentCutoff)
		.slice(0, RECENT_SESSION_CAP)
	const recentIds = new Set(recent.map((session) => session.id))
	const older = unpinned.filter((session) => !recentIds.has(session.id))

	return {
		pinned,
		recent,
		older,
		archived: includeArchived ? listArchivedAskSessions(userId) : [],
	}
}

export function searchAskSessions(
	userId: string,
	query: string,
): AskSessionMeta[] {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return listAskSessions(userId)
	}

	return listAskSessions(userId, { includeArchived: true }).filter(
		(session) =>
			session.title.toLowerCase().includes(normalized) ||
			session.preview.toLowerCase().includes(normalized),
	)
}

function updateSessionMeta(
	sessionId: string,
	patch: Partial<Pick<AskSessionMeta, 'pinned' | 'archived' | 'title'>>,
): AskSessionMeta | null {
	const index = readIndex()
	const session = index.find((entry) => entry.id === sessionId)

	if (!session) {
		return null
	}

	Object.assign(session, patch, { updatedAt: new Date().toISOString() })
	writeIndex(index)
	return session
}

export function pinAskSession(sessionId: string): 'ok' | 'limit' {
	const userId = parseUserIdFromSessionId(sessionId)

	if (!userId) {
		return 'limit'
	}

	const pinned = listAskSessions(userId).filter((session) => session.pinned)

	if (pinned.length >= MAX_PINNED_ASK_SESSIONS) {
		const oldestPinned = [...pinned].sort(
			(a, b) =>
				new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
		)[0]

		if (oldestPinned && oldestPinned.id !== sessionId) {
			updateSessionMeta(oldestPinned.id, { pinned: false })
		}
	}

	updateSessionMeta(sessionId, { pinned: true, archived: false })
	return 'ok'
}

export function unpinAskSession(sessionId: string): void {
	updateSessionMeta(sessionId, { pinned: false })
}

export function archiveAskSession(sessionId: string): void {
	updateSessionMeta(sessionId, { archived: true, pinned: false })
}

export function unarchiveAskSession(sessionId: string): void {
	updateSessionMeta(sessionId, { archived: false })
}

export function findLatestSessionForMember(
	userId: string,
	memberId: string | null,
): AskSessionMeta | null {
	const sessions = listAskSessions(userId).filter(
		(session) => session.memberId === memberId,
	)

	if (sessions.length === 0) {
		return null
	}

	const withTurns = sessions.find((session) => session.turnCount > 0)
	if (withTurns) {
		return withTurns
	}

	return sessions[0] ?? null
}

export function resolveActiveAskSession(input: {
	userId: string
	memberId: string | null
}): AskSessionMeta | null {
	return findLatestSessionForMember(input.userId, input.memberId)
}

export function createAskSession(input: {
	userId: string
	memberId: string | null
	memberName: string | null
	title?: string
}): AskSessionMeta {
	const now = new Date().toISOString()
	const session: AskSessionMeta = {
		id: `${input.userId}:${crypto.randomUUID()}`,
		title: input.title ?? 'New conversation',
		memberId: input.memberId,
		memberName: input.memberName,
		sessionKey: buildMemorySessionKey(input.userId, input.memberId),
		createdAt: now,
		updatedAt: now,
		turnCount: 0,
		preview: '',
	}

	const index = readIndex()
	index.unshift(session)
	writeIndex(index.slice(0, 40))
	saveSessionTurns(session.id, [])

	return session
}

export function ensureAskSession(input: {
	userId: string
	memberId: string | null
	memberName: string | null
}): AskSessionMeta {
	const existing = resolveActiveAskSession({
		userId: input.userId,
		memberId: input.memberId,
	})

	if (existing) {
		if (input.memberName && !existing.memberName) {
			const index = readIndex()
			const session = index.find((entry) => entry.id === existing.id)

			if (session) {
				session.memberName = input.memberName
				session.updatedAt = new Date().toISOString()
				writeIndex(index)
			}
		}

		return existing
	}

	return createAskSession(input)
}

export function upsertSessionFromTurns(input: {
	sessionId: string
	turns: AskConversationTurn[]
	memberId: string | null
	memberName: string | null
}): void {
	saveSessionTurns(input.sessionId, input.turns)

	const index = readIndex()
	const existing = index.find((session) => session.id === input.sessionId)
	const firstQuestion = input.turns[0]?.question ?? ''
	const lastAnswer = input.turns[input.turns.length - 1]?.answer ?? ''
	const now = new Date().toISOString()
	const userId = parseUserIdFromSessionId(input.sessionId)

	const updated: AskSessionMeta = existing
		? {
				...existing,
				memberId: input.memberId ?? existing.memberId,
				memberName: input.memberName ?? existing.memberName,
				sessionKey:
					existing.sessionKey ??
					(userId
						? buildMemorySessionKey(userId, input.memberId ?? existing.memberId)
						: null),
				updatedAt: now,
				turnCount: input.turns.length,
				preview: lastAnswer.slice(0, 120),
				title:
					existing.title === 'New conversation' && firstQuestion
						? deriveTitle(firstQuestion)
						: existing.title,
			}
		: {
				id: input.sessionId,
				title: firstQuestion ? deriveTitle(firstQuestion) : 'New conversation',
				memberId: input.memberId,
				memberName: input.memberName,
				sessionKey: userId
					? buildMemorySessionKey(userId, input.memberId)
					: null,
				createdAt: now,
				updatedAt: now,
				turnCount: input.turns.length,
				preview: lastAnswer.slice(0, 120),
			}

	const nextIndex = [
		updated,
		...index.filter((session) => session.id !== input.sessionId),
	].slice(0, 40)

	writeIndex(nextIndex)
}

export function loadTurnsForSessionKey(
	sessionKey: string,
): AskConversationTurn[] {
	const separatorIndex = sessionKey.indexOf(':')

	if (separatorIndex <= 0) {
		return []
	}

	const userId = sessionKey.slice(0, separatorIndex)
	const memberId = parseMemberIdFromSessionKey(sessionKey)
	const session = findLatestSessionForMember(userId, memberId)

	if (!session) {
		return []
	}

	return loadSessionTurns(session.id)
}

export function dedupeAskSessions(userId: string): void {
	const sessions = listAskSessions(userId)
	const keepIds = new Set<string>()
	const groups = new Map<string, AskSessionMeta[]>()

	for (const session of sessions) {
		const turns = loadSessionTurns(session.id)
		const key = buildSessionDedupeKey({
			title: session.title,
			turnCount: session.turnCount,
			memberId: session.memberId,
			firstQuestion: turns[0]?.question,
		})
		const group = groups.get(key) ?? []
		group.push(session)
		groups.set(key, group)
	}

	for (const group of groups.values()) {
		const sorted = [...group].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)
		const [keeper, ...duplicates] = sorted

		if (keeper) {
			keepIds.add(keeper.id)
		}

		for (const duplicate of duplicates) {
			if (typeof window !== 'undefined') {
				try {
					window.localStorage.removeItem(sessionDataKey(duplicate.id))
				} catch {
					// Ignore.
				}
			}
		}
	}

	const emptyByMember = new Map<string, AskSessionMeta[]>()

	for (const session of sessions) {
		if (session.turnCount > 0 || session.title !== 'New conversation') {
			continue
		}

		const memberKey = session.memberId ?? 'default'
		const group = emptyByMember.get(memberKey) ?? []
		group.push(session)
		emptyByMember.set(memberKey, group)
	}

	for (const group of emptyByMember.values()) {
		const sorted = [...group].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)
		const [keeper, ...duplicates] = sorted

		if (keeper) {
			keepIds.add(keeper.id)
		}

		for (const duplicate of duplicates) {
			if (typeof window !== 'undefined') {
				try {
					window.localStorage.removeItem(sessionDataKey(duplicate.id))
				} catch {
					// Ignore.
				}
			}
		}
	}

	const nextIndex = sessions.filter((session) => {
		if (session.turnCount === 0 && session.title === 'New conversation') {
			return keepIds.has(session.id)
		}

		const turns = loadSessionTurns(session.id)
		const key = buildSessionDedupeKey({
			title: session.title,
			turnCount: session.turnCount,
			memberId: session.memberId,
			firstQuestion: turns[0]?.question,
		})
		const group = groups.get(key) ?? [session]
		const sorted = [...group].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)

		return sorted[0]?.id === session.id
	})

	writeIndex(nextIndex)
}

export function renameAskSession(sessionId: string, title: string): void {
	const index = readIndex()
	const session = index.find((entry) => entry.id === sessionId)

	if (!session) {
		return
	}

	session.title = title.trim() || session.title
	session.updatedAt = new Date().toISOString()
	writeIndex(index)
}

export function deleteAskSession(sessionId: string): void {
	writeIndex(readIndex().filter((session) => session.id !== sessionId))

	if (typeof window !== 'undefined') {
		try {
			window.localStorage.removeItem(sessionDataKey(sessionId))
		} catch {
			// Ignore.
		}
	}
}

/** Remove all Ask sessions for a user from browser storage. */
export function clearAllAskSessions(userId: string): void {
	clearAllAskSessionsForUser(userId)
}

/** @deprecated Use clearAllAskSessions */
export function clearAllAskSessionsForUser(userId: string): void {
	if (typeof window === 'undefined' || !userId) {
		return
	}

	const sessions = readIndex().filter((session) =>
		session.id.startsWith(`${userId}:`),
	)

	for (const session of sessions) {
		try {
			window.localStorage.removeItem(sessionDataKey(session.id))
		} catch {
			// Ignore.
		}
	}

	writeIndex(
		readIndex().filter((session) => !session.id.startsWith(`${userId}:`)),
	)

	try {
		window.localStorage.removeItem(LEGACY_STORAGE_KEY)
	} catch {
		// Ignore.
	}

	const migrationStore = readMigrationV2Store()
	delete migrationStore[userId]
	writeMigrationV2Store(migrationStore)
}

function importLegacyTurnsForUser(userId: string): void {
	const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)

	if (!raw) {
		return
	}

	const store = JSON.parse(raw) as Record<string, AskConversationTurn[]>
	const existingSessions = listAskSessions(userId)

	for (const [sessionKey, turns] of Object.entries(store)) {
		if (!sessionKey.startsWith(userId) || turns.length === 0) {
			continue
		}

		const memberId = parseMemberIdFromSessionKey(sessionKey)
		const dedupeKey = buildSessionDedupeKey({
			title: turns[0]?.question ?? 'Imported chat',
			turnCount: turns.length,
			memberId,
			firstQuestion: turns[0]?.question,
		})

		const alreadyImported = existingSessions.some((session) => {
			const sessionTurns = loadSessionTurns(session.id)
			return (
				buildSessionDedupeKey({
					title: session.title,
					turnCount: session.turnCount,
					memberId: session.memberId,
					firstQuestion: sessionTurns[0]?.question,
				}) === dedupeKey
			)
		})

		if (alreadyImported) {
			continue
		}

		const session = createAskSession({
			userId,
			memberId: turns[0]?.memberId ?? memberId,
			memberName: turns[0]?.memberName ?? null,
			title: turns[0]?.question
				? deriveTitle(turns[0].question)
				: 'Imported chat',
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns,
			memberId: turns[0]?.memberId ?? memberId,
			memberName: turns[0]?.memberName ?? null,
		})
	}

	window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/** One-time legacy import + dedupe. Safe to call on app load. */
export function initializeAskSessions(userId: string): void {
	if (typeof window === 'undefined' || !userId) {
		return
	}

	try {
		if (!hasCompletedMigrationV2(userId)) {
			importLegacyTurnsForUser(userId)
			markMigrationV2Complete(userId)
		}

		dedupeAskSessions(userId)
	} catch {
		// Ignore migration failures.
	}
}

/** @deprecated Use initializeAskSessions */
export function migrateLegacySessions(userId: string): void {
	initializeAskSessions(userId)
}
