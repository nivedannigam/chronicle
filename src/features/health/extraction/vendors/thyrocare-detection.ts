export function isThyrocareOcrText(text: string): boolean {
	if (/thyrocare/i.test(text)) {
		return true
	}

	if (/Tests you can trust/i.test(text)) {
		return true
	}

	if (/wellness@thyrocare\.com/i.test(text)) {
		return true
	}

	if (/Clinically Tested by\s*:\s*Thyrocare/i.test(text)) {
		return true
	}

	if (/AAROGYAM|Aarogyam Full Body/i.test(text)) {
		return true
	}

	if (/Sohrabh Hall/i.test(text) && /TEST NAME/i.test(text)) {
		return true
	}

	if (/HDFC COMBO/i.test(text) && /Bio\. Ref\. Interval/i.test(text)) {
		return true
	}

	return false
}
