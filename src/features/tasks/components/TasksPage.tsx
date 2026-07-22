import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { TaskProgressRing } from '@/assets/icons/task-progress-ring'
import { C, screenTitleStyle, stickyHeaderStyle } from '@/constants/colors'
import {
	TASKS_COPY,
	TASKS_PROGRESS,
	doneTasks,
	pendingTasks,
} from '@/features/tasks/constants/mock-data'
import type { TaskView } from '@/types'

export function TasksPage() {
	const [view, setView] = useState<TaskView>('pending')

	const tasks = view === 'pending' ? pendingTasks : doneTasks
	const urgentCount = pendingTasks.filter((t) => t.urgent).length

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
					<div style={screenTitleStyle}>{TASKS_COPY.title}</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
							<span
								style={{
									fontSize: 12,
									color: C.accent,
									fontWeight: 600,
								}}
							>
								{TASKS_COPY.aiFoundLabel}
							</span>
						</div>
						<button
							type="button"
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

				<div style={{ display: 'flex', gap: 8 }}>
					<button
						type="button"
						onClick={() => setView('pending')}
						style={{
							background: view === 'pending' ? C.accent : C.card,
							border: view === 'pending' ? 'none' : `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							color: view === 'pending' ? C.white : C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Pending ({pendingTasks.length})
					</button>
					<button
						type="button"
						onClick={() => setView('done')}
						style={{
							background: view === 'done' ? C.accent : C.card,
							border: view === 'done' ? 'none' : `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							color: view === 'done' ? C.white : C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Done ({doneTasks.length})
					</button>
				</div>
			</div>

			<div style={{ padding: '14px 18px 20px' }}>
				<div
					style={{
						background: C.card,
						borderRadius: 18,
						overflow: 'hidden',
						border: `1px solid ${C.border}`,
						padding: '16px 18px',
						marginBottom: 16,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
						<TaskProgressRing pct={TASKS_PROGRESS.pct} />
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
								{TASKS_COPY.progressLabel}
							</div>
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
								<span
									style={{
										fontSize: 13,
										color: C.red,
										fontWeight: 600,
									}}
								>
									{urgentCount} urgent · due today
								</span>
							</div>
							<div style={{ fontSize: 12, color: C.textMuted }}>
								{TASKS_COPY.aiFoundEmails}
							</div>
						</div>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{tasks.map((task) => (
						<div
							key={task.title}
							style={{
								background: C.card,
								borderRadius: 18,
								overflow: 'hidden',
								border: `1px solid ${C.border}`,
								padding: '13px 14px',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 12,
								}}
							>
								<div style={{ paddingTop: 2 }}>
									<div
										style={{
											width: 20,
											height: 20,
											borderRadius: 6,
											flexShrink: 0,
											background:
												view === 'done' ? `${C.teal}28` : `${task.sq}1A`,
											border: `1.5px solid ${view === 'done' ? C.teal : task.sq}`,
											position: 'relative',
										}}
									>
										{view === 'done' && (
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
										{task.tags.map((t) => (
											<span
												key={t.label}
												style={{
													fontSize: 11,
													fontWeight: 600,
													color: t.color,
													background: t.bg,
													borderRadius: 100,
													padding: '2px 9px',
													display: 'inline-block',
												}}
											>
												{t.label}
											</span>
										))}
									</div>
								</div>
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
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
