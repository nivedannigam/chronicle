/** Default Gemini model when the client and env do not specify one. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

/** Edge default model; override with GEMINI_MODEL secret in Supabase. */
export const GEMINI_MODEL =
	Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL

export const GEMINI_BASE_URL =
	'https://generativelanguage.googleapis.com/v1beta/models'

export const SIMPLIFIED_PING_PROMPT = 'Hello Chronicle'

export const MAX_LOG_BODY_CHARS = 2000
