import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingScreenProps {
	className?: string
	message?: string
}

export function LoadingScreen({
	className,
	message = 'Loading...',
}: LoadingScreenProps) {
	return (
		<div
			className={cn(
				'flex min-h-dvh flex-col items-center justify-center gap-4 bg-background',
				className,
			)}
		>
			<Loader2 className="size-8 animate-spin text-muted-foreground" />
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	)
}
