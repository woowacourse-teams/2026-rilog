declare module '*.svg' {
	import type { ComponentType, SVGProps } from 'react';

	const svgComponent: ComponentType<SVGProps<SVGSVGElement>>;

	export default svgComponent;
}
