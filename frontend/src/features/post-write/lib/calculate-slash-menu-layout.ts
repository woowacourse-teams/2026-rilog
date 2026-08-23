export const SLASH_MENU_EDGE_PADDING = 16;
export const SLASH_MENU_GAP = 10;
export const SLASH_MENU_EARLY_FLIP_PADDING = 24;
export const SLASH_MENU_INITIAL_HEIGHT = 320;

export interface SlashMenuRect {
	bottom: number;
	height: number;
	left: number;
	right: number;
	top: number;
	width: number;
}

interface CalculateSlashMenuLayoutOptions {
	boundary: SlashMenuRect;
	menuHeight: number;
	reference: Pick<SlashMenuRect, 'bottom' | 'top'>;
}

export interface SlashMenuLayout {
	maxHeight: number;
	maxWidth: number;
	placement: 'bottom-start' | 'top-start';
}

export const calculateSlashMenuLayout = ({
	boundary,
	menuHeight,
	reference,
}: CalculateSlashMenuLayoutOptions): SlashMenuLayout => {
	const availableAbove = Math.max(0, reference.top - boundary.top - SLASH_MENU_GAP - SLASH_MENU_EDGE_PADDING);
	const availableBelow = Math.max(0, boundary.bottom - reference.bottom - SLASH_MENU_GAP - SLASH_MENU_EDGE_PADDING);
	const preferredHeight = Math.min(
		menuHeight || SLASH_MENU_INITIAL_HEIGHT,
		boundary.height - SLASH_MENU_EDGE_PADDING * 2,
	);
	const shouldPlaceAbove =
		availableBelow < preferredHeight + SLASH_MENU_EARLY_FLIP_PADDING && availableAbove > availableBelow;
	const availableHeight = shouldPlaceAbove ? availableAbove : availableBelow;

	return {
		placement: shouldPlaceAbove ? 'top-start' : 'bottom-start',
		maxHeight: availableHeight,
		maxWidth: Math.max(0, boundary.width - SLASH_MENU_EDGE_PADDING * 2),
	};
};

export const clampSlashMenuCoordinate = (coordinate: number, minimum: number, maximum: number): number => {
	return Math.min(Math.max(coordinate, minimum), Math.max(minimum, maximum));
};
