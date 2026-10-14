interface EnterpriseArticleText {
	title: string;
	summary: string;
}

const SUMMARY_CHARACTER_LIMIT = 100;
const CHARACTER_SEGMENTER = new Intl.Segmenter('ko', { granularity: 'grapheme' });

function truncateText(text: string, characterLimit: number): string {
	const characters = Array.from(CHARACTER_SEGMENTER.segment(text), ({ segment }) => segment);
	return characters.length > characterLimit ? `${characters.slice(0, characterLimit - 1).join('')}…` : text;
}

export function formatEnterpriseArticleText({ title, summary }: EnterpriseArticleText): EnterpriseArticleText {
	return {
		title,
		summary: truncateText(summary, SUMMARY_CHARACTER_LIMIT),
	};
}
