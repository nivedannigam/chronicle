export interface DocumentSubCategory {
	id: string
	label: string
	keywords: string[]
}

export interface DocumentCategoryDefinition {
	id: string
	label: string
	icon: string
	keywords: string[]
	subCategories: DocumentSubCategory[]
}

/** Extensible document category registry — add categories without code changes to extraction. */
export const DOCUMENT_CATEGORY_REGISTRY: DocumentCategoryDefinition[] = [
	{
		id: 'identity',
		label: 'Identity',
		icon: 'id-card',
		keywords: [
			'passport',
			'aadhaar',
			'aadhar',
			'pan',
			'licence',
			'license',
			'voter',
		],
		subCategories: [
			{ id: 'passport', label: 'Passport', keywords: ['passport'] },
			{
				id: 'aadhaar',
				label: 'Aadhaar',
				keywords: ['aadhaar', 'aadhar', 'uid'],
			},
			{ id: 'pan', label: 'PAN', keywords: ['pan', 'permanent account'] },
			{
				id: 'driving-licence',
				label: 'Driving Licence',
				keywords: ['driving', 'licence', 'license', 'dl'],
			},
			{ id: 'voter-id', label: 'Voter ID', keywords: ['voter', 'election'] },
		],
	},
	{
		id: 'education',
		label: 'Education',
		icon: 'graduation-cap',
		keywords: ['degree', 'certificate', 'marksheet', 'transcript', 'diploma'],
		subCategories: [
			{
				id: 'degree',
				label: 'Degree',
				keywords: ['degree', 'bachelor', 'master'],
			},
			{
				id: 'certificate',
				label: 'Certificate',
				keywords: ['certificate', 'certification'],
			},
			{
				id: 'marksheet',
				label: 'Marksheet',
				keywords: ['marksheet', 'marks', 'grade'],
			},
		],
	},
	{
		id: 'property',
		label: 'Property',
		icon: 'home',
		keywords: ['sale', 'lease', 'registration', 'property', 'tax receipt'],
		subCategories: [
			{
				id: 'purchase-sale',
				label: 'Purchase / Sale',
				keywords: ['sale', 'purchase', 'sale deed'],
			},
			{
				id: 'sale-agreement',
				label: 'Sale Agreement',
				keywords: ['sale agreement', 'purchase agreement'],
			},
			{
				id: 'agreement',
				label: 'Agreement',
				keywords: ['agreement', 'mou'],
			},
			{ id: 'lease', label: 'Lease', keywords: ['lease', 'rental'] },
			{
				id: 'registration',
				label: 'Registration',
				keywords: ['registration', 'registered'],
			},
			{
				id: 'possession',
				label: 'Possession',
				keywords: ['possession', 'handover', 'occupancy certificate'],
			},
			{
				id: 'property-tax',
				label: 'Property Tax',
				keywords: ['property tax', 'tax receipt'],
			},
			{
				id: 'tax-receipt',
				label: 'Tax Receipt',
				keywords: ['tax', 'municipal tax'],
			},
			{
				id: 'society-maintenance',
				label: 'Society / Maintenance',
				keywords: ['society', 'maintenance', 'hoa'],
			},
			{
				id: 'home-loan',
				label: 'Home Loan',
				keywords: ['home loan', 'housing loan', 'sanction letter'],
			},
			{
				id: 'utility',
				label: 'Electricity / Utility',
				keywords: ['electricity', 'utility', 'power bill'],
			},
			{
				id: 'property-insurance',
				label: 'Property Insurance',
				keywords: ['home insurance', 'property insurance'],
			},
			{
				id: 'warranty',
				label: 'Warranty',
				keywords: ['warranty', 'guarantee'],
			},
			{
				id: 'renovation',
				label: 'Renovation',
				keywords: ['renovation', 'interior', 'contractor'],
			},
			{
				id: 'legal',
				label: 'Legal',
				keywords: ['legal', 'notice', 'affidavit', 'noc'],
			},
			{ id: 'other', label: 'Other', keywords: [] },
		],
	},
	{
		id: 'insurance',
		label: 'Insurance',
		icon: 'shield',
		keywords: ['insurance', 'policy', 'premium', 'coverage'],
		subCategories: [
			{
				id: 'health-insurance',
				label: 'Health',
				keywords: ['health insurance', 'medical policy'],
			},
			{
				id: 'life-insurance',
				label: 'Life',
				keywords: ['life insurance', 'term plan'],
			},
			{
				id: 'vehicle-insurance',
				label: 'Vehicle',
				keywords: ['motor', 'vehicle', 'car insurance'],
			},
			{
				id: 'home-insurance',
				label: 'Home',
				keywords: ['home insurance', 'property insurance'],
			},
		],
	},
	{
		id: 'employment',
		label: 'Employment',
		icon: 'briefcase',
		keywords: ['offer', 'salary', 'experience', 'employment', 'payslip'],
		subCategories: [
			{
				id: 'offer-letter',
				label: 'Offer Letter',
				keywords: ['offer letter', 'appointment'],
			},
			{
				id: 'salary-slip',
				label: 'Salary Slip',
				keywords: ['salary', 'payslip', 'pay slip'],
			},
			{
				id: 'experience-letter',
				label: 'Experience Letter',
				keywords: ['experience', 'relieving'],
			},
		],
	},
	{
		id: 'financial',
		label: 'Financial',
		icon: 'landmark',
		keywords: ['bank', 'statement', 'tax return', 'investment', 'itr'],
		subCategories: [
			{
				id: 'bank-statement',
				label: 'Bank Statement',
				keywords: ['bank statement', 'account statement'],
			},
			{
				id: 'credit-card-statement',
				label: 'Credit Card Statement',
				keywords: ['credit card', 'card statement'],
			},
			{
				id: 'loan-statement',
				label: 'Loan Statement',
				keywords: ['loan', 'emi', 'home loan'],
			},
			{
				id: 'investment-statement',
				label: 'Investment Statement',
				keywords: ['investment', 'portfolio', 'mutual fund'],
			},
			{
				id: 'tax-record',
				label: 'Tax Record',
				keywords: ['tax return', 'itr', 'income tax'],
			},
			{
				id: 'nps-statement',
				label: 'NPS Statement',
				keywords: ['nps', 'national pension'],
			},
			{
				id: 'epf-statement',
				label: 'EPF Statement',
				keywords: ['epf', 'provident fund'],
			},
			{
				id: 'ppf-statement',
				label: 'PPF Statement',
				keywords: ['ppf', 'public provident fund'],
			},
			{
				id: 'fd-statement',
				label: 'Fixed Deposit Statement',
				keywords: ['fixed deposit', 'fd statement'],
			},
			{
				id: 'salary-slip',
				label: 'Salary Slip',
				keywords: ['salary slip', 'payslip'],
			},
			{
				id: 'insurance-financial',
				label: 'Insurance Financial Record',
				keywords: ['insurance premium', 'lic premium'],
			},
			{
				id: 'other',
				label: 'Other Financial',
				keywords: ['finance', 'statement'],
			},
		],
	},
	{
		id: 'medical',
		label: 'Medical',
		icon: 'heart-pulse',
		keywords: ['prescription', 'vaccination', 'discharge', 'medical'],
		subCategories: [
			{
				id: 'prescription',
				label: 'Prescription',
				keywords: ['prescription', 'rx'],
			},
			{
				id: 'vaccination',
				label: 'Vaccination Record',
				keywords: ['vaccination', 'vaccine', 'immunization'],
			},
			{
				id: 'discharge-summary',
				label: 'Discharge Summary',
				keywords: ['discharge', 'hospital summary'],
			},
		],
	},
	{
		id: 'other',
		label: 'Other',
		icon: 'file',
		keywords: ['warranty', 'manual', 'receipt'],
		subCategories: [
			{
				id: 'warranty',
				label: 'Warranty',
				keywords: ['warranty', 'guarantee'],
			},
			{ id: 'manual', label: 'Manual', keywords: ['manual', 'user guide'] },
			{ id: 'custom', label: 'Custom', keywords: [] },
		],
	},
	{
		id: 'vehicles',
		label: 'Vehicles',
		icon: 'car',
		keywords: [
			'vehicle',
			'motor',
			'rc book',
			'registration certificate',
			'mahindra',
			'honda',
			'car',
		],
		subCategories: [
			{
				id: 'registration',
				label: 'Registration',
				keywords: ['rc', 'registration certificate'],
			},
			{
				id: 'vehicle-insurance',
				label: 'Vehicle Insurance',
				keywords: ['motor insurance', 'vehicle policy'],
			},
			{
				id: 'service-record',
				label: 'Service Record',
				keywords: ['service', 'maintenance'],
			},
		],
	},
	{
		id: 'travel',
		label: 'Travel',
		icon: 'plane',
		keywords: ['visa', 'ticket', 'boarding', 'itinerary', 'travel'],
		subCategories: [
			{ id: 'visa', label: 'Visa', keywords: ['visa'] },
			{ id: 'ticket', label: 'Ticket', keywords: ['ticket', 'boarding pass'] },
			{
				id: 'itinerary',
				label: 'Itinerary',
				keywords: ['itinerary', 'booking'],
			},
		],
	},
	{
		id: 'personal',
		label: 'Personal',
		icon: 'folder',
		keywords: ['personal', 'receipt', 'invoice', 'warranty'],
		subCategories: [
			{ id: 'receipt', label: 'Receipt', keywords: ['receipt', 'invoice'] },
			{ id: 'warranty', label: 'Warranty', keywords: ['warranty'] },
			{ id: 'custom', label: 'Other', keywords: [] },
		],
	},
]

