export const getServiceUrlLabel = (serviceUrl: string) => {
	try {
		return new URL(serviceUrl).host;
	} catch {
		return serviceUrl;
	}
};
