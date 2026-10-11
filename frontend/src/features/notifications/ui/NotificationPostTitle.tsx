interface NotificationPostTitleProps {
	title: string;
}

const MAX_TITLE_LENGTH = 19;

export default function NotificationPostTitle({ title }: NotificationPostTitleProps) {
	const titleCharacters = Array.from(title);
	const displayTitle =
		titleCharacters.length > MAX_TITLE_LENGTH ? `${titleCharacters.slice(0, MAX_TITLE_LENGTH).join('')}...` : title;

	return <strong className="font-semibold">{displayTitle}</strong>;
}
