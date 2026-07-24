import { C } from '@/constants/colors'
import { getMemberInitials } from '@/features/family/utils/member-display'

interface MemberAvatarProps {
	name: string
	avatarUrl?: string | null
	size?: number
}

export function MemberAvatar({
	name,
	avatarUrl,
	size = 44,
}: MemberAvatarProps) {
	if (avatarUrl) {
		return (
			<img
				src={avatarUrl}
				alt={name}
				style={{
					width: size,
					height: size,
					borderRadius: '50%',
					objectFit: 'cover',
					border: `1px solid ${C.border}`,
				}}
			/>
		)
	}

	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: C.card2,
				border: `1px solid ${C.border}`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: size * 0.34,
				fontWeight: 700,
				color: C.text,
			}}
		>
			{getMemberInitials(name)}
		</div>
	)
}
