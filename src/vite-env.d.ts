/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string
	readonly VITE_SUPABASE_ANON_KEY: string
	readonly VITE_APP_URL?: string
	readonly VITE_OCR_PROVIDER?: 'google' | 'azure'
	readonly VITE_OCR_TIMEOUT_MS?: string
	readonly VITE_OCR_MIN_CONFIDENCE?: string
	readonly VITE_OCR_MAX_RETRIES?: string
	readonly VITE_ASK_PROVIDER?: 'openai' | 'azure-openai' | 'gemini' | 'claude'
	readonly VITE_ASK_MODEL?: string
	readonly VITE_ASK_TIMEOUT_MS?: string
	readonly VITE_ASK_MAX_RETRIES?: string
	readonly VITE_ASK_CACHE_TTL_MS?: string
	readonly VITE_ASK_PROXY_URL?: string
	readonly VITE_ASK_API_KEY?: string
	readonly VITE_ASK_AZURE_ENDPOINT?: string
	readonly VITE_ASK_AZURE_DEPLOYMENT?: string
	readonly VITE_CHRONICLE_QA_MODE?: 'true' | 'false'
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
