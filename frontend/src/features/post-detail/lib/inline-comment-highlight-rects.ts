interface InlineCommentHighlightRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

const GEOMETRY_TOLERANCE_PX = 1;

const getVerticalOverlap = (first: InlineCommentHighlightRect, second: InlineCommentHighlightRect): number =>
	Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));

const isSameLine = (first: InlineCommentHighlightRect, second: InlineCommentHighlightRect): boolean =>
	getVerticalOverlap(first, second) >= Math.min(first.height, second.height) / 2;

const selectLineReferenceRect = (lineRects: readonly InlineCommentHighlightRect[]): InlineCommentHighlightRect => {
	const geometryGroups: Array<{ rect: InlineCommentHighlightRect; count: number; totalWidth: number }> = [];

	lineRects.forEach((rect) => {
		const group = geometryGroups.find(
			(candidate) =>
				Math.abs(candidate.rect.top - rect.top) <= GEOMETRY_TOLERANCE_PX &&
				Math.abs(candidate.rect.height - rect.height) <= GEOMETRY_TOLERANCE_PX,
		);

		if (group === undefined) {
			geometryGroups.push({ rect, count: 1, totalWidth: rect.width });
			return;
		}

		group.count += 1;
		group.totalWidth += rect.width;
	});

	return geometryGroups.reduce((best, group) => {
		if (group.count !== best.count) {
			return group.count > best.count ? group : best;
		}

		return group.totalWidth > best.totalWidth ? group : best;
	}).rect;
};

export const normalizeInlineCommentHighlightRects = (
	anchorRects: readonly InlineCommentHighlightRect[],
	rootRects: readonly InlineCommentHighlightRect[],
): InlineCommentHighlightRect[] => {
	const rootLines: InlineCommentHighlightRect[][] = [];

	rootRects.forEach((rect) => {
		const line = rootLines.find((candidate) => candidate.some((lineRect) => isSameLine(lineRect, rect)));
		if (line === undefined) {
			rootLines.push([rect]);
			return;
		}

		line.push(rect);
	});

	const lineReferences = rootLines.map(selectLineReferenceRect);
	const normalizedRects = anchorRects
		.map((rect) => {
			const lineReference = lineReferences.reduce<InlineCommentHighlightRect | null>((best, candidate) => {
				if (!isSameLine(candidate, rect)) {
					return best;
				}

				return best === null || getVerticalOverlap(candidate, rect) > getVerticalOverlap(best, rect) ? candidate : best;
			}, null);

			if (lineReference === null) {
				return {
					left: rect.left,
					top: rect.top,
					right: rect.right,
					bottom: rect.bottom,
					width: rect.width,
					height: rect.height,
				};
			}

			return {
				left: rect.left,
				top: lineReference.top,
				right: rect.right,
				bottom: lineReference.bottom,
				width: rect.width,
				height: lineReference.height,
			};
		})
		.sort((first, second) => first.top - second.top || first.left - second.left);

	return normalizedRects.reduce<InlineCommentHighlightRect[]>((merged, rect) => {
		const previous = merged.at(-1);
		if (
			previous === undefined ||
			Math.abs(previous.top - rect.top) > GEOMETRY_TOLERANCE_PX ||
			rect.left > previous.right + GEOMETRY_TOLERANCE_PX
		) {
			merged.push(rect);
			return merged;
		}

		const right = Math.max(previous.right, rect.right);
		merged[merged.length - 1] = {
			left: previous.left,
			top: previous.top,
			right,
			bottom: previous.bottom,
			width: right - previous.left,
			height: previous.height,
		};
		return merged;
	}, []);
};
