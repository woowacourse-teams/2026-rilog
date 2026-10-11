interface NotificationPostTitleProps {
	title: string;
	isStruckThrough?: boolean;
}

const MAX_TITLE_LENGTH = 19;

export default function NotificationPostTitle({ title, isStruckThrough = false }: NotificationPostTitleProps) {
	const titleCharacters = Array.from(title);
	const displayTitle =
		titleCharacters.length > MAX_TITLE_LENGTH ? `${titleCharacters.slice(0, MAX_TITLE_LENGTH).join('')}...` : title;

	return <strong className={`font-semibold ${isStruckThrough ? 'line-through' : ''}`}>{displayTitle}</strong>;
}