export function getDocumentCategory(
	categoryId: string,
): DocumentCategoryDefinition | undefined {
	return DOCUMENT_CATEGORY_REGISTRY.find(
		(category) => category.id === categoryId,
	)
}

export function getDocumentSubCategory(
	categoryId: string,
	subCategoryId: string,
): DocumentSubCategory | undefined {
	return getDocumentCategory(categoryId)?.subCategories.find(
		(item) => item.id === subCategoryId,
	)
}

export function inferDocumentCategory(input: {
	fileName: string
	text?: string | null
}): { categoryId: string; subCategoryId: string | null } {
	const haystack = `${input.fileName} ${input.text ?? ''}`.toLowerCase()

	for (const category of DOCUMENT_CATEGORY_REGISTRY) {
		for (const sub of category.subCategories) {
			if (sub.keywords.some((keyword) => haystack.includes(keyword))) {
				return { categoryId: category.id, subCategoryId: sub.id }
			}
		}

		if (category.keywords.some((keyword) => haystack.includes(keyword))) {
			return {
				categoryId: category.id,
				subCategoryId: category.subCategories[0]?.id ?? null,
			}
		}
	}

	return { categoryId: 'other', subCategoryId: 'custom' }
}

export function resolveCategoryFromQuery(question: string): string | undefined {
	const normalized = question.toLowerCase()

	for (const category of DOCUMENT_CATEGORY_REGISTRY) {
		if (
			category.keywords.some((keyword) => normalized.includes(keyword)) ||
			normalized.includes(category.label.toLowerCase())
		) {
			return category.id
		}
	}

	return undefined
}
