import { useId } from 'react';

import type { ReactNode } from 'react';

interface FieldRenderProps {
	id: string;
	describedBy?: string;
}

interface FieldProps {
	label: ReactNode;
	description?: ReactNode;
	controlId?: string;
	children: (controlProps: FieldRenderProps) => ReactNode;
}

export default function Field({ label, description, controlId: providedControlId, children }: FieldProps) {
	const generatedId = useId();
	const controlId = providedControlId ?? generatedId;
	const descriptionId = `${controlId}-field-description`;
	const describedBy = description ? descriptionId : undefined;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-1">
				<label htmlFor={controlId} className="text-body-2 font-semibold text-text-primary">
					{label}
				</label>
				{description && (
					<div id={descriptionId} className="text-label-2 text-text-secondary">
						{description}
					</div>
				)}
			</div>
			{children({ id: controlId, describedBy })}
		</div>
	);
}
