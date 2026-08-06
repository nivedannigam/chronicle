import {
	Bell,
	Download,
	Eye,
	FolderSync,
	IndianRupee,
	RefreshCw,
	Shield,
	Trash2,
	Unplug,
	Users,
} from 'lucide-react'
import {
	ModuleSettingsAdvancedSection,
	ModuleSettingsConnectedFolderCard,
	ModuleSettingsRow,
	ModuleSettingsSection,
} from '@/ui/figma/settings/module-settings-ui'
import type {
	InsuranceCoverageDisplayPreference,
	InsuranceCurrencyPreference,
	InsuranceFamilyScopePreference,
	InsuranceModulePreferences,
	InsuranceRenewalReminderWindow,
} from '@/features/insurance/types/insurance-preferences.types'
import { FC } from '@/ui/figma/v2/atoms'

interface InsuranceSettingsViewProps {
	driveConnected: boolean
	driveLabel: string
	folderName: string | null
	folderPath: string | null
	documentCount: number
	lastScannedLabel: string | null
	isLoadingFolder: boolean
	preferences: InsuranceModulePreferences
	memberLabel: string
	onConnectDrive: () => void
	onChooseFolder: () => void
	onOpenFolder: () => void
	onChangeFolder: () => void
	onUpdatePreferences: (
		patch: Partial<InsuranceModulePreferences>,
	) => void | Promise<void>
	onPrivacy: () => void
	onExport: () => void
	onPermissions: () => void
	onDisconnect: () => void
	isDisconnecting?: boolean
	onForceRescan: () => void
	onRebuildKnowledge: () => void
	onViewDiagnostics: () => void
	onViewFailedDocuments: () => void
	onDownloadRawData: () => void
	onResetModule: () => void
	onDeleteInsuranceData: () => void
}

