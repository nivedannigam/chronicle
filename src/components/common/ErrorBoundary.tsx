import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { C } from '@/constants/colors'

interface ErrorBoundaryProps {
	children: ReactNode
	fallbackTitle?: string
}

interface ErrorBoundaryState {
	hasError: boolean
	message: string
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false, message: '' }

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			message: error.message || 'Something went wrong.',
		}
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		if (import.meta.env.DEV) {
			console.error('ErrorBoundary caught:', error, info.componentStack)
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					role="alert"
					style={{
						padding: '32px 20px',
						textAlign: 'center',
						color: C.text,
					}}
				>
					<div
						style={{
							fontSize: 18,
							fontWeight: 700,
							marginBottom: 8,
						}}
					>
						{this.props.fallbackTitle ?? 'Something went wrong'}
					</div>
					<div
						style={{
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.5,
							marginBottom: 16,
						}}
					>
						{this.state.message}
					</div>
					<button
						type="button"
						onClick={() => {
							this.setState({ hasError: false, message: '' })
							window.location.reload()
						}}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							padding: '10px 16px',
							borderRadius: 100,
							border: `1px solid ${C.border}`,
							background: C.card,
							color: C.accent,
							fontSize: 13,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						<RefreshCw size={14} />
						Reload
					</button>
				</div>
			)
		}

		return this.props.children
	}
}
