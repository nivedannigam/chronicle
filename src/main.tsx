import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from '@/app/providers'
import { redirectToCanonicalOriginIfNeeded } from '@/lib/app-url'
import '@/styles/index.css'

redirectToCanonicalOriginIfNeeded()

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppProviders />
	</StrictMode>,
)
