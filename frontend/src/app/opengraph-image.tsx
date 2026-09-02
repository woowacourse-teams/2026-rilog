/* eslint-disable check-file/filename-naming-convention, import/no-named-export */

import { ImageResponse } from 'next/og';

import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export const alt = 'Rilog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				alignItems: 'center',
				background: '#f7f9fd',
				color: '#060e47',
				display: 'flex',
				height: '100%',
				justifyContent: 'center',
				width: '100%',
			}}
		>
			<div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 36 }}>
				<img alt="" height={236} src={toAbsoluteSiteUrl('/brand/logo.svg')} width={593} />
				<div style={{ color: '#61759e', fontSize: 34 }}>기록을 작성하고 함께 나누는 공간</div>
			</div>
		</div>,
		size,
	);
}
