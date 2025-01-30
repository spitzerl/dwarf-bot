const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const channelsDataPath = path.join(dataDir, 'channels.json');

// Create file and folder if they don't exist
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir);
}
if (!fs.existsSync(channelsDataPath)) {
	fs.writeFileSync(channelsDataPath, '{}');
}

function getChannelsData() {
	try {
		const data = fs.readFileSync(channelsDataPath, 'utf8');
		return JSON.parse(data);
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			return {};
		}
		else {
			throw error;
		}
	}
}

function setChannelsData(data) {
	fs.writeFileSync(channelsDataPath, JSON.stringify(data, null, 2));
}

module.exports = {
	getChannelsData,
	setChannelsData,
};
