export function mapAssignmentError(error: unknown): string {
	const message =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase()

	if (message.includes('duplicate') || message.includes('unique')) {
		return 'This folder is already assigned to the selected family member.'
	}

	if (message.includes('not found') || message.includes('does not exist')) {
		return 'This folder may have been deleted from Google Drive. Try browsing again.'
	}

	if (
		message.includes('permission') ||
		message.includes('403') ||
		message.includes('insufficient')
	) {
		return 'Chronicle no longer has permission to access this folder. Reconnect Google Drive.'
	}

	if (
		message.includes('unauthorized') ||
		message.includes('401') ||
		message.includes('invalid_grant') ||
		message.includes('token')
	) {
		return 'Google Drive disconnected. Reconnect your account and try again.'
	}

	if (message.includes('network') || message.includes('fetch')) {
		return 'Could not reach Google Drive. Check your connection and try again.'
	}

	if (error instanceof Error && error.message) {
		return error.message
	}

	return 'Could not save the folder assignment. Please try again.'
}

export function mapScanError(error: unknown): string {
	const message =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase()

	if (message.includes('permission') || message.includes('403')) {
		return 'Cannot scan this folder — Google Drive permission was revoked.'
	}

	if (
		message.includes('unauthorized') ||
		message.includes('401') ||
		message.includes('token')
	) {
		return 'Google Drive disconnected. Reconnect before scanning.'
	}

	if (message.includes('not found')) {
		return 'This folder no longer exists in Google Drive.'
	}

	if (error instanceof Error && error.message) {
		return error.message
	}

	return 'Could not scan for medical reports. Please try again.'
}
