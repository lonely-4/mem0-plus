'use strict';

// Prepend the configured base URL and inject the auth header on every request.
const includeApiKey = (request, z, bundle) => {
	if (bundle.authData && bundle.authData.apiKey) {
		request.headers = request.headers || {};
		request.headers.Authorization = `Token ${bundle.authData.apiKey}`;
	}
	// Resolve relative URLs against the configured base URL.
	if (request.url && request.url.startsWith('/')) {
		const base = (bundle.authData && bundle.authData.baseUrl) || 'https://api.mem0.ai';
		request.url = `${base.replace(/\/$/, '')}${request.url}`;
	}
	return request;
};

// Surface auth failures as Zapier auth errors so users are prompted to reconnect.
const handleBadResponses = (response, z, _bundle) => {
	if (response.status === 401 || response.status === 403) {
		throw new z.errors.Error(
			'The Mem0 API key you supplied is invalid or lacks access.',
			'AuthenticationError',
			response.status,
		);
	}
	return response;
};

module.exports = { includeApiKey, handleBadResponses };
