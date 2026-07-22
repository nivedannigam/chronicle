import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { C, screenTitleStyle, stickyHeaderStyle } from '@/constants/colors'
import {
	MAIL_COPY,
	emails,
	mailFilters,
} from '@/features/mail/constants/mock-data'
import type { MailFilter } from '@/types'

export function MailPage() {
	const [filter, setFilter] = useState<MailFilter>('All')
	const [search, setSearch] = useState('')

	const visible = emails.filter((email) => {
		if (filter !== 'All' && email.tag !== filter) return false
		if (
			search &&
			!email.name.toLowerCase().includes(search.toLowerCase()) &&
			!email.subject.toLowerCase().includes(search.toLowerCase())
		)
			return false
		return true
	})

	return (
		<div style={{ color: C.text }}>
			<div style={stickyHeaderStyle}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 14,
					}}
				>
					<div style={screenTitleStyle}>{MAIL_COPY.title}</div>
					<div
						style={{
							background: C.accentBlue,
							borderRadius: 100,
							padding: '5px 12px',
							fontSize: 13,
							fontWeight: 700,
							color: C.white,
						}}
					>
						{MAIL_COPY.unreadLabel}
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: '11px 14px',
						marginBottom: 12,
					}}
				>
					<Search size={16} color={C.textMuted} />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={MAIL_COPY.searchPlaceholder}
						style={{
							flex: 1,
							background: 'none',
							border: 'none',
							outline: 'none',
							fontSize: 14,
							color: C.text,
							fontFamily: 'inherit',
						}}
					/>
				</div>

				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						scrollbarWidth: 'none',
					}}
				>
					{mailFilters.map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFilter(f)}
							style={{
								flexShrink: 0,
								background: filter === f ? C.accentBlue : C.card,
								border: filter === f ? 'none' : `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '7px 16px',
								fontSize: 13,
								fontWeight: filter === f ? 700 : 400,
								color: filter === f ? C.white : C.textSec,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							{f}
						</button>
					))}
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					padding: '14px 18px 20px',
				}}
			>
				{visible.map((email) => {
					const pillColor =
						email.score >= 90
							? C.red
							: email.score >= 70
								? C.orange
								: email.category === 'Travel'
									? 'rgba(255,255,255,0.18)'
									: C.orange
					const pillTextColor =
						email.score >= 90
							? C.white
							: email.score >= 70
								? C.white
								: email.category === 'Travel'
									? C.textSec
									: C.white

					return (
						<div
							key={email.subject}
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 18,
								overflow: 'hidden',
								display: 'flex',
								borderLeft: email.unread
									? `3px solid ${C.accentBlue}`
									: `3px solid transparent`,
							}}
						>
							<div
								style={{
									padding: '14px 14px 14px 12px',
									display: 'flex',
									alignItems: 'flex-start',
									gap: 12,
									flex: 1,
									minWidth: 0,
								}}
							>
								<div
									style={{
										width: 44,
										height: 44,
										borderRadius: 22,
										background: email.bg,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
										fontSize: 13.2,
										fontWeight: 700,
										color: '#fff',
										letterSpacing: '-0.02em',
									}}
								>
									{email.initials}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											marginBottom: 3,
										}}
									>
										<span
											style={{
												fontSize: 14,
												fontWeight: email.unread ? 700 : 500,
												color: email.unread ? C.text : C.textSec,
												flex: 1,
												letterSpacing: '-0.01em',
											}}
										>
											{email.name}
										</span>
										<span
											style={{
												fontSize: 12,
												color: C.textMuted,
												flexShrink: 0,
											}}
										>
											{email.time}
										</span>
									</div>
									<div
										style={{
											fontSize: 14,
											fontWeight: 600,
											color: C.text,
											marginBottom: 3,
											letterSpacing: '-0.01em',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{email.subject}
									</div>
									<div
										style={{
											fontSize: 13,
											color: C.textMuted,
											lineHeight: 1.4,
											marginBottom: 9,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{email.preview}
									</div>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 5,
											marginBottom: 9,
										}}
									>
										<Sparkles size={11} color={email.aiColor} strokeWidth={2} />
										<span
											style={{
												fontSize: 12,
												color: email.aiColor,
												fontWeight: 500,
											}}
										>
											{email.ai}
										</span>
									</div>
									<div
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											background: pillColor,
											borderRadius: 100,
											padding: '3px 10px',
											fontSize: 12,
											fontWeight: 700,
											color: pillTextColor,
											gap: 2,
										}}
									>
										P{email.score} · {email.category}
									</div>
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
