/** Keep text selection at its last editor boundary while the pointer is outside. */
export const constrainEditorDragSelection = (editorElement: HTMLElement): (() => void) => {
	const ownerDocument = editorElement.ownerDocument;
	const ownerWindow = ownerDocument.defaultView;
	if (ownerWindow === null) {
		return () => undefined;
	}

	let isDraggingText = false;
	let pendingFrame: number | undefined;
	let lastInsidePoint: { x: number; y: number } | undefined;
	let outsidePoint: { x: number; y: number } | undefined;

	const cancelPendingFrame = () => {
		if (pendingFrame !== undefined) {
			ownerWindow.cancelAnimationFrame(pendingFrame);
			pendingFrame = undefined;
		}
	};

	const limitSelection = (clientX: number, clientY: number) => {
		cancelPendingFrame();
		const bounds = editorElement.getBoundingClientRect();
		if (clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom) {
			lastInsidePoint = { x: clientX, y: clientY };
			outsidePoint = undefined;
			return;
		}

		outsidePoint ??= {
			x:
				clientX < bounds.left
					? bounds.left + 1
					: clientX > bounds.right
						? bounds.right - 1
						: (lastInsidePoint?.x ?? clientX),
			y: lastInsidePoint?.y ?? Math.max(bounds.top + 1, Math.min(clientY, bounds.bottom - 1)),
		};
		const { x, y } = outsidePoint;
		pendingFrame = ownerWindow.requestAnimationFrame(() => {
			pendingFrame = undefined;
			const selection = ownerWindow.getSelection();
			const anchor = selection?.anchorNode;
			if (selection === null || anchor == null || !editorElement.contains(anchor)) {
				return;
			}

			const caretRange = ownerDocument.caretRangeFromPoint?.(x, y);
			const caretPosition =
				caretRange === null || caretRange === undefined ? ownerDocument.caretPositionFromPoint?.(x, y) : null;
			const focusNode = caretRange?.startContainer ?? caretPosition?.offsetNode;
			const focusOffset = caretRange?.startOffset ?? caretPosition?.offset;
			if (focusNode === undefined || focusOffset === undefined || !editorElement.contains(focusNode)) {
				return;
			}

			selection.setBaseAndExtent(anchor, selection.anchorOffset, focusNode, focusOffset);
		});
	};

	const onPointerDown = (event: PointerEvent) => {
		cancelPendingFrame();
		lastInsidePoint = { x: event.clientX, y: event.clientY };
		outsidePoint = undefined;
		const target = event.target;
		const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
		isDraggingText =
			event.isPrimary &&
			event.button === 0 &&
			element?.closest('.bn-inline-content') !== null &&
			element !== null &&
			editorElement.contains(element);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (isDraggingText && (event.buttons & 1) !== 0) {
			limitSelection(event.clientX, event.clientY);
		}
	};

	const onPointerUp = (event: PointerEvent) => {
		if (isDraggingText) {
			limitSelection(event.clientX, event.clientY);
		}
		isDraggingText = false;
	};
	const onPointerCancel = () => {
		isDraggingText = false;
		lastInsidePoint = undefined;
		outsidePoint = undefined;
		cancelPendingFrame();
	};

	editorElement.addEventListener('pointerdown', onPointerDown);
	ownerDocument.addEventListener('pointermove', onPointerMove);
	ownerDocument.addEventListener('pointerup', onPointerUp);
	ownerDocument.addEventListener('pointercancel', onPointerCancel);

	return () => {
		editorElement.removeEventListener('pointerdown', onPointerDown);
		ownerDocument.removeEventListener('pointermove', onPointerMove);
		ownerDocument.removeEventListener('pointerup', onPointerUp);
		ownerDocument.removeEventListener('pointercancel', onPointerCancel);
		cancelPendingFrame();
	};
};
