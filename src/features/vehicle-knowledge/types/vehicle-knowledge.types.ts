export type VehicleCategoryId = 'car' | 'two_wheeler' | 'other'

export type VehicleStatus = 'active' | 'sold' | 'inactive'

export type VehicleAttentionSeverity = 'high' | 'medium' | 'low'

export type VehicleTimelineEventType =
	| 'vehicle_purchased'
	| 'registration_issued'
	| 'insurance_started'
	| 'insurance_renewed'
	| 'puc_renewed'
	| 'service_completed'
	| 'warranty_started'
	| 'warranty_expiring'
	| 'document_added'

export type VehicleFactKey =
	| 'registration_number'
	| 'registration_date'
	| 'insurance_provider'
	| 'policy_number'
	| 'policy_start'
	| 'policy_expiry'
	| 'idv'
	| 'premium'
	| 'puc_expiry'
	| 'warranty_expiry'
	| 'service_date'
	| 'service_mileage'
	| 'service_amount'
	| 'vin'
	| 'engine_number'
	| 'purchase_date'
