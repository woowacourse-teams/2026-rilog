import type { ComponentPropsWithRef } from 'react';

export default function Divider({ className, ...dividerProps }: ComponentPropsWithRef<'hr'>) {
	return (
		<hr {...dividerProps} className={`w-full border-0 border-t border-border-default ${className ?? ''}`.trim()} />
	);
}
