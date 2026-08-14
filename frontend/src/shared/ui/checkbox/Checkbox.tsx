import type { ComponentPropsWithRef } from 'react';

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;

export default function Checkbox({ className, ref, ...inputProps }: CheckboxProps) {
	return (
		<span className="relative flex size-5 shrink-0">
			<input
				{...inputProps}
				ref={ref}
				type="checkbox"
				className={`peer size-5 cursor-pointer appearance-none rounded border border-border-strong bg-white transition-colors checked:border-brand-primary checked:bg-brand-primary focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-surface-active ${className ?? ''}`.trim()}
			/>
			<svg
				aria-hidden="true"
				viewBox="0 0 20 20"
				className="pointer-events-none absolute inset-0 size-5 text-white opacity-0 peer-checked:opacity-100"
			>
				<path d="m5 10 3.25 3.25L15 6.75" fill="none" stroke="currentColor" strokeWidth="2" />
			</svg>
		</span>
	);
}
