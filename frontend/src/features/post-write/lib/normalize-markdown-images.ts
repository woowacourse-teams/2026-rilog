export const normalizeMarkdownImages = (text: string): string => {
	const newline = text.match(/\r\n|\n/)?.[0] ?? '\n';
	const lines = text.split(/\r?\n/);
	const normalizedLines: string[] = [];
	const imageLineRegex = /^!\[[^\]]*\]\([^)\r\n]+\)$/;

	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i];
		const isImage = imageLineRegex.test(currentLine.trim());

		if (isImage) {
			if (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1].trim() !== '') {
				normalizedLines.push('');
			}
			normalizedLines.push(currentLine.trim());
			if (i + 1 < lines.length && lines[i + 1].trim() !== '') {
				normalizedLines.push('');
			}
		} else {
			normalizedLines.push(currentLine);
		}
	}

	return normalizedLines.join(newline);
};
