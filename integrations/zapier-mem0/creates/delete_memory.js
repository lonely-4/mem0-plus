'use strict';

const perform = async (z, bundle) => {
	// Trailing slash required (Django APPEND_SLASH).
	const response = await z.request({
		url: `/v1/memories/${bundle.inputData.memory_id}/`,
		method: 'DELETE',
	});
	return response.data || { message: 'Deleted', memory_id: bundle.inputData.memory_id };
};

module.exports = {
	key: 'delete_memory',
	noun: 'Memory',
	display: {
		label: 'Delete Memory',
		description: 'Delete a single memory by its ID.',
	},
	operation: {
		perform,
		inputFields: [
			{ key: 'memory_id', label: 'Memory ID', type: 'string', required: true },
		],
		sample: { message: 'Memory deleted successfully' },
	},
};
