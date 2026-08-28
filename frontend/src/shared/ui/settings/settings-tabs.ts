export interface SettingsTabItem<T extends string> {
	id: T;
	label: string;
}

export const getNextSettingsTab = <T extends string>(
	tabs: readonly SettingsTabItem<T>[],
	currentTab: T,
	key: string,
): T | null => {
	const currentIndex = tabs.findIndex(({ id }) => id === currentTab);

	if (currentIndex === -1 || tabs.length === 0) {
		return null;
	}

	switch (key) {
		case 'ArrowRight':
			return tabs[(currentIndex + 1) % tabs.length]?.id ?? null;
		case 'ArrowLeft':
			return tabs[(currentIndex - 1 + tabs.length) % tabs.length]?.id ?? null;
		case 'Home':
			return tabs[0]?.id ?? null;
		case 'End':
			return tabs.at(-1)?.id ?? null;
		default:
			return null;
	}
};
