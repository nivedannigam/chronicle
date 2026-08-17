import { Cloud, Download, Eye, Folder, Unplug } from 'lucide-react'
import { USER_VOCAB } from '@/constants/user-vocabulary'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsEmptyCard,
	ModuleSettingsRow,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import { FC } from '@/ui/figma/v2/atoms'

interface FolderAssignment {
	id: string
	folderName: string
}

export function FigmaHealthSettingsView({
	driveConnected,
	memberLabel,
	assignments,
	isLoadingAssignments,
	onConnectDrive,
	onChooseFolder,
	onChangeFolder,
	onPrivacy,
	onExport,
	onDisconnect,
	isDisconnecting,
	importCenterAttentionCount = 0,
	onOpenImportCenter,
}: {
	driveConnected: boolean
	memberLabel: string
	assignments: FolderAssignment[]
	isLoadingAssignments: boolean
	onConnectDrive: () => void
	onChooseFolder: () => void
	onChangeFolder: () => void
	onPrivacy: () => void
	onExport: () => void
	onDisconnect: () => void
	isDisconnecting?: boolean
	importCenterAttentionCount?: number
	onOpenImportCenter: () => void
}) {
	return (
		<div style={{ paddingBottom: 32 }}>
			<ModuleSettingsSection label={USER_VOCAB.sections.dataSource}>
				<ModuleSettingsRow
					icon={Cloud}
					color={driveConnected ? FC.green : FC.amber}
					title="Google Drive"
					subtitle={
						driveConnected
							? 'Connected to your account'
							: 'Connect to organize health records'
					}
					actionLabel={driveConnected ? 'Manage' : 'Connect'}
					onAction={onConnectDrive}
				/>
				{isLoadingAssignments ? (
					<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>Loading…</p>
				) : assignments.length === 0 ? (
					<ModuleSettingsEmptyCard
						message={`No health folder connected for ${memberLabel} yet.`}
						actionLabel="Choose folder"
						onAction={onChooseFolder}
					/>
				) : (
					assignments.map((assignment) => (
						<ModuleSettingsRow
							key={assignment.id}
							icon={Folder}
							color={FC.blue}
							title="Connected folder"
							subtitle={`Chronicle/Health · ${assignment.folderName}`}
							actionLabel="Change"
							onAction={onChangeFolder}
						/>
					))
				)}
			</ModuleSettingsSection>

			<ModuleSettingsSection label={USER_VOCAB.sections.importPreferences}>
				<ModuleSettingsRow
					icon={Eye}
					color={FC.purple}
					title="Family member handling"
					subtitle={`Currently managing records for ${memberLabel}`}
					actionLabel="Family"
					onAction={onPrivacy}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Privacy">
				<ModuleSettingsRow
					icon={Eye}
					color={FC.purple}
					title="Health data visibility"
					subtitle="Stored securely in your account"
					actionLabel="Manage"
					onAction={onPrivacy}
				/>
				<ModuleSettingsRow
					icon={Download}
					color={FC.teal}
					title="Export your data"
					subtitle="Download a copy of your health records"
					actionLabel="Export"
					onAction={onExport}
				/>
			</ModuleSettingsSection>

			{importCenterAttentionCount > 0 ? (
				<ModuleSettingsSection label={USER_VOCAB.sections.needsAttention}>
					<ModuleSettingsRow
						icon={Folder}
						color={FC.amber}
						title={USER_VOCAB.sections.reviewDocuments}
						subtitle={`${importCenterAttentionCount} document${importCenterAttentionCount === 1 ? '' : 's'} need your attention`}
						actionLabel="Review"
						onAction={onOpenImportCenter}
					/>
				</ModuleSettingsSection>
			) : null}

			<ModuleSettingsAdvancedSection label={USER_VOCAB.sections.advanced}>
				<ModuleSettingsRow
					icon={Folder}
					color={FC.teal}
					title={USER_VOCAB.sections.reviewDocuments}
					subtitle="Documents that need your attention"
					actionLabel="Open"
					onAction={onOpenImportCenter}
				/>
				<ModuleSettingsRow
					icon={Unplug}
					color={FC.orange}
					title="Disconnect Google Drive"
					subtitle="Stop syncing new reports from Drive"
					actionLabel={isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
					onAction={onDisconnect}
					disabled={!driveConnected || isDisconnecting}
					tone="danger"
				/>
			</ModuleSettingsAdvancedSection>
		</div>
	)
}
