const fs = require("fs");
const path = require("path");

const channelsDataPath = path.join(__dirname, "../data/channels.json");

function getChannelsData() {
	try {
		const data = fs.readFileSync(channelsDataPath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		if (error.code === "ENOENT") {
			return {};
		} else {
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
