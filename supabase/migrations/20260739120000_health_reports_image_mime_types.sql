-- Allow common medical document image formats in health-reports storage.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
	'application/pdf',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/heic',
	'image/heif',
	'image/tiff',
	'image/webp'
]
WHERE id = 'health-reports';
