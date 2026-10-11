export const appendSearchParams = (path: string, searchParams: Record<string, string | string[] | undefined>) => {
	const hashIndex = path.indexOf('#');
	const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
	const pathWithoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
	const queryIndex = pathWithoutHash.indexOf('?');
	const pathname = queryIndex === -1 ? pathWithoutHash : pathWithoutHash.slice(0, queryIndex);
	const query = new URLSearchParams(queryIndex === -1 ? '' : pathWithoutHash.slice(queryIndex + 1));

	Object.entries(searchParams).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			query.delete(key);
			value.forEach((item) => query.append(key, item));
		} else if (value !== undefined) {
			query.set(key, value);
		}
	});

	const queryString = query.toString();
	return `${pathname}${queryString.length > 0 ? `?${queryString}` : ''}${hash}`;
};
