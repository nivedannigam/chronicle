import { useRef, type ChangeEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { C } from '@/constants/colors'
import { useUploadHealthReport } from '@/features/health/hooks/useUploadHealthReport'

interface UploadReportButtonProps {
	userId: string | undefined
}

export function UploadReportButton({ userId }: UploadReportButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const upload = useUploadHealthReport(userId)

	const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]

		if (!file) {
			return
		}

		try {
			await upload.mutateAsync(file)
		} finally {
			event.target.value = ''
		}
	}

	return (
		<div>
			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				onChange={handleSelect}
				style={{ display: 'none' }}
			/>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				disabled={!userId || upload.isPending}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					background: C.accentBlue,
					border: 'none',
					borderRadius: 100,
					padding: '8px 14px',
					fontSize: 12,
					fontWeight: 700,
					color: C.white,
					cursor: !userId || upload.isPending ? 'not-allowed' : 'pointer',
					fontFamily: 'inherit',
					opacity: !userId || upload.isPending ? 0.7 : 1,
				}}
			>
				{upload.isPending ? (
					<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
				) : (
					<Upload size={14} strokeWidth={2.2} />
				)}
				{upload.isPending ? 'Uploading...' : 'Upload Report'}
			</button>
			{upload.isError ? (
				<p
					style={{
						marginTop: 8,
						fontSize: 12,
						color: C.red,
						lineHeight: 1.4,
					}}
				>
					{upload.error instanceof Error
						? upload.error.message
						: 'Upload failed. Please try again.'}
				</p>
			) : null}
		</div>
	)
}