export function FigmaInsuranceSettingsView({
	driveConnected,
	driveLabel,
	folderName,
	folderPath,
	documentCount,
	lastScannedLabel,
	isLoadingFolder,
	preferences,
	memberLabel,
	onConnectDrive,
	onChooseFolder,
	onOpenFolder,
	onUpdatePreferences,
	onPrivacy,
	onExport,
	onPermissions,
	onDisconnect,
	isDisconnecting,
	onForceRescan,
	onRebuildKnowledge,
	onViewDiagnostics,
	onViewFailedDocuments,
	onDownloadRawData,
	onResetModule,
	onDeleteInsuranceData,
}: InsuranceSettingsViewProps) {
	return (
		<div style={{ paddingBottom: 32 }}>
			<ModuleSettingsSection label="Connected folder">
				<ModuleSettingsConnectedFolderCard
					moduleLabel="Insurance"
					driveConnected={driveConnected}
					driveLabel={driveLabel}
					folderName={folderName}
					folderPath={folderPath}
					documentCount={documentCount}
					lastScannedLabel={lastScannedLabel}
					onConnectDrive={onConnectDrive}
					onChangeFolder={onChooseFolder}
					onOpenFolder={onOpenFolder}
					isLoading={isLoadingFolder}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Coverage preferences">
				<PreferenceSelectRow
					icon={IndianRupee}
					color={FC.teal}
					title="Preferred currency"
					selectedValue={preferences.preferredCurrency}
					options={[
						{ value: 'INR', label: 'Indian Rupee (₹)' },
						{ value: 'USD', label: 'US Dollar ($)' },
						{ value: 'EUR', label: 'Euro (€)' },
						{ value: 'GBP', label: 'British Pound (£)' },
					]}
					onChange={(value) =>
						void onUpdatePreferences({
							preferredCurrency: value as InsuranceCurrencyPreference,
						})
					}
				/>
				<PreferenceSelectRow
					icon={Shield}
					color={FC.blue}
					title="Coverage display"
					selectedValue={preferences.coverageDisplay}
					options={[
						{ value: 'detailed', label: 'Detailed' },
						{ value: 'compact', label: 'Compact' },
					]}
					onChange={(value) =>
						void onUpdatePreferences({
							coverageDisplay: value as InsuranceCoverageDisplayPreference,
						})
					}
				/>
				<PreferenceToggleRow
					icon={IndianRupee}
					color={FC.amber}
					title="Annual premium display"
					subtitle="Show yearly premium totals across your policies"
					enabled={preferences.showAnnualPremium}
					onToggle={(enabled) =>
						void onUpdatePreferences({ showAnnualPremium: enabled })
					}
				/>
				<PreferenceSelectRow
					icon={Bell}
					color={FC.orange}
					title="Renewal reminder window"
					selectedValue={String(preferences.renewalReminderDays)}
					options={[
						{ value: '7', label: '7 days before' },
						{ value: '14', label: '14 days before' },
						{ value: '30', label: '30 days before' },
						{ value: '60', label: '60 days before' },
						{ value: '90', label: '90 days before' },
					]}
					onChange={(value) =>
						void onUpdatePreferences({
							renewalReminderDays: Number(
								value,
							) as InsuranceRenewalReminderWindow,
						})
					}
				/>
				<PreferenceToggleRow
					icon={Bell}
					color={FC.purple}
					title="Claim reminders"
					subtitle="Get notified when claims need attention"
					enabled={preferences.claimRemindersEnabled}
					onToggle={(enabled) =>
						void onUpdatePreferences({ claimRemindersEnabled: enabled })
					}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Notifications">
				<PreferenceToggleRow
					icon={Bell}
					color={FC.teal}
					title="Upcoming renewals"
					subtitle="Remind me before policies renew"
					enabled={preferences.notifications.upcomingRenewals}
					onToggle={(enabled) =>
						void onUpdatePreferences({
							notifications: {
								...preferences.notifications,
								upcomingRenewals: enabled,
							},
						})
					}
				/>
				<PreferenceToggleRow
					icon={Bell}
					color={FC.blue}
					title="Claims updates"
					subtitle="When a claim is submitted or settled"
					enabled={preferences.notifications.claimsUpdates}
					onToggle={(enabled) =>
						void onUpdatePreferences({
							notifications: {
								...preferences.notifications,
								claimsUpdates: enabled,
							},
						})
					}
				/>
				<PreferenceToggleRow
					icon={Bell}
					color={FC.orange}
					title="Policy expiry"
					subtitle="When a policy is about to lapse"
					enabled={preferences.notifications.policyExpiry}
					onToggle={(enabled) =>
						void onUpdatePreferences({
							notifications: {
								...preferences.notifications,
								policyExpiry: enabled,
							},
						})
					}
				/>
				<PreferenceToggleRow
					icon={Bell}
					color={FC.purple}
					title="Coverage changes"
					subtitle="When your protection profile changes"
					enabled={preferences.notifications.coverageChanges}
					onToggle={(enabled) =>
						void onUpdatePreferences({
							notifications: {
								...preferences.notifications,
								coverageChanges: enabled,
							},
						})
					}
				/>
				<PreferenceToggleRow
					icon={Bell}
					color={FC.amber}
					title="Premium due"
					subtitle="When a premium payment is coming up"
					enabled={preferences.notifications.premiumDue}
					onToggle={(enabled) =>
						void onUpdatePreferences({
							notifications: {
								...preferences.notifications,
								premiumDue: enabled,
							},
						})
					}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Family">
				<PreferenceSelectRow
					icon={Users}
					color={FC.pink}
					title="Show policies for"
					selectedValue={preferences.familyScope}
					options={[
						{ value: 'all', label: 'All members' },
						{ value: 'mine', label: 'Only mine' },
						{ value: 'specific', label: memberLabel },
					]}
					onChange={(value) =>
						void onUpdatePreferences({
							familyScope: value as InsuranceFamilyScopePreference,
						})
					}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsSection label="Privacy">
				<ModuleSettingsRow
					icon={Download}
					color={FC.teal}
					title="Export insurance data"
					subtitle="Download a copy of your policies and claims"
					actionLabel="Export"
					onAction={onExport}
				/>
				<ModuleSettingsRow
					icon={Trash2}
					color={FC.orange}
					title="Delete insurance data"
					subtitle="Remove imported policies from Chronicle"
					actionLabel="Delete"
					onAction={onDeleteInsuranceData}
					tone="danger"
				/>
				<ModuleSettingsRow
					icon={Unplug}
					color={FC.orange}
					title="Disconnect Google Drive"
					subtitle="Stop syncing new documents from Drive"
					actionLabel={isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
					onAction={onDisconnect}
					disabled={!driveConnected || isDisconnecting}
					tone="danger"
				/>
				<ModuleSettingsRow
					icon={Eye}
					color={FC.purple}
					title="Permissions"
					subtitle="Review what Chronicle can access"
					actionLabel="Review"
					onAction={onPermissions}
				/>
				<ModuleSettingsRow
					icon={Eye}
					color={FC.purple}
					title="Privacy settings"
					subtitle="Manage how your data is stored"
					actionLabel="Manage"
					onAction={onPrivacy}
				/>
			</ModuleSettingsSection>

			<ModuleSettingsAdvancedSection label="Advanced">
				<ModuleSettingsRow
					icon={FolderSync}
					color={FC.teal}
					title="Force re-scan folder"
					subtitle="Check your insurance folder for new documents"
					actionLabel="Re-scan"
					onAction={onForceRescan}
				/>
				<ModuleSettingsRow
					icon={RefreshCw}
					color={FC.blue}
					title="Rebuild insurance knowledge"
					subtitle="Refresh your protection profile from documents"
					actionLabel="Rebuild"
					onAction={onRebuildKnowledge}
				/>
				<ModuleSettingsRow
					icon={Eye}
					color={FC.amber}
					title="View import diagnostics"
					subtitle="See what Chronicle found in your folder"
					actionLabel="View"
					onAction={onViewDiagnostics}
				/>
				<ModuleSettingsRow
					icon={Trash2}
					color={FC.orange}
					title="View failed documents"
					subtitle="Documents that could not be read"
					actionLabel="View"
					onAction={onViewFailedDocuments}
				/>
				<ModuleSettingsRow
					icon={Download}
					color={FC.mid}
					title="Download raw data"
					subtitle="Export the underlying policy records"
					actionLabel="Download"
					onAction={onDownloadRawData}
				/>
				<ModuleSettingsRow
					icon={RefreshCw}
					color={FC.red}
					title="Reset insurance module"
					subtitle="Clear folder assignment and preferences"
					actionLabel="Reset"
					onAction={onResetModule}
					tone="danger"
				/>
			</ModuleSettingsAdvancedSection>
		</div>
	)
}

function PreferenceToggleRow({
	icon: Icon,
	color,
	title,
	subtitle,
	enabled,
	onToggle,
}: {
	icon: typeof Bell
	color: string
	title: string
	subtitle: string
	enabled: boolean
	onToggle: (enabled: boolean) => void
}) {
	return (
		<ModuleSettingsRow
			icon={Icon}
			color={color}
			title={title}
			subtitle={subtitle}
			actionLabel={enabled ? 'On' : 'Off'}
			onAction={() => onToggle(!enabled)}
		/>
	)
}

function PreferenceSelectRow({
	icon: Icon,
	color,
	title,
	selectedValue,
	options,
	onChange,
}: {
	icon: typeof Bell
	color: string
	title: string
	selectedValue: string
	options: Array<{ value: string; label: string }>
	onChange: (value: string) => void
}) {
	return (
		<div
			style={{
				borderRadius: 20,
				padding: '16px 18px',
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				display: 'flex',
				alignItems: 'center',
				gap: 13,
			}}
		>
			<div
				style={{
					width: 42,
					height: 42,
					borderRadius: 14,
					background: `${color}18`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Icon size={18} color={color} strokeWidth={1.8} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14.5,
						fontWeight: 600,
						margin: '0 0 3px',
					}}
				>
					{title}
				</p>
				<select
					value={selectedValue}
					onChange={(event) => onChange(event.target.value)}
					style={{
						width: '100%',
						background: 'transparent',
						border: 'none',
						color: FC.mid,
						fontSize: 12.5,
						fontFamily: 'inherit',
						padding: 0,
						outline: 'none',
						cursor: 'pointer',
					}}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</div>
	)
}
