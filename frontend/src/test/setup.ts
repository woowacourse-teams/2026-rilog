import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (typeof HTMLDialogElement !== 'undefined') {
	if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
		HTMLDialogElement.prototype.showModal = function showModal() {
			this.setAttribute('open', '');
		};
	}

	if (typeof HTMLDialogElement.prototype.close !== 'function') {
		HTMLDialogElement.prototype.close = function close() {
			this.removeAttribute('open');
			this.dispatchEvent(new Event('close'));
		};
	}
}

afterEach(() => {
	cleanup();
});
