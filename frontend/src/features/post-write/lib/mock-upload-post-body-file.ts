import type { UploadPostBodyFile } from '../model/post-editor';

export const mockUploadPostBodyFile: UploadPostBodyFile = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
				return;
			}

			reject(new Error('파일을 읽지 못했습니다.'));
		});
		reader.addEventListener('error', () => reject(reader.error ?? new Error('파일을 읽지 못했습니다.')));
		reader.readAsDataURL(file);
	});
