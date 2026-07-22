import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/common/PageContainer'

export function NotFoundPage() {
	return (
		<PageContainer>
			<div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
				<h1 className="text-4xl font-bold">404</h1>
				<p className="text-muted-foreground">Page not found.</p>
				<Link
					to="/home"
					className="text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
				>
					Go home
				</Link>
			</div>
		</PageContainer>
	)
}
