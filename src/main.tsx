import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from '@/app/providers'
import { redirectToCanonicalOriginIfNeeded } from '@/lib/app-url'
import { assertQaModeProductionSafe } from '@/qa/qa-mode'
import { bootstrapQaHarness } from '@/qa/qa-bootstrap'
import '@/styles/index.css'

assertQaModeProductionSafe()
bootstrapQaHarness()
redirectToCanonicalOriginIfNeeded()

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppProviders />
	</StrictMode>,
)
