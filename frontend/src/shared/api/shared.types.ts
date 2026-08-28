export interface ApiResponse<TData> {
	status: number;
	message: string;
	data?: TData;
}

export interface InvalidParam {
	name: string | null;
	reason: string;
}

export interface ErrorDetail {
	status: number;
	error: string;
	errorCode: string;
	message: string;
	invalidParams: InvalidParam[] | null;
}
