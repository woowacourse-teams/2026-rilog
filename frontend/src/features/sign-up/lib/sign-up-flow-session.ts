const SIGN_UP_FLOW_SESSION_KEY = 'rilog:sign-up-flow';
const SIGN_UP_FLOW_SESSION_VALUE = 'pending';
const signUpFlowListeners = new Set<() => void>();

export type SignUpFlowStatus = 'checking' | 'allowed' | 'denied';

let signUpFlowStatus: SignUpFlowStatus = 'checking';

const notifySignUpFlowListeners = () => {
	signUpFlowListeners.forEach((listener) => listener());
};

const setSignUpFlowStatus = (status: SignUpFlowStatus) => {
	if (signUpFlowStatus === status) {
		return;
	}

	signUpFlowStatus = status;
	notifySignUpFlowListeners();
};

export const startSignUpFlow = () => {
	sessionStorage.setItem(SIGN_UP_FLOW_SESSION_KEY, SIGN_UP_FLOW_SESSION_VALUE);
	setSignUpFlowStatus('allowed');
};

export const hasActiveSignUpFlow = () =>
	sessionStorage.getItem(SIGN_UP_FLOW_SESSION_KEY) === SIGN_UP_FLOW_SESSION_VALUE;

export const clearSignUpFlow = () => {
	sessionStorage.removeItem(SIGN_UP_FLOW_SESSION_KEY);
	setSignUpFlowStatus('denied');
};

export const initializeSignUpFlowStatus = () => {
	setSignUpFlowStatus(hasActiveSignUpFlow() ? 'allowed' : 'denied');
};

export const getSignUpFlowStatus = (): SignUpFlowStatus => signUpFlowStatus;

export const getServerSignUpFlowStatus = (): SignUpFlowStatus => 'checking';

export const subscribeSignUpFlow = (listener: () => void) => {
	signUpFlowListeners.add(listener);

	return () => {
		signUpFlowListeners.delete(listener);
	};
};
