interface ImageResetOverlayProps {
	imageLabel: string;
	onReset: () => void;
	disabled?: boolean;
}

export default function ImageResetOverlay({ imageLabel, onReset, disabled = false }: ImageResetOverlayProps) {
	return (
		<>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-10 bg-black/0 transition-colors duration-200 group-focus-within:bg-black/25 group-hover:bg-black/25"
			/>
			<button
				type="button"
				aria-label={`${imageLabel} 기본 이미지로 되돌리기`}
				disabled={disabled}
				onClick={onReset}
				className="absolute top-1/2 left-1/2 z-20 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-100 transition-[opacity,background-color,scale] duration-200 hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-0 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
			>
				<span aria-hidden="true" className="text-heading-3 leading-none font-light">
					×
				</span>
			</button>
		</>
	);
}
