// TODO: 추후 목적에 맞는 svg 아이콘으로 변경 필요
export default function SidebarNavigationIcon() {
	return (
		<span aria-hidden="true" className="flex w-4 shrink-0 flex-col gap-1">
			<span className="h-0.5 w-full rounded-full bg-current" />
			<span className="h-0.5 w-full rounded-full bg-current" />
			<span className="h-0.5 w-3/4 rounded-full bg-current" />
		</span>
	);
}
