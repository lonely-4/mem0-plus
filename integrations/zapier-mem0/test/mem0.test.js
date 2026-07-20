'use strict';

/* global describe, it, expect, beforeAll */

const zapier = require('zapier-platform-core');
const App = require('../index');

const appTester = zapier.createAppTester(App);

const authData = {
	apiKey: process.env.MEM0_API_KEY,
	baseUrl: process.env.MEM0_BASE_URL || 'https://api.mem0.ai',
};

const userId = `zapier-e2e-${Date.now()}`;

// Retry an async op until `done` is satisfied or attempts run out. Extraction is
// async, so the default Add returns before the memory is searchable.
const until = async (fn, done, { attempts = 30, delayMs = 2000 } = {}) => {
	let last;
	for (let i = 0; i < attempts; i++) {
		last = await fn();
		if (done(last)) return last;
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}
	return last;
};

// The E2E suite hits the live Mem0 API, so it only runs when MEM0_API_KEY is
// set (locally / with a secret). In CI without a key it is skipped, not failed.
const describeE2E = authData.apiKey ? describe : describe.skip;

describeE2E('Mem0 Zapier integration (E2E)', () => {

	it('authentication.test succeeds', async () => {
		const res = await appTester(App.authentication.test, { authData });
		expect(res.status).toBe(200);
	});

	it('adds, searches, lists, and deletes a memory', async () => {
		// Add via the default path: returns immediately with an event id.
		const added = await appTester(App.creates.add_memory.operation.perform, {
			authData,
			inputData: {
				content: 'I love hiking in the Alps and my favorite food is sushi',
				user_id: userId,
			},
		});
		expect(added.event_id).toBeDefined();

		// Extraction is async; retry search until the memory is indexed.
		const found = await until(
			() =>
				appTester(App.searches.search_memories.operation.perform, {
					authData,
					inputData: { query: 'outdoor activities', user_id: userId, limit: 5 },
				}),
			(r) => Array.isArray(r) && r.length > 0,
		);
		expect(Array.isArray(found)).toBe(true);
		expect(found.length).toBeGreaterThan(0);

		// Get all
		const all = await appTester(App.searches.get_memories.operation.perform, {
			authData,
			inputData: { user_id: userId },
		});
		expect(Array.isArray(all)).toBe(true);
		expect(all.length).toBeGreaterThan(0);

		// Cleanup: delete every memory we created
		for (const mem of all) {
			await appTester(App.creates.delete_memory.operation.perform, {
				authData,
				inputData: { memory_id: mem.id },
			});
		}

		const afterDelete = await appTester(App.searches.get_memories.operation.perform, {
			authData,
			inputData: { user_id: userId },
		});
		expect(afterDelete.length).toBe(0);
	});

	it('surfaces API errors instead of returning an empty array (search needs a filter)', async () => {
		// filters is required by the API; omitting it must throw, not return [].
		await expect(
			appTester(App.searches.search_memories.operation.perform, {
				authData,
				inputData: { query: 'anything' },
			}),
		).rejects.toThrow();
	});
});
