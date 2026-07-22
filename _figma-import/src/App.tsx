import { useState } from 'react'
import {
	Home,
	Sparkles,
	Mail,
	CheckSquare,
	Settings2,
	Search,
	Send,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	Plus,
	DollarSign,
	Plane,
	FileText,
	Image,
	Calendar,
	Activity,
	Car,
	Wifi,
	Globe,
	User,
	Bell,
} from 'lucide-react'

type Tab = 'home' | 'ask' | 'mail' | 'tasks' | 'more'

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
	bg: '#0C0C12',
	card: '#141419',
	card2: '#1A1A24',
	border: 'rgba(255,255,255,0.07)',
	borderFaint: 'rgba(255,255,255,0.04)',
	accent: '#6C6FFF', // purple-blue — Ask icon, active nav, Pending pill
	accentBlue: '#3D8CF0', // blue — badges, unread dots, Mail "All" filter
	accentDim: 'rgba(108,111,255,0.14)',
	accentBlueDim: 'rgba(61,140,240,0.14)',
	text: '#FFFFFF',
	textSec: 'rgba(255,255,255,0.55)',
	textMuted: 'rgba(255,255,255,0.28)',
	green: '#32D5A8',
	greenAlt: '#30D158',
	orange: '#FF9F0A',
	red: '#FF453A',
	teal: '#2DCFC1',
	yellow: '#FFD60A',
}

// ── Status bar ────────────────────────────────────────────────────────────────
function StatusBar() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'space-between',
				padding: '10px 22px 8px',
				height: 44,
				flexShrink: 0,
				position: 'relative',
				zIndex: 2,
			}}
		>
			<span
				style={{
					fontSize: 15,
					fontWeight: 600,
					color: C.text,
					letterSpacing: '-0.01em',
				}}
			>
				00:08
			</span>
			{/* Dynamic Island */}
			<div
				style={{
					position: 'absolute',
					left: '50%',
					transform: 'translateX(-50%)',
					top: 8,
					width: 120,
					height: 30,
					background: '#000',
					borderRadius: 20,
				}}
			/>
			<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
				{/* Signal bars */}
				<svg width="17" height="12" viewBox="0 0 17 12" fill="white">
					<rect x="0" y="9" width="3" height="3" rx="0.5" />
					<rect x="4.5" y="6" width="3" height="6" rx="0.5" />
					<rect x="9" y="3" width="3" height="9" rx="0.5" />
					<rect x="13.5" y="0" width="3" height="12" rx="0.5" />
				</svg>
				{/* WiFi */}
				<svg width="16" height="12" viewBox="0 0 16 12" fill="white">
					<path d="M8 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
					<path
						d="M4.5 7.5a4.95 4.95 0 0 1 7 0"
						strokeWidth="1.5"
						stroke="white"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M1.5 4.5a9 9 0 0 1 13 0"
						strokeWidth="1.5"
						stroke="white"
						fill="none"
						strokeLinecap="round"
					/>
				</svg>
				{/* Battery */}
				<svg width="26" height="12" viewBox="0 0 26 12" fill="none">
					<rect
						x=".5"
						y=".5"
						width="22"
						height="11"
						rx="3.5"
						stroke="white"
						strokeOpacity=".35"
					/>
					<rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="white" />
					<path d="M23 4v4a2.5 2.5 0 0 0 0-4z" fill="white" fillOpacity=".4" />
				</svg>
			</div>
		</div>
	)
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function Badge({ count }: { count: string }) {
	return (
		<div
			style={{
				position: 'absolute',
				top: -2,
				right: -2,
				background: C.accentBlue,
				borderRadius: 100,
				minWidth: 16,
				height: 16,
				padding: '0 4px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 9,
				fontWeight: 700,
				color: '#fff',
				letterSpacing: '-0.02em',
				border: `1.5px solid ${C.bg}`,
			}}
		>
			{count}
		</div>
	)
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
	const items = [
		{ id: 'home' as Tab, Icon: Home, label: 'Home', badge: '' },
		{ id: 'ask' as Tab, Icon: Sparkles, label: 'Ask', badge: '' },
		{ id: 'mail' as Tab, Icon: Mail, label: 'Mail', badge: '9+' },
		{ id: 'tasks' as Tab, Icon: CheckSquare, label: 'Tasks', badge: '8' },
		{ id: 'more' as Tab, Icon: Settings2, label: 'More', badge: '' },
	]

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 0,
				left: 0,
				right: 0,
				background: 'rgba(12,12,18,0.92)',
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)',
				borderTop: `1px solid ${C.border}`,
				padding: '10px 4px 24px',
				display: 'flex',
				justifyContent: 'space-around',
				zIndex: 50,
			}}
		>
			{items.map(({ id, Icon, label, badge }) => {
				const active = tab === id
				return (
					<button
						key={id}
						onClick={() => setTab(id)}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 3,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '2px 10px',
							borderRadius: 12,
							position: 'relative',
							minWidth: 56,
						}}
					>
						{active && (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: C.accentDim,
									borderRadius: 12,
								}}
							/>
						)}
						<div style={{ position: 'relative' }}>
							<Icon
								size={22}
								color={active ? C.accent : C.textMuted}
								strokeWidth={active ? 2.2 : 1.6}
							/>
							{badge && <Badge count={badge} />}
						</div>
						<span
							style={{
								fontSize: 10,
								fontWeight: active ? 700 : 400,
								color: active ? C.accent : C.textMuted,
								letterSpacing: '-0.01em',
							}}
						>
							{label}
						</span>
					</button>
				)
			})}
		</div>
	)
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({
	children,
	style,
}: {
	children: React.ReactNode
	style?: React.CSSProperties
}) {
	return (
		<div
			style={{
				background: C.card,
				borderRadius: 18,
				overflow: 'hidden',
				border: `1px solid ${C.border}`,
				...style,
			}}
		>
			{children}
		</div>
	)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
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
			{children}
		</div>
	)
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({
	initials,
	bg,
	size = 44,
}: {
	initials: string
	bg: string
	size?: number
}) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				background: bg,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				fontSize: size * 0.3,
				fontWeight: 700,
				color: '#fff',
				letterSpacing: '-0.02em',
			}}
		>
			{initials}
		</div>
	)
}

