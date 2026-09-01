export const BASE_MODAL_CLASS_NAME =
	'border-0 bg-surface p-0 text-text-primary backdrop:bg-modal-backdrop backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-(--modal-exit-duration) data-[state=open]:backdrop:opacity-100 data-[state=open]:backdrop:duration-(--modal-enter-duration)';

export const CENTERED_MODAL_CLASS_NAME =
	'm-auto max-h-modal-max-height scale-(--modal-closed-scale) overflow-hidden rounded-modal opacity-0 shadow-modal transition-[opacity,scale,overlay,display] duration-(--modal-exit-duration) ease-out [transition-behavior:allow-discrete] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:duration-(--modal-enter-duration) md:max-h-modal-max-height-md';

export const BOTTOM_SHEET_CLASS_NAME =
	'mx-auto mt-auto mb-0 max-h-[80dvh] w-full max-w-modal-md translate-y-full overflow-hidden rounded-t-modal shadow-modal transition-[transform,overlay,display] duration-(--modal-exit-duration) ease-out [transition-behavior:allow-discrete] data-[state=open]:translate-y-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none';

export const COMPACT_MODAL_CLASS_NAME = `${CENTERED_MODAL_CLASS_NAME} w-modal-viewport max-w-modal-sm md:w-modal-viewport-md`;

export const COMPACT_MODAL_CONTENT_CLASS_NAME = 'flex max-h-[inherit] min-h-0 flex-col overflow-hidden p-6 md:p-8';
