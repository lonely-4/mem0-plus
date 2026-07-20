'use strict';

/* global describe, it, expect */

// Offline unit tests: they mock `z.request`, so they run unconditionally in CI
// (unlike the live E2E suite in mem0.test.js, gated on MEM0_API_KEY). They cover
// what `zapier validate` can't: boolean coercion, URL join, metadata, array shapes.

const addMemory = require('../creates/add_memory');
const deleteMemory = require('../creates/delete_memory');
const searchMemories = require('../searches/search_memories');
const getMemories = require('../searches/get_memories');
const { includeApiKey } = require('../middleware');

// Minimal `z` stub: hands back queued responses and records every request.
const makeZ = (responses = []) => {
	const queue = [...responses];
	const requests = [];
	return {
		requests,
		request: async (opts) => {
			requests.push(opts);
			const next = queue.shift();
			return next !== undefined ? next : { data: {} };
		},
		errors: {
			Error: class Mem0Error extends Error {
				constructor(message, name, status) {
					super(message);
					this.name = name || 'Error';
					this.status = status;
				}
			},
		},
	};
};

describe('add_memory (offline)', () => {
	it('coerces infer="false" to a boolean and does not poll by default', async () => {
		const z = makeZ([{ data: { event_id: 'e1', status: 'PENDING' } }]);
		const res = await addMemory.operation.perform(z, {
			inputData: { content: 'hi', user_id: 'u1', infer: 'false' },
		});
		// waitForCompletion defaults off -> a single request (the add), no poll.
		expect(z.requests).toHaveLength(1);
		expect(z.requests[0].body.infer).toBe(false);
		expect(res.status).toBe('PENDING');
	});

	it('polls the event only when waitForCompletion="true"', async () => {
		const z = makeZ([
			{ data: { event_id: 'e1', status: 'PENDING' } },
			{ data: { status: 'SUCCEEDED', results: [{ id: 'm1' }] } },
		]);
		const res = await addMemory.operation.perform(z, {
			inputData: { content: 'hi', user_id: 'u1', waitForCompletion: 'true' },
		});
		expect(z.requests).toHaveLength(2);
		expect(z.requests[1].url).toBe('/v1/event/e1/');
		expect(res.status).toBe('SUCCEEDED');
	});

	it('throws a clear error on invalid JSON metadata', async () => {
		const z = makeZ();
		await expect(
			addMemory.operation.perform(z, {
				inputData: { content: 'hi', user_id: 'u1', metadata: '{not json' },
			}),
		).rejects.toThrow('Metadata must be valid JSON.');
	});
});

describe('search / get array-shape enforcement (offline)', () => {
	it('search unwraps an object {results:[...]} into an array', async () => {
		const z = makeZ([{ data: { results: [{ id: 'm1' }] } }]);
		const res = await searchMemories.operation.perform(z, {
			inputData: { query: 'x', user_id: 'u1' },
		});
		expect(Array.isArray(res)).toBe(true);
		expect(res).toHaveLength(1);
	});

	it('get_memories returns [] when the API returns neither array nor results', async () => {
		const z = makeZ([{ data: {} }]);
		const res = await getMemories.operation.perform(z, { inputData: { user_id: 'u1' } });
		expect(Array.isArray(res)).toBe(true);
		expect(res).toHaveLength(0);
	});

	it('get_memories forwards page and page_size as numbers', async () => {
		const z = makeZ([{ data: { results: [] } }]);
		await getMemories.operation.perform(z, {
			inputData: { user_id: 'u1', page: '2', limit: '10' },
		});
		expect(z.requests[0].params).toEqual({ page: 2, page_size: 10 });
	});
});

describe('delete_memory (offline)', () => {
	it('encodes the memory id in the URL path', async () => {
		const z = makeZ([{ data: {} }]);
		await deleteMemory.operation.perform(z, { inputData: { memory_id: 'a/b c' } });
		expect(z.requests[0].url).toBe('/v1/memories/a%2Fb%20c/');
	});
});

describe('includeApiKey middleware (offline)', () => {
	it('prepends the base URL and injects the auth header', () => {
		const req = includeApiKey(
			{ url: '/v3/memories/' },
			null,
			{ authData: { apiKey: 'k', baseUrl: 'https://api.mem0.ai/' } },
		);
		expect(req.url).toBe('https://api.mem0.ai/v3/memories/');
		expect(req.headers.Authorization).toBe('Token k');
	});

	it('leaves absolute URLs untouched', () => {
		const req = includeApiKey({ url: 'https://other.example/x' }, null, {
			authData: { apiKey: 'k' },
		});
		expect(req.url).toBe('https://other.example/x');
	});
});
