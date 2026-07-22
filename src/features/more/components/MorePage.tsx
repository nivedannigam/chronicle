import { Check, ChevronRight, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C, pagePadding } from '@/constants/colors'
import {
	getComingSoonModules,
	getMoreGridModules,
	MODULE_ROUTES,
} from '@/constants/modules'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { connectedServices } from '@/features/more/constants/connected-services'
import { useUser } from '@/features/user/hooks/useUser'

export function MorePage() {
	const navigate = useNavigate()
	const { signOut } = useAuth()
	const { profile } = useUser()
	const moreGridModules = getMoreGridModules()
	const comingSoonModules = getComingSoonModules()

	const handleModuleClick = (moduleId: string) => {
		const route = MODULE_ROUTES[moduleId]

		if (route) {
			navigate(route)
		}
	}

	return (
		<div style={{ padding: pagePadding.more, color: C.text }}>
			<div
				style={{
					background: C.card,
					borderRadius: 18,
					overflow: 'hidden',
					border: `1px solid ${C.border}`,
					padding: '16px',
					marginBottom: 28,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
					{profile?.avatarUrl ? (
						<img
							src={profile.avatarUrl}
							alt={profile.name}
							referrerPolicy="no-referrer"
							style={{
								width: 52,
								height: 52,
								borderRadius: 16,
								objectFit: 'cover',
								flexShrink: 0,
							}}
						/>
					) : (
						<div
							style={{
								width: 52,
								height: 52,
								borderRadius: 16,
								background: C.accent,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 22,
								fontWeight: 700,
								color: C.white,
								flexShrink: 0,
							}}
						>
							{profile?.initial ?? '?'}
						</div>
					)}
					<div style={{ flex: 1 }}>
						<div
							style={{
								fontSize: 17,
								fontWeight: 700,
								color: C.text,
								marginBottom: 3,
								letterSpacing: '-0.01em',
							}}
						>
							{profile?.name ?? 'User'}
						</div>
						<div
							style={{
								fontSize: 13,
								color: C.textMuted,
								marginBottom: 6,
							}}
						>
							{profile?.email ?? ''}
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
							<div
								style={{
									width: 7,
									height: 7,
									borderRadius: '50%',
									background: C.greenAlt,
								}}
							/>
							<span
								style={{
									fontSize: 12,
									color: C.greenAlt,
									fontWeight: 600,
								}}
							>
								AI Active
							</span>
						</div>
					</div>
					<ChevronRight size={18} color={C.textMuted} />
				</div>
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				All Modules
			</div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: 10,
					marginBottom: 28,
				}}
			>
				{moreGridModules.map((mod) => (
					<div
						key={mod.id}
						onClick={() => handleModuleClick(mod.id)}
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 20,
							padding: '18px 0',
							aspectRatio: '1',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 10,
							cursor: 'pointer',
						}}
					>
						<div
							style={{
								width: 42,
								height: 42,
								borderRadius: 14,
								background: `${mod.color}18`,
								border: `1px solid ${mod.color}25`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<mod.icon size={22} color={mod.color} strokeWidth={1.7} />
						</div>
						<span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
							{mod.name}
						</span>
					</div>
				))}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Coming Soon
			</div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-around',
					marginBottom: 28,
				}}
			>
				{comingSoonModules.map((mod) => (
					<div
						key={mod.id}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							opacity: 0.35,
						}}
					>
						<div
							style={{
								width: 52,
								height: 52,
								borderRadius: 16,
								background: C.card,
								border: `1px solid ${C.border}`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<mod.icon size={22} color={C.textMuted} strokeWidth={1.5} />
						</div>
						<span style={{ fontSize: 12, color: C.textMuted }}>{mod.name}</span>
					</div>
				))}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Connected Services
			</div>
			<div
				style={{
					background: C.card,
					borderRadius: 18,
					overflow: 'hidden',
					border: `1px solid ${C.border}`,
					marginBottom: 28,
				}}
			>
				{connectedServices.map((service, i) => {
					const isConnected = service.status === 'connected'

					return (
						<div
							key={service.id}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 14,
								padding: '14px 16px',
								borderBottom:
									i < connectedServices.length - 1
										? `1px solid ${C.border}`
										: 'none',
								opacity: isConnected ? 1 : 0.55,
							}}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: 11,
									background: isConnected
										? 'rgba(52,211,153,0.12)'
										: 'rgba(255,255,255,0.06)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								<service.Icon
									size={18}
									color={isConnected ? C.greenAlt : C.textSec}
									strokeWidth={1.6}
								/>
							</div>
							<div style={{ flex: 1 }}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 6,
										fontSize: 15,
										fontWeight: 600,
										color: C.text,
										marginBottom: 2,
									}}
								>
									{isConnected ? (
										<Check size={14} color={C.greenAlt} strokeWidth={2.5} />
									) : null}
									{service.name}
								</div>
								<div
									style={{
										fontSize: 12,
										color: isConnected ? C.greenAlt : C.textMuted,
										fontWeight: isConnected ? 600 : 400,
									}}
								>
									{service.statusLabel}
								</div>
							</div>
						</div>
					)
				})}
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Settings
			</div>
			<div
				style={{
					background: C.card,
					borderRadius: 18,
					overflow: 'hidden',
					border: `1px solid ${C.border}`,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						padding: '14px 16px',
						borderBottom: `1px solid ${C.border}`,
					}}
				>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 11,
							background: 'rgba(255,255,255,0.06)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<User size={18} color={C.textSec} strokeWidth={1.6} />
					</div>
					<div style={{ flex: 1 }}>
						<div
							style={{
								fontSize: 15,
								fontWeight: 600,
								color: C.text,
								marginBottom: 2,
							}}
						>
							Account
						</div>
						<div style={{ fontSize: 12, color: C.textMuted }}>
							{profile?.email ?? ''}
						</div>
					</div>
					<ChevronRight size={16} color={C.textMuted} />
				</div>

				<button
					type="button"
					onClick={() => signOut()}
					style={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						padding: '14px 16px',
						background: 'transparent',
						border: 'none',
						borderTop: `1px solid ${C.border}`,
						cursor: 'pointer',
						fontFamily: 'inherit',
						textAlign: 'left',
					}}
				>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 11,
							background: 'rgba(255,255,255,0.06)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<LogOut size={18} color={C.red} strokeWidth={1.6} />
					</div>
					<div style={{ flex: 1 }}>
						<div
							style={{
								fontSize: 15,
								fontWeight: 600,
								color: C.red,
							}}
						>
							Sign Out
						</div>
					</div>
				</button>
			</div>
		</div>
	)
}
