export type InsuranceCurrencyPreference = 'INR' | 'USD' | 'EUR' | 'GBP'

export type InsuranceCoverageDisplayPreference = 'compact' | 'detailed'

export type InsuranceFamilyScopePreference = 'all' | 'mine' | 'specific'

export type InsuranceRenewalReminderWindow = 7 | 14 | 30 | 60 | 90

export interface InsuranceNotificationPreferences {
	upcomingRenewals: boolean
	claimsUpdates: boolean
	policyExpiry: boolean
	coverageChanges: boolean
	premiumDue: boolean
}

export interface InsuranceModulePreferences {
	preferredCurrency: InsuranceCurrencyPreference
	coverageDisplay: InsuranceCoverageDisplayPreference
	showAnnualPremium: boolean
	renewalReminderDays: InsuranceRenewalReminderWindow
	claimRemindersEnabled: boolean
	notifications: InsuranceNotificationPreferences
	familyScope: InsuranceFamilyScopePreference
	familyScopeMemberId: string | null
	lastScannedAt: string | null
}

export const DEFAULT_INSURANCE_PREFERENCES: InsuranceModulePreferences = {
	preferredCurrency: 'INR',
	coverageDisplay: 'detailed',
	showAnnualPremium: true,
	renewalReminderDays: 30,
	claimRemindersEnabled: true,
	notifications: {
		upcomingRenewals: true,
		claimsUpdates: true,
		policyExpiry: true,
		coverageChanges: true,
		premiumDue: true,
	},
	familyScope: 'all',
	familyScopeMemberId: null,
	lastScannedAt: null,
}
