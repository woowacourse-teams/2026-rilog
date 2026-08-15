import type { TextareaHTMLAttributes } from 'react';

export const getTextLength = (value: TextareaHTMLAttributes<HTMLTextAreaElement>['value']) => {
	return value === undefined || value === null ? 0 : String(value).length;
};
