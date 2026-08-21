export interface RouteContract {
	path: string
	expectedScreen: string
	module?: string
	priority: 'P0' | 'P1' | 'P2'
	screenTitle?: string | RegExp
	marker?: RegExp
	testId?: string
	requiresFullDataset?: boolean
	/** Canonical destination when route redirects (regex against full URL path+search) */
	redirectsTo?: RegExp
}

export const CHRONICLE_ROUTE_CONTRACTS: RouteContract[] = [
	{
		path: '/home',
		expectedScreen: 'Home',
		priority: 'P0',
		marker: /life score|daily brief|quick actions|home/i,
	},
	{
		path: '/modules',
		expectedScreen: 'Modules',
		priority: 'P0',
		screenTitle: /modules/i,
		marker: /health|insurance|vehicles/i,
	},
	{
		path: '/timeline',
		expectedScreen: 'Timeline',
		priority: 'P0',
		screenTitle: /timeline/i,
	},
	{
		path: '/search',
		expectedScreen: 'Search',
		priority: 'P0',
		screenTitle: /search/i,
	},
	{
		path: '/ask',
		expectedScreen: 'Ask',
		priority: 'P0',
		screenTitle: 'Ask Chronicle',
	},
	{
		path: '/documents/library',
		expectedScreen: 'Library',
		priority: 'P0',
		marker: /library|documents|filter/i,
	},
	{
		path: '/profile',
		expectedScreen: 'You',
		priority: 'P1',
		marker: /profile|you|settings|account/i,
	},
	{
		path: '/profile/family',
		expectedScreen: 'Family',
		priority: 'P1',
		marker: /family|member/i,
	},
	{
		path: '/health',
		expectedScreen: 'Health Home',
		module: 'health',
		priority: 'P0',
		screenTitle: 'Health',
	},
	{
		path: '/health/progress',
		expectedScreen: 'Health Progress',
		module: 'health',
		priority: 'P1',
		screenTitle: 'Health',
		marker: /progress|connect|metric|trend/i,
	},
	{
		path: '/health/history',
		expectedScreen: 'Health History',
		module: 'health',
		priority: 'P1',
		screenTitle: 'Health',
		marker: /history|visit|report|connect/i,
	},
	{
		path: '/health/reports',
		expectedScreen: 'Health Reports',
		module: 'health',
		priority: 'P1',
		screenTitle: 'Health',
		marker: /report|lab|connect|upload/i,
	},
	{
		path: '/health/ask',
		expectedScreen: 'Health Ask',
		module: 'health',
		priority: 'P1',
		redirectsTo: /\/ask\?.*context=health/,
		screenTitle: 'Ask Chronicle',
	},
	{
		path: '/health/settings',
		expectedScreen: 'Health Settings',
		module: 'health',
		priority: 'P1',
		screenTitle: 'Health',
		marker: /settings|drive|folder/i,
	},
	{
		path: '/insurance',
		expectedScreen: 'Insurance Home',
		module: 'insurance',
		priority: 'P0',
		marker: /insurance|protection|policy|coverage/i,
	},
	{
		path: '/insurance/policies',
		expectedScreen: 'Insurance Policies',
		module: 'insurance',
		priority: 'P1',
		marker: /polic/i,
	},
	{
		path: '/insurance/claims',
		expectedScreen: 'Insurance Claims',
		module: 'insurance',
		priority: 'P1',
		marker: /claim/i,
	},
	{
		path: '/insurance/coverage',
		expectedScreen: 'Insurance Coverage',
		module: 'insurance',
		priority: 'P1',
		marker: /coverage|protection/i,
	},
	{
		path: '/insurance/timeline',
		expectedScreen: 'Insurance Timeline',
		module: 'insurance',
		priority: 'P2',
		marker: /timeline|history|insurance/i,
	},
	{
		path: '/insurance/ask',
		expectedScreen: 'Insurance Ask',
		module: 'insurance',
		priority: 'P1',
		redirectsTo: /\/ask\?.*context=insurance/,
		screenTitle: 'Ask Chronicle',
	},
	{
		path: '/insurance/settings',
		expectedScreen: 'Insurance Settings',
		module: 'insurance',
		priority: 'P1',
		marker: /settings|folder|drive/i,
	},
	{
		path: '/vehicles',
		expectedScreen: 'Vehicles Home',
		module: 'vehicles',
		priority: 'P0',
		marker: /vehicle|xev|compact/i,
	},
	{
		path: '/vehicles/xev-9e',
		expectedScreen: 'Vehicle Detail',
		module: 'vehicles',
		priority: 'P1',
		requiresFullDataset: true,
		testId: 'vehicle-detail-view',
		marker: /xev 9e/i,
	},
	{
		path: '/vehicles/timeline',
		expectedScreen: 'Vehicle Timeline',
		module: 'vehicles',
		priority: 'P2',
		marker: /timeline|vehicle|service|insurance/i,
	},
	{
		path: '/vehicles/ask',
		expectedScreen: 'Vehicle Ask',
		module: 'vehicles',
		priority: 'P1',
		redirectsTo: /\/ask\?.*context=vehicles/,
		screenTitle: 'Ask Chronicle',
	},
	{
		path: '/vehicles/settings',
		expectedScreen: 'Vehicle Settings',
		module: 'vehicles',
		priority: 'P1',
		marker: /settings|folder|vehicle/i,
	},
	{
		path: '/identity',
		expectedScreen: 'Identity Home',
		module: 'identity',
		priority: 'P0',
		marker: /identity|passport|pan|aadhaar/i,
	},
	{
		path: '/identity/settings',
		expectedScreen: 'Identity Settings',
		module: 'identity',
		priority: 'P1',
		marker: /settings|identity|folder/i,
	},
	{
		path: '/finance',
		expectedScreen: 'Finance Home',
		module: 'finance',
		priority: 'P0',
		marker: /finance|account|loan|investment/i,
	},
	{
		path: '/finance/history',
		expectedScreen: 'Finance History',
		module: 'finance',
		priority: 'P1',
		marker: /history|finance|event/i,
	},
	{
		path: '/finance/settings',
		expectedScreen: 'Finance Settings',
		module: 'finance',
		priority: 'P1',
		marker: /settings|finance|folder/i,
	},
	{
		path: '/property',
		expectedScreen: 'Property Home',
		module: 'property',
		priority: 'P0',
		marker: /property|pune|home/i,
	},
	{
		path: '/property/pune-home',
		expectedScreen: 'Property Detail',
		module: 'property',
		priority: 'P1',
		requiresFullDataset: true,
		marker: /pune|property|home|tax|loan/i,
	},
	{
		path: '/property/history',
		expectedScreen: 'Property History',
		module: 'property',
		priority: 'P1',
		marker: /history|property|purchase|tax/i,
	},
	{
		path: '/property/settings',
		expectedScreen: 'Property Settings',
		module: 'property',
		priority: 'P1',
		marker: /settings|property|folder/i,
	},
]

