const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info(`Ready! Logged in as ${client.user.tag}`);

		// Liste des statuts à alterner
		const statuses = [
			{ name: 'Trie les channels...', type: ActivityType.Custom },
			{ name: 'Trie les rôles...', type: ActivityType.Custom },
		];

		let currentIndex = 0;

		// Fonction pour mettre à jour le status
		const updateStatus = () => {
			const status = statuses[currentIndex];
			client.user.setActivity(status.name, { type: status.type });
			currentIndex = (currentIndex + 1) % statuses.length;
		};

		// Définir le premier status immédiatement
		updateStatus();

		// Alterner le status toutes les 30 secondes
		setInterval(updateStatus, 30000);
	},
};
