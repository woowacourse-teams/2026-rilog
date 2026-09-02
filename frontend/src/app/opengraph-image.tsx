/* eslint-disable check-file/filename-naming-convention, import/no-named-export */

import { ImageResponse } from 'next/og';

export const alt = 'Rilog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				alignItems: 'center',
				background: '#0b1d48',
				color: 'white',
				display: 'flex',
				height: '100%',
				justifyContent: 'center',
				width: '100%',
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
				<div style={{ fontSize: 96, fontWeight: 800 }}>Rilog.</div>
				<div style={{ color: '#dbe5f5', fontSize: 34 }}>기록을 작성하고 함께 나누는 공간</div>
			</div>
		</div>,
		size,
	);
}