// ── Priority pill ─────────────────────────────────────────────────────────────
function PriorityPill({
	score,
	category,
}: {
	score: number
	category: string
}) {
	const color =
		score >= 90
			? C.red
			: score >= 70
				? C.orange
				: category === 'Travel'
					? 'rgba(255,255,255,0.18)'
					: C.orange

	const textColor =
		score >= 90
			? '#fff'
			: score >= 70
				? '#fff'
				: category === 'Travel'
					? C.textSec
					: '#fff'

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				background: color,
				borderRadius: 100,
				padding: '3px 10px',
				fontSize: 12,
				fontWeight: 700,
				color: textColor,
				gap: 2,
			}}
		>
			P{score} · {category}
		</div>
	)
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function Tag({
	label,
	color,
	bg,
}: {
	label: string
	color: string
	bg: string
}) {
	return (
		<span
			style={{
				fontSize: 11,
				fontWeight: 600,
				color,
				background: bg,
				borderRadius: 100,
				padding: '2px 9px',
				display: 'inline-block',
			}}
		>
			{label}
		</span>
	)
}

// ── Circular progress ─────────────────────────────────────────────────────────
function CircProgress({ pct }: { pct: number }) {
	const r = 26,
		cx = 32,
		cy = 32
	const circ = 2 * Math.PI * r
	const offset = circ - (pct / 100) * circ
	return (
		<svg width={64} height={64} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke="rgba(255,255,255,0.08)"
				strokeWidth={5}
			/>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke={C.accent}
				strokeWidth={5}
				strokeDasharray={circ}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform={`rotate(-90 ${cx} ${cy})`}
			/>
			<text
				x={cx}
				y={cy + 1}
				textAnchor="middle"
				dominantBaseline="middle"
				fill="white"
				fontSize="11"
				fontWeight="700"
				fontFamily="system-ui"
			>
				{pct}%
			</text>
		</svg>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// HOME (kept, adapted to new style)
// ════════════════════════════════════════════════════════════════════════════
function HomeScreen() {
	const brief = [
		{ label: 'Three emails need your reply', color: C.red, Icon: Mail },
		{
			label: 'HDFC bill due tomorrow · ₹24,800',
			color: C.orange,
			Icon: DollarSign,
		},
		{ label: 'Paris trip · Aug 14', color: C.green, Icon: Plane },
		{
			label: 'Passport expires in 8 months',
			color: C.textMuted,
			Icon: FileText,
		},
	]

	const world = [
		{
			Icon: Plane,
			label: 'Travel',
			title: 'Paris',
			sub: 'Aug 14',
			color: C.orange,
		},
		{
			Icon: Mail,
			label: 'Mail',
			title: '12 New',
			sub: 'Needs reply',
			color: C.accentBlue,
		},
		{
			Icon: DollarSign,
			label: 'Finance',
			title: '₹24,800',
			sub: 'Due tomorrow',
			color: C.red,
		},
		{
			Icon: FileText,
			label: 'Docs',
			title: '3 New',
			sub: 'Added today',
			color: C.accent,
		},
		{
			Icon: Image,
			label: 'Photos',
			title: '18 New',
			sub: 'This week',
			color: '#E879F9',
		},
	]

	const timeline = [
		{ time: '9:00 AM', event: 'Team standup · 30 min', color: C.accentBlue },
		{ time: '11:30 AM', event: 'Reply to Priya re: Series A', color: C.red },
		{ time: '5:00 PM', event: 'HDFC payment reminder', color: C.orange },
		{ time: 'Aug 14', event: 'Paris trip begins · CDG', color: C.green },
	]

	return (
		<div style={{ padding: '16px 18px 20px', color: C.text }}>
			<div style={{ marginBottom: 22 }}>
				<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 5 }}>
					Sunday, July 20
				</div>
				<div
					style={{
						fontSize: 32,
						fontWeight: 700,
						letterSpacing: '-0.03em',
						lineHeight: 1.1,
					}}
				>
					Good morning,
					<br />
					Nivedan.
				</div>
			</div>

			{/* AI Search */}
			<div
				style={{
					background: C.card,
					border: `1px solid rgba(108,111,255,0.25)`,
					borderRadius: 16,
					padding: '12px 14px',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					marginBottom: 26,
					boxShadow: `0 0 28px rgba(108,111,255,0.12)`,
				}}
			>
				<Sparkles size={18} color={C.accent} />
				<span style={{ fontSize: 14, color: C.textMuted, flex: 1 }}>
					Ask Chronicle anything...
				</span>
			</div>

			{/* Today's Intelligence */}
			<div style={{ marginBottom: 26 }}>
				<SectionLabel>Today's Intelligence</SectionLabel>
				<Card style={{ padding: 16 }}>
					<div
						style={{
							fontSize: 15,
							fontWeight: 700,
							color: C.text,
							marginBottom: 14,
							letterSpacing: '-0.01em',
						}}
					>
						Today looks busy.
					</div>
					{brief.map((item, i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 11,
								marginBottom: i < brief.length - 1 ? 12 : 0,
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: `${item.color}18`,
									border: `1px solid ${item.color}28`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								<item.Icon size={14} color={item.color} />
							</div>
							<span
								style={{
									fontSize: 13,
									color: C.textSec,
									flex: 1,
									lineHeight: 1.45,
								}}
							>
								{item.label}
							</span>
							<ChevronRight size={13} color={C.textMuted} />
						</div>
					))}
				</Card>
			</div>

			{/* Your World */}
			<div style={{ marginBottom: 26 }}>
				<SectionLabel>Your World</SectionLabel>
				<div
					style={{
						display: 'flex',
						gap: 10,
						overflowX: 'auto',
						marginLeft: -18,
						paddingLeft: 18,
						marginRight: -18,
						paddingRight: 18,
						paddingBottom: 4,
						scrollbarWidth: 'none',
					}}
				>
					{world.map((w, i) => (
						<div
							key={i}
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 20,
								padding: '14px 14px',
								minWidth: 120,
								flexShrink: 0,
							}}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: 12,
									background: `${w.color}18`,
									border: `1px solid ${w.color}22`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: 12,
								}}
							>
								<w.Icon size={17} color={w.color} />
							</div>
							<div
								style={{
									fontSize: 10,
									color: C.textMuted,
									marginBottom: 3,
									letterSpacing: '0.04em',
								}}
							>
								{w.label}
							</div>
							<div
								style={{
									fontSize: 16,
									fontWeight: 700,
									color: C.text,
									letterSpacing: '-0.02em',
									marginBottom: 2,
								}}
							>
								{w.title}
							</div>
							<div style={{ fontSize: 11, color: w.color }}>{w.sub}</div>
						</div>
					))}
				</div>
			</div>

			{/* Timeline */}
			<SectionLabel>Today's Timeline</SectionLabel>
			<div style={{ position: 'relative', paddingLeft: 20 }}>
				<div
					style={{
						position: 'absolute',
						left: 7,
						top: 8,
						bottom: 0,
						width: 1,
						background: `linear-gradient(to bottom, ${C.accent}80, ${C.accent}00)`,
					}}
				/>
				{timeline.map((t, i) => (
					<div
						key={i}
						style={{
							display: 'flex',
							gap: 14,
							marginBottom: 16,
							position: 'relative',
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: -16,
								top: 6,
								width: 7,
								height: 7,
								borderRadius: '50%',
								background: t.color,
								boxShadow: `0 0 7px ${t.color}`,
							}}
						/>
						<div>
							<div
								style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}
							>
								{t.time}
							</div>
							<div style={{ fontSize: 13, color: C.textSec }}>{t.event}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// ASK
// ════════════════════════════════════════════════════════════════════════════
function AskScreen() {
	const [query, setQuery] = useState('')
	const [expanded, setExpanded] = useState<number | null>(0)

	const prompts = [
		'Passport location',
		"Today's emails",
		'Plan Japan trip',
		'Tax documents',
		'Active subscriptions',
	]

	const recents = [
		{
			q: 'Where is my passport?',
			when: 'Yesterday',
			answer:
				'Passport No. J8847234 · expires Aug 2028 · in Documents → Identity.',
		},
		{ q: 'Total spending this month?', when: '2 days ago', answer: '' },
		{ q: "Summarize Priya's emails", when: '3 days ago', answer: '' },
	]

	return (
		<div style={{ padding: '22px 18px 20px', color: C.text }}>
			{/* Icon + heading */}
			<div
				style={{
					width: 52,
					height: 52,
					borderRadius: 16,
					background: C.accentDim,
					border: `1px solid rgba(108,111,255,0.25)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 18,
					boxShadow: `0 0 24px rgba(108,111,255,0.20)`,
				}}
			>
				<Sparkles size={26} color={C.accent} />
			</div>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					lineHeight: 1.05,
					marginBottom: 8,
				}}
			>
				Ask Chronicle
			</div>
			<div
				style={{
					fontSize: 15,
					color: C.textSec,
					marginBottom: 28,
					lineHeight: 1.5,
				}}
			>
				Your <em style={{ fontStyle: 'italic', color: C.text }}>life</em>, one
				question away.
			</div>

			{/* Textarea */}
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '14px 14px 12px',
					marginBottom: 20,
					position: 'relative',
					minHeight: 100,
				}}
			>
				<textarea
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Ask about your docs, emails, money, trips..."
					style={{
						width: '100%',
						background: 'none',
						border: 'none',
						outline: 'none',
						fontSize: 15,
						color: C.text,
						fontFamily: 'inherit',
						resize: 'none',
						minHeight: 72,
						lineHeight: 1.55,
					}}
				/>
				<button
					style={{
						position: 'absolute',
						bottom: 12,
						right: 12,
						width: 36,
						height: 36,
						borderRadius: '50%',
						background: C.accent,
						border: 'none',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: `0 4px 16px rgba(108,111,255,0.35)`,
					}}
				>
					<Send size={16} color="white" strokeWidth={2} />
				</button>
			</div>

			{/* Quick prompts */}
			<div
				style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}
			>
				{prompts.map((p, i) => (
					<button
						key={i}
						onClick={() => setQuery(p)}
						style={{
							background: 'none',
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 15px',
							fontSize: 13,
							color: C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{p}
					</button>
				))}
			</div>

			{/* Recent */}
			<SectionLabel>Recent</SectionLabel>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{recents.map((r, i) => (
					<Card key={i}>
						<div
							onClick={() => setExpanded(expanded === i ? null : i)}
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '14px 16px',
								cursor: 'pointer',
								gap: 12,
							}}
						>
							<span
								style={{
									fontSize: 15,
									fontWeight: 600,
									color: C.text,
									flex: 1,
								}}
							>
								{r.q}
							</span>
							<span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>
								{r.when}
							</span>
							{expanded === i ? (
								<ChevronUp size={16} color={C.textMuted} />
							) : (
								<ChevronDown size={16} color={C.textMuted} />
							)}
						</div>
						{expanded === i && r.answer && (
							<div
								style={{
									padding: '0 16px 14px',
									borderTop: `1px solid ${C.border}`,
									paddingTop: 12,
								}}
							>
								<div
									style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
								>
									<FileText
										size={14}
										color={C.accentBlue}
										style={{ flexShrink: 0, marginTop: 2 }}
									/>
									<span
										style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}
									>
										{r.answer}
									</span>
								</div>
							</div>
						)}
					</Card>
				))}
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// MAIL
// ════════════════════════════════════════════════════════════════════════════
type Filter = 'All' | 'Critical' | 'Reply' | 'Finance' | 'Travel'

function MailScreen() {
	const [filter, setFilter] = useState<Filter>('All')
	const [search, setSearch] = useState('')

	const emails = [
		{
			initials: 'PS',
			bg: '#7C4DFF',
			name: 'Priya Sharma',
			unread: true,
			time: '10:23 AM',
			subject: 'RE: Series A pitch deck feedback',
			preview: 'Needs review of unit economics + call by Friday.',
			ai: 'Reply needed · call by Friday',
			aiColor: C.red,
			score: 95,
			category: 'Reply',
			tag: 'Reply',
		},
		{
			initials: 'HB',
			bg: '#E53935',
			name: 'HDFC Bank',
			unread: true,
			time: '8:00 AM',
			subject: 'Credit Card Payment Due — ₹24,800',
			preview: 'Due tomorrow. Avoid ₹950 late fee.',
			ai: 'Pay ₹24,800 before 5 PM tomorrow',
			aiColor: C.red,
			score: 99,
			category: 'Critical',
			tag: 'Critical',
		},
		{
			initials: 'AB',
			bg: '#F4511E',
			name: 'Airbnb',
			unread: false,
			time: 'Yesterday',
			subject: 'Your Paris reservation confirmed ✓',
			preview: 'Aug 14–19 · CitizenM Gare de Lyon.',
			ai: 'Hotel confirmed · saved to Travel',
			aiColor: C.teal,
			score: 60,
			category: 'Travel',
			tag: 'Travel',
		},
		{
			initials: 'RM',
			bg: '#00897B',
			name: 'Rohan Mehta',
			unread: true,
			time: 'Yesterday',
			subject: 'Project proposal — review before Monday?',
			preview: 'Revised. Budget ₹2.4 Cr over 18 months.',
			ai: 'Review proposal · reply by Monday',
			aiColor: C.orange,
			score: 78,
			category: 'Reply',
			tag: 'Reply',
		},
		{
			initials: 'ZR',
			bg: '#3949AB',
			name: 'Zerodha',
			unread: false,
			time: 'Mon',
			subject: 'Portfolio summary — July 2026',
			preview: 'Your holdings gained 3.2% this week.',
			ai: 'No action needed',
			aiColor: C.textMuted,
			score: 30,
			category: 'Finance',
			tag: 'Finance',
		},
	]

	const filters: Filter[] = ['All', 'Critical', 'Reply', 'Finance', 'Travel']

	const visible = emails.filter((e) => {
		if (filter !== 'All' && e.tag !== filter) return false
		if (
			search &&
			!e.name.toLowerCase().includes(search.toLowerCase()) &&
			!e.subject.toLowerCase().includes(search.toLowerCase())
		)
			return false
		return true
	})

	return (
		<div style={{ color: C.text }}>
			{/* Sticky header block */}
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					background: C.bg,
					paddingTop: 18,
					paddingBottom: 14,
					paddingLeft: 18,
					paddingRight: 18,
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				{/* Title row */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 14,
					}}
				>
					<div
						style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}
					>
						Mail
					</div>
					<div
						style={{
							background: C.accentBlue,
							borderRadius: 100,
							padding: '5px 12px',
							fontSize: 13,
							fontWeight: 700,
							color: '#fff',
						}}
					>
						12 unread
					</div>
				</div>

				{/* Search */}
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
						placeholder="Search mail..."
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

				{/* Filters */}
				<div
					style={{
						display: 'flex',
						gap: 8,
						overflowX: 'auto',
						scrollbarWidth: 'none',
					}}
				>
					{filters.map((f) => (
						<button
							key={f}
							onClick={() => setFilter(f)}
							style={{
								flexShrink: 0,
								background: filter === f ? C.accentBlue : C.card,
								border: filter === f ? 'none' : `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '7px 16px',
								fontSize: 13,
								fontWeight: filter === f ? 700 : 400,
								color: filter === f ? '#fff' : C.textSec,
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							{f}
						</button>
					))}
				</div>
			</div>

			{/* Email list — scrolls under the sticky header */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					padding: '14px 18px 20px',
				}}
			>
				{visible.map((email, i) => (
					<div
						key={i}
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 18,
							overflow: 'hidden',
							display: 'flex',
							// Left-edge unread bar
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
							<Avatar initials={email.initials} bg={email.bg} size={44} />
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
										style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}
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
								{/* AI summary line */}
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
								<PriorityPill score={email.score} category={email.category} />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════════════════════
type TaskView = 'pending' | 'done'

// Status square: filled rounded square with color, conveying state without "tap to check"
function StatusSquare({ color, done }: { color: string; done?: boolean }) {
	return (
		<div
			style={{
				width: 20,
				height: 20,
				borderRadius: 6,
				flexShrink: 0,
				background: done ? `${C.teal}28` : `${color}1A`,
				border: `1.5px solid ${done ? C.teal : color}`,
				position: 'relative',
			}}
		>
			{done && (
				<div
					style={{
						position: 'absolute',
						inset: 3,
						background: C.teal,
						borderRadius: 3,
					}}
				/>
			)}
		</div>
	)
}

function TasksScreen() {
	const [view, setView] = useState<TaskView>('pending')

	const pending = [
		{
			title: "Review Priya's Series A pitch deck",
			date: 'Jul 21',
			source: "from Priya's email",
			tags: [{ label: 'Work', color: C.accentBlue, bg: `${C.accentBlue}18` }],
			sq: C.accentBlue,
			dot: C.red,
			urgent: true,
		},
		{
			title: 'Submit Q2 expense report',
			date: '',
			source: 'from Finance · Zerodha',
			tags: [
				{ label: 'Overdue', color: C.red, bg: `${C.red}22` },
				{ label: 'Finance', color: C.orange, bg: `${C.orange}18` },
			],
			sq: C.red,
			dot: C.red,
			urgent: true,
		},
		{
			title: 'Book Paris travel insurance',
			date: 'Jul 25',
			source: 'from Airbnb confirmation',
			tags: [{ label: 'Travel', color: C.teal, bg: `${C.teal}18` }],
			sq: C.teal,
			dot: C.yellow,
			urgent: false,
		},
		{
			title: "Reply to Rohan's proposal",
			date: 'Jul 22',
			source: "from Rohan's email",
			tags: [{ label: 'Work', color: C.accentBlue, bg: `${C.accentBlue}18` }],
			sq: C.accentBlue,
			dot: C.red,
			urgent: true,
		},
		{
			title: 'Upload Form 16 to CA portal',
			date: 'Jul 31',
			source: 'from Tax docs',
			tags: [{ label: 'Tax', color: C.orange, bg: `${C.orange}18` }],
			sq: C.red,
			dot: C.orange,
			urgent: false,
		},
		{
			title: 'Renew passport before Nov',
			date: 'Oct 31',
			source: 'from Documents · Identity',
			tags: [{ label: 'Documents', color: C.accent, bg: C.accentDim }],
			sq: C.accent,
			dot: C.yellow,
			urgent: false,
		},
		{
			title: 'Pay HDFC credit card',
			date: 'Jul 21',
			source: 'from HDFC Bank email',
			tags: [{ label: 'Finance', color: C.orange, bg: `${C.orange}18` }],
			sq: C.red,
			dot: C.red,
			urgent: true,
		},
	]

	const done = [
		{
			title: 'Book Air India flight to Tokyo',
			date: 'Jul 18',
			source: 'from Air India email',
			tags: [{ label: 'Travel', color: C.teal, bg: `${C.teal}18` }],
			sq: C.teal,
			dot: C.greenAlt,
			urgent: false,
		},
	]

	const tasks = view === 'pending' ? pending : done
	const urgentCount = pending.filter((t) => t.urgent).length

	return (
		<div style={{ color: C.text }}>
			{/* Sticky header */}
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					background: C.bg,
					paddingTop: 18,
					paddingBottom: 14,
					paddingLeft: 18,
					paddingRight: 18,
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 14,
					}}
				>
					<div
						style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}
					>
						Tasks
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						{/* AI found chip */}
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 5,
								background: C.accentDim,
								border: `1px solid rgba(108,111,255,0.22)`,
								borderRadius: 100,
								padding: '5px 11px',
							}}
						>
							<Sparkles size={12} color={C.accent} strokeWidth={2} />
							<span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
								AI found 3
							</span>
						</div>
						<button
							style={{
								width: 36,
								height: 36,
								borderRadius: '50%',
								background: C.accentBlue,
								border: 'none',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Plus size={20} color="white" strokeWidth={2.5} />
						</button>
					</div>
				</div>

				{/* Tabs */}
				<div style={{ display: 'flex', gap: 8 }}>
					<button
						onClick={() => setView('pending')}
						style={{
							background: view === 'pending' ? C.accent : C.card,
							border: view === 'pending' ? 'none' : `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							color: view === 'pending' ? '#fff' : C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Pending ({pending.length})
					</button>
					<button
						onClick={() => setView('done')}
						style={{
							background: view === 'done' ? C.accent : C.card,
							border: view === 'done' ? 'none' : `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							color: view === 'done' ? '#fff' : C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Done ({done.length})
					</button>
				</div>
			</div>

			<div style={{ padding: '14px 18px 20px' }}>
				{/* Progress card — urgent-focused */}
				<Card style={{ padding: '16px 18px', marginBottom: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
						<CircProgress pct={13} />
						<div style={{ flex: 1 }}>
							<div
								style={{
									fontSize: 17,
									fontWeight: 700,
									color: C.text,
									marginBottom: 5,
									letterSpacing: '-0.01em',
								}}
							>
								1/8 done
							</div>
							{/* Urgent callout instead of generic "7 remaining" */}
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 5,
									marginBottom: 4,
								}}
							>
								<div
									style={{
										width: 6,
										height: 6,
										borderRadius: '50%',
										background: C.red,
									}}
								/>
								<span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>
									{urgentCount} urgent · due today
								</span>
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>
								AI found 3 new in emails
							</div>
						</div>
					</div>
				</Card>

				{/* Task list */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{tasks.map((task, i) => (
						<Card key={i} style={{ padding: '13px 14px' }}>
							<div
								style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
							>
								<div style={{ paddingTop: 2 }}>
									<StatusSquare color={task.sq} done={view === 'done'} />
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 14,
											fontWeight: 600,
											color: view === 'done' ? C.textSec : C.text,
											marginBottom: 5,
											letterSpacing: '-0.01em',
											textDecoration: view === 'done' ? 'line-through' : 'none',
										}}
									>
										{task.title}
									</div>
									{/* Source attribution */}
									<div
										style={{
											fontSize: 11,
											color: C.textMuted,
											marginBottom: 7,
										}}
									>
										↳ {task.source}
									</div>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 6,
											flexWrap: 'wrap',
										}}
									>
										{task.date && (
											<span style={{ fontSize: 12, color: C.textMuted }}>
												{task.date}
											</span>
										)}
										{task.tags.map((t, ti) => (
											<Tag key={ti} label={t.label} color={t.color} bg={t.bg} />
										))}
									</div>
								</div>
								{/* Urgency dot */}
								<div
									style={{
										width: 8,
										height: 8,
										borderRadius: '50%',
										marginTop: 5,
										background: view === 'done' ? C.teal : task.dot,
										flexShrink: 0,
									}}
								/>
							</div>
						</Card>
					))}
				</div>
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// MORE
// ════════════════════════════════════════════════════════════════════════════
function MoreScreen() {
	const modules = [
		{ Icon: DollarSign, label: 'Finance', color: C.greenAlt },
		{ Icon: Plane, label: 'Travel', color: C.orange },
		{ Icon: FileText, label: 'Docs', color: C.accent },
		{ Icon: Image, label: 'Photos', color: '#E879F9' },
		{ Icon: Calendar, label: 'Calendar', color: C.accentBlue },
		{ Icon: Mail, label: 'Mail', color: C.accentBlue },
	]

	const comingSoon = [
		{ Icon: Activity, label: 'Health' },
		{ Icon: Car, label: 'Vehicles' },
		{ Icon: Wifi, label: 'Smart Home' },
	]

	const settings = [
		{ Icon: User, label: 'Account', sub: 'nivedan@gmail.com' },
		{
			Icon: Globe,
			label: 'Connected Services',
			sub: 'Gmail · Drive · Zerodha',
		},
	]

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			{/* Profile card */}
			<Card style={{ padding: '16px', marginBottom: 28 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
							color: '#fff',
							flexShrink: 0,
						}}
					>
						N
					</div>
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
							Nivedan Agarwal
						</div>
						<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
							nivedan@gmail.com
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
								style={{ fontSize: 12, color: C.greenAlt, fontWeight: 600 }}
							>
								AI Active
							</span>
						</div>
					</div>
					<ChevronRight size={18} color={C.textMuted} />
				</div>
			</Card>

			{/* All Modules grid */}
			<SectionLabel>All Modules</SectionLabel>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: 10,
					marginBottom: 28,
				}}
			>
				{modules.map((mod, i) => (
					<div
						key={i}
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
							<mod.Icon size={22} color={mod.color} strokeWidth={1.7} />
						</div>
						<span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
							{mod.label}
						</span>
					</div>
				))}
			</div>

			{/* Coming Soon */}
			<SectionLabel>Coming Soon</SectionLabel>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-around',
					marginBottom: 28,
				}}
			>
				{comingSoon.map((mod, i) => (
					<div
						key={i}
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
							<mod.Icon size={22} color={C.textMuted} strokeWidth={1.5} />
						</div>
						<span style={{ fontSize: 12, color: C.textMuted }}>
							{mod.label}
						</span>
					</div>
				))}
			</div>

			{/* Settings */}
			<SectionLabel>Settings</SectionLabel>
			<Card>
				{settings.map((s, i) => (
					<div
						key={i}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 14,
							padding: '14px 16px',
							borderBottom:
								i < settings.length - 1 ? `1px solid ${C.border}` : 'none',
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
							<s.Icon size={18} color={C.textSec} strokeWidth={1.6} />
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
								{s.label}
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>{s.sub}</div>
						</div>
						<ChevronRight size={16} color={C.textMuted} />
					</div>
				))}
			</Card>
		</div>
	)
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
	const [tab, setTab] = useState<Tab>('more')

	return (
		<div
			style={{
				minHeight: '100vh',
				background: '#06060A',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '32px 16px',
			}}
		>
			<div
				style={{
					width: 393,
					height: 852,
					background: C.bg,
					borderRadius: 54,
					overflow: 'hidden',
					position: 'relative',
					border: '1px solid rgba(255,255,255,0.09)',
					boxShadow:
						'0 60px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset',
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
					WebkitFontSmoothing: 'antialiased',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<StatusBar />
				<div
					style={{
						flex: 1,
						overflowY: 'auto',
						overflowX: 'hidden',
						scrollbarWidth: 'none',
						paddingBottom: 90,
					}}
				>
					{tab === 'home' && <HomeScreen />}
					{tab === 'ask' && <AskScreen />}
					{tab === 'mail' && <MailScreen />}
					{tab === 'tasks' && <TasksScreen />}
					{tab === 'more' && <MoreScreen />}
				</div>
				<BottomNav tab={tab} setTab={setTab} />
			</div>
		</div>
	)
}