export const NAVIGATION_FLOWS: Array<{
	from: string
	to: string
	label: string
}> = [
	{ from: '/home', to: '/modules', label: 'Home → Modules' },
	{ from: '/modules', to: '/health', label: 'Modules → Health' },
	{ from: '/modules', to: '/insurance', label: 'Modules → Insurance' },
	{ from: '/modules', to: '/vehicles', label: 'Modules → Vehicles' },
	{ from: '/modules', to: '/identity', label: 'Modules → Identity' },
	{ from: '/modules', to: '/finance', label: 'Modules → Finance' },
	{ from: '/modules', to: '/property', label: 'Modules → Property' },
	{ from: '/health', to: '/documents/library', label: 'Health → Library' },
	{ from: '/health/ask', to: '/health', label: 'Health Ask → Health' },
	{
		from: '/insurance',
		to: '/ask?context=insurance',
		label: 'Insurance → Ask',
	},
	{ from: '/vehicles', to: '/vehicles/settings', label: 'Vehicles → Settings' },
]

export const FORBIDDEN_UI_TERMS = [
	'supabase',
	'rpc',
	'uuid',
	'stack trace',
	'ocr pipeline',
	'parser registry',
	'edge function',
]

export const FORBIDDEN_RAW_IDENTIFIERS = [
	'QA1234567',
	'QA7654321',
	'1234-5678-9012',
	'QAAPA1234Q',
]

export const BOTTOM_NAV_LABELS = [
	'Home',
	'Modules',
	'Ask',
	'Library',
	'You',
] as const
