import { User } from 'lucide-react'
import { C } from '@/constants/colors'
import { getMemberInitials } from '@/features/family/utils/member-display'

interface UserAvatarProps {
	name?: string | null
	imageUrl?: string | null
	size?: number
}

function hashString(value: string): number {
	let hash = 0

	for (let index = 0; index < value.length; index += 1) {
		hash = value.charCodeAt(index) + ((hash << 5) - hash)
	}

	return Math.abs(hash)
}

function gradientForName(name: string): string {
	const palettes = [
		'linear-gradient(135deg, #6C6FFF 0%, #3D8CF0 100%)',
		'linear-gradient(135deg, #2DCFC1 0%, #30D158 100%)',
		'linear-gradient(135deg, #FF9F0A 0%, #FF453A 100%)',
		'linear-gradient(135deg, #E879F9 0%, #6C6FFF 100%)',
		'linear-gradient(135deg, #3D8CF0 0%, #2DCFC1 100%)',
	]
	const index = hashString(name) % palettes.length
	return palettes[index]!
}

export function UserAvatar({ name, imageUrl, size = 44 }: UserAvatarProps) {
	const displayName = name?.trim() || 'User'

	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={displayName}
				style={{
					width: size,
					height: size,
					borderRadius: '50%',
					objectFit: 'cover',
					border: `2px solid rgba(255,255,255,0.12)`,
					boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
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
				background: gradientForName(displayName),
				border: `2px solid rgba(255,255,255,0.14)`,
				boxShadow: '0 4px 20px rgba(108,111,255,0.22)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: size * 0.36,
				fontWeight: 700,
				color: C.white,
				letterSpacing: '-0.02em',
			}}
		>
			{name ? (
				getMemberInitials(displayName)
			) : (
				<User size={size * 0.42} color={C.white} strokeWidth={2} />
			)}
		</div>
	)
}
