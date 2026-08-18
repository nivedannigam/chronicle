/**
 * Universal Module UX Contract
 *
 * Domain-agnostic vocabulary and lifecycle states for all Chronicle modules.
 * Import from here — do not duplicate status strings inside modules.
 */

/** Conceptual module lifecycle — maps to user mental model, not backend state. */
export type ModuleLifecycleState =
	'NOT_SETUP' | 'READY' | 'ATTENTION' | 'ORGANIZING' | 'EMPTY' | 'ERROR'

/** Consumer-facing copy shared across modules. Never expose pipeline/OCR/import jargon. */
export const MODULE_UX_COPY = {
	organizing: {
		title: 'Still organizing',
		body: 'Chronicle is reading your documents. This usually takes a moment.',
		short: 'Still organizing…',
	},
	organizingReports: {
		title: 'Still organizing your reports',
		body: 'Your reports will appear here once Chronicle finishes organizing them.',
	},
	organizingPolicies: {
		title: 'Looking for policies',
		body: 'Your insurance folder is connected. Policies will appear here once they are organized.',
	},
	emptyGeneric: {
		title: 'Nothing here yet',
		body: 'Connect your folder to get started.',
	},
	errorGeneric: {
		title: 'Something went wrong',
		body: 'Try again in a moment.',
	},
	errorLoad: {
		title: 'Could not load this section',
		body: 'Check your connection and try again.',
	},
	needsClearerCopy: 'Needs a clearer copy',
	stillOrganizing: 'Still organizing',
	onFile: 'On file',
	allSet: 'All set',
	setupAction: 'Set up',
	tryAgain: 'Try again',
	viewSettings: 'View settings',
} as const

/** Maps backend-ish labels to contract lifecycle states (for documentation and hub cards). */
export const MODULE_LIFECYCLE_ALIASES = {
	setup_required: 'NOT_SETUP',
	active: 'READY',
	attention: 'ATTENTION',
	organizing: 'ORGANIZING',
	empty: 'EMPTY',
	error: 'ERROR',
	not_connected: 'NOT_SETUP',
	ready: 'READY',
} as const satisfies Record<string, ModuleLifecycleState>

/** Standard Settings section labels — use in module Settings layouts. */
export const MODULE_SETTINGS_SECTIONS = {
	connectedFolder: 'Connected folder',
	privacy: 'Privacy',
	advanced: 'Advanced',
	family: 'Family',
} as const

/** Standard module back navigation label. */
export const MODULE_BACK_LABEL = 'Modules'

/** Platform capabilities — modules deep-link here; do not duplicate. */
export const PLATFORM_SURFACES = {
	library: 'Library',
	ask: 'Ask',
	timeline: 'Timeline',
	search: 'Search',
	you: 'You',
	modules: 'Modules',
	home: 'Home',
} as const

export function moduleOrganizingMessage(entityLabel: string): string {
	return `Organizing your ${entityLabel}…`
}

export function moduleEmptyMessage(entityLabel: string): string {
	return `No ${entityLabel} found yet.`
}

export function moduleAttentionCountMessage(
	count: number,
	entityLabel: string,
): string {
	return `${count} ${entityLabel}${count === 1 ? '' : 's'} need attention`
}
