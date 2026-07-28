import { useMemo, useState } from 'react'
import { ChevronLeft, File, FileImage, FileText, Folder } from 'lucide-react'
import { C } from '@/constants/colors'
import { FolderAssignmentBadge } from '@/features/family/components/FolderAssignmentBadge'
import { FolderAssignmentSheet } from '@/features/family/components/FolderAssignmentSheet'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useFolderAssignmentFlow } from '@/features/family/hooks/useFolderAssignmentFlow'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useDriveBrowser } from '@/features/connectors/google-drive/hooks/useDriveBrowser'
import { useUser } from '@/features/user/hooks/useUser'
import type { DriveBrowseFile } from '@/core/connectors'
import type { ImportJourneyResult } from '@/features/health-import/types/health-import-journey.types'

interface DriveBrowserProps {
	userId: string
}

export function DriveBrowser({ userId }: DriveBrowserProps) {
	const { profile } = useUser()
	const { selectedMemberId } = useFamilyContext()
	const browser = useDriveBrowser(userId)
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')
	const { assignments, refresh } = useHealthSources(userId)
	const [journeyResult, setJourneyResult] =
		useState<ImportJourneyResult | null>(null)

	const flow = useFolderAssignmentFlow({
		userId,
		folderId: browser.currentFolderId,
		folderName: browser.currentFolderName,
		members,
		assignments,
		preferredMemberId: selectedMemberId,
		onRefresh: async () => {
			await refresh()
		},
		onJourneyComplete: (result) => {
			setJourneyResult(result)
		},
	})

	const assignmentsByFolderId = useMemo(() => {
		const map = new Map<string, typeof assignments>()

		for (const assignment of assignments) {
			const existing = map.get(assignment.externalFolderId) ?? []
			map.set(assignment.externalFolderId, [...existing, assignment])
		}

		return map
	}, [assignments])

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: 16,
				marginBottom: 20,
			}}
		>
			<div
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: C.text,
					marginBottom: 14,
				}}
			>
				Browse Drive
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
					gap: 12,
				}}
			>
				<div style={{ fontSize: 12, color: C.textMuted }}>
					Location:{' '}
					<span style={{ color: C.textSec }}>{browser.currentFolderName}</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<button
						type="button"
						onClick={flow.open}
						disabled={browser.isLoading || flow.isSaving}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							background: flow.isAssigned ? 'rgba(52,211,153,0.1)' : C.card2,
							border: `1px solid ${flow.isAssigned ? 'rgba(52,211,153,0.25)' : C.border}`,
							borderRadius: 100,
							padding: '8px 12px',
							fontSize: 12,
							fontWeight: 700,
							color: flow.isAssigned ? C.greenAlt : C.textSec,
							cursor:
								browser.isLoading || flow.isSaving ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							opacity: browser.isLoading || flow.isSaving ? 0.6 : 1,
						}}
					>
						{flow.isAssigned ? 'Change Assignment' : 'Use This Folder'}
					</button>
					{browser.parentFolderId !== null ? (
						<button
							type="button"
							onClick={browser.goBack}
							disabled={browser.isLoading}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 4,
								background: 'none',
								border: 'none',
								color: C.textSec,
								cursor: browser.isLoading ? 'not-allowed' : 'pointer',
								fontFamily: 'inherit',
								fontSize: 12,
								opacity: browser.isLoading ? 0.6 : 1,
							}}
						>
							<ChevronLeft size={14} />
							Back
						</button>
					) : null}
				</div>
			</div>

			{flow.isAssigned ? (
				<div style={{ marginBottom: 12 }}>
					<FolderAssignmentBadge assignments={flow.currentFolderAssignments} />
				</div>
			) : null}

			{journeyResult ? <JourneyResultPanel result={journeyResult} /> : null}

			{browser.error ? (
				<div
					style={{
						background: 'rgba(255,69,58,0.08)',
						border: '1px solid rgba(255,69,58,0.2)',
						borderRadius: 12,
						padding: '12px 14px',
						marginBottom: 12,
					}}
				>
					<div style={{ fontSize: 13, color: C.red, marginBottom: 8 }}>
						{browser.error}
					</div>
					<button
						type="button"
						onClick={browser.retry}
						style={{
							background: 'none',
							border: 'none',
							color: C.red,
							cursor: 'pointer',
							fontFamily: 'inherit',
							fontSize: 12,
							fontWeight: 700,
							padding: 0,
						}}
					>
						Try again
					</button>
				</div>
			) : null}

			{browser.isLoading ? (
				<div style={{ padding: '24px 0', textAlign: 'center' }}>
					<div style={{ fontSize: 13, color: C.textSec, marginBottom: 6 }}>
						Loading Google Drive…
					</div>
					<div style={{ fontSize: 12, color: C.textMuted }}>
						Fetching folders and files
					</div>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{browser.folders.length === 0 &&
					browser.files.length === 0 &&
					!browser.error ? (
						<div
							style={{ fontSize: 13, color: C.textMuted, padding: '12px 0' }}
						>
							This folder is empty.
						</div>
					) : null}

					{browser.folders.map((folder) => {
						const folderAssignments = assignmentsByFolderId.get(folder.id) ?? []

						return (
							<button
								key={folder.id}
								type="button"
								onClick={() => browser.openFolder(folder.id)}
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 12,
									padding: '12px 14px',
									borderRadius: 12,
									background: C.card2,
									border: `1px solid ${folderAssignments.length > 0 ? 'rgba(52,211,153,0.2)' : C.border}`,
									cursor: 'pointer',
									textAlign: 'left',
									fontFamily: 'inherit',
									width: '100%',
								}}
							>
								<Folder
									size={20}
									color={
										folderAssignments.length > 0 ? C.greenAlt : C.accentBlue
									}
									strokeWidth={1.8}
									style={{ flexShrink: 0, marginTop: 1 }}
								/>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 14,
											fontWeight: 600,
											color: C.text,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											marginBottom: 4,
										}}
									>
										📁 {folder.name}
									</div>
									{folderAssignments.length > 0 ? (
										<FolderAssignmentBadge assignments={folderAssignments} />
									) : (
										<div style={{ fontSize: 12, color: C.textMuted }}>
											Folder
										</div>
									)}
								</div>
							</button>
						)
					})}

					{browser.files.map((file) => (
						<DriveFileRow key={file.id} file={file} />
					))}

					{browser.nextPageToken ? (
						<button
							type="button"
							onClick={browser.loadMore}
							disabled={browser.isLoadingMore}
							style={{
								marginTop: 4,
								background: C.card2,
								border: `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '10px 16px',
								fontSize: 12,
								fontWeight: 700,
								color: C.textSec,
								cursor: browser.isLoadingMore ? 'not-allowed' : 'pointer',
								fontFamily: 'inherit',
								opacity: browser.isLoadingMore ? 0.6 : 1,
							}}
						>
							{browser.isLoadingMore ? 'Loading more…' : 'Load more'}
						</button>
					) : null}
				</div>
			)}

			<FolderAssignmentSheet
				members={members}
				isOpen={flow.isOpen}
				folderName={browser.currentFolderName}
				step={flow.step}
				suggestion={flow.suggestion}
				selectedMemberIds={flow.selectedMemberIds}
				existingFolders={flow.existingFolders}
				existingMode={flow.existingMode}
				isSaving={flow.isSaving}
				errorMessage={flow.errorMessage}
				successInfo={flow.successInfo}
				journeyPhase={flow.journeyPhase}
				journeyPhasesCompleted={flow.journeyPhasesCompleted}
				journeyPhasesSucceeded={flow.journeyPhasesSucceeded}
				journeyResult={flow.journeyResult}
				isJourneyRunning={flow.isJourneyRunning}
				onClose={flow.close}
				onConfirmSuggestion={() => void flow.handleConfirmSuggestion()}
				onChooseDifferentPerson={flow.handleChooseDifferentPerson}
				onToggleMember={flow.toggleMember}
				onExistingModeChange={flow.setExistingMode}
				onContinueExisting={() => void flow.handleContinueExisting()}
				onAssign={() => void flow.handleAssign()}
				onRetryJourney={() => void flow.handleRetryJourney()}
				onChooseDifferentFolder={flow.handleChooseDifferentFolder}
			/>
		</div>
	)
}

function JourneyResultPanel({ result }: { result: ImportJourneyResult }) {
	const heading =
		result.outcome === 'success'
			? 'Import complete'
			: result.outcome === 'partial_success'
				? 'Import partially complete'
				: result.outcome === 'failed'
					? 'Import failed'
					: 'Import summary'

	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
				marginBottom: 12,
			}}
		>
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: C.text,
					marginBottom: 8,
				}}
			>
				{heading}
			</div>
			<div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
				<div>Import candidates: {result.importCandidates}</div>
				<div>Reports imported: {result.reportsImported}</div>
				<div>Metrics extracted: {result.metricsExtracted}</div>
				{result.failedCount > 0 ? (
					<div>Failed imports: {result.failedCount}</div>
				) : null}
				{result.errorMessage ? (
					<div style={{ color: C.red, marginTop: 6 }}>
						{result.errorMessage}
					</div>
				) : null}
			</div>
		</div>
	)
}

function DriveFileRow({ file }: { file: DriveBrowseFile }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				padding: '12px 14px',
				borderRadius: 12,
				background: C.card2,
				border: `1px solid ${C.border}`,
			}}
		>
			<DriveFileIcon file={file} />
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 14,
						fontWeight: 600,
						color: C.text,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						marginBottom: 2,
					}}
				>
					{file.name}
				</div>
				<div style={{ fontSize: 12, color: C.textMuted }}>
					{formatMimeType(file.mimeType)} ·{' '}
					{formatModifiedDate(file.modifiedAt)}
				</div>
			</div>
		</div>
	)
}

function DriveFileIcon({ file }: { file: DriveBrowseFile }) {
	if (file.iconUrl) {
		return (
			<img
				src={file.iconUrl}
				alt=""
				width={20}
				height={20}
				referrerPolicy="no-referrer"
				style={{ flexShrink: 0, borderRadius: 2 }}
			/>
		)
	}

	const mime = file.mimeType.toLowerCase()

	if (
		mime.includes('pdf') ||
		mime.includes('document') ||
		mime.includes('text')
	) {
		return <FileText size={20} color={C.accentBlue} strokeWidth={1.8} />
	}

	if (mime.includes('image')) {
		return <FileImage size={20} color={C.greenAlt} strokeWidth={1.8} />
	}

	return <File size={20} color={C.textSec} strokeWidth={1.8} />
}

function formatMimeType(mimeType: string) {
	const mime = mimeType.toLowerCase()

	if (mime.includes('pdf')) {
		return 'PDF'
	}

	if (mime.includes('google-apps.document')) {
		return 'Google Doc'
	}

	if (mime.includes('google-apps.spreadsheet')) {
		return 'Google Sheet'
	}

	if (mime.includes('google-apps.presentation')) {
		return 'Google Slides'
	}

	if (mime.includes('image')) {
		return 'Image'
	}

	if (mime.includes('video')) {
		return 'Video'
	}

	const parts = mime.split('/')
	return parts[parts.length - 1]?.toUpperCase() || 'File'
}

function formatModifiedDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}
