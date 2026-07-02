'use strict';

const authentication = require('./authentication');
const { includeApiKey, handleBadResponses } = require('./middleware');

const addMemory = require('./creates/add_memory');
const deleteMemory = require('./creates/delete_memory');
const searchMemories = require('./searches/search_memories');
const getMemories = require('./searches/get_memories');

const { version } = require('./package.json');
const platformVersion = require('zapier-platform-core').version;

module.exports = {
	version,
	platformVersion,

	authentication,

	beforeRequest: [includeApiKey],
	afterResponse: [handleBadResponses],

	creates: {
		[addMemory.key]: addMemory,
		[deleteMemory.key]: deleteMemory,
	},

	searches: {
		[searchMemories.key]: searchMemories,
		[getMemories.key]: getMemories,
	},

	resources: {},
	triggers: {},
};
