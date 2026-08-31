import { useId } from 'react';

import type { ReactNode } from 'react';

interface FieldRenderProps {
	id: string;
	describedBy?: string;
}

interface FieldProps {
	label?: ReactNode;
	labelAction?: ReactNode;
	description?: ReactNode;
	controlId?: string;
	required?: boolean;
	children: (controlProps: FieldRenderProps) => ReactNode;
}

export default function Field({
	label,
	labelAction,
	description,
	controlId: providedControlId,
	required = false,
	children,
}: FieldProps) {
	const generatedId = useId();
	const controlId = providedControlId ?? generatedId;
	const descriptionId = `${controlId}-field-description`;
	const describedBy = description ? descriptionId : undefined;

	return (
		<div className="flex w-full flex-col gap-3">
			{label && (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-3">
						<label htmlFor={controlId} className="text-body-2 font-semibold text-text-primary">
							{label}
							{required ? (
								<span aria-hidden="true" className="ml-0.5 text-danger">
									*
								</span>
							) : null}
						</label>
						{labelAction}
					</div>
					{description && (
						<div id={descriptionId} className="text-label-2 text-text-secondary">
							{description}
						</div>
					)}
				</div>
			)}
			{children({ id: controlId, describedBy })}
		</div>
	);
}
