import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from '@/app/providers'
import '@/styles/index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppProviders />
	</StrictMode>,
)
