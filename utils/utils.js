const fs = require('fs');
const path = require('path');
const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { toKebabCase } = require('./stringFormatter');

const dataDir = path.join(__dirname, '../data');
const channelsDataPath = path.join(dataDir, 'channels.json');
const guildsDataPath = path.join(dataDir, 'guilds.json');

// Crée le dossier et le fichier s'ils n'existent pas déjà
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir);
}
if (!fs.existsSync(channelsDataPath)) {
	fs.writeFileSync(channelsDataPath, '{}');
}
if (!fs.existsSync(guildsDataPath)) {
	fs.writeFileSync(guildsDataPath, '{}');
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

function getGuildsData() {
	try {
		const data = fs.readFileSync(guildsDataPath, 'utf8');
		return JSON.parse(data);
	}
	catch (error) {
		return {};
	}
}

function setGuildsData(data) {
	fs.writeFileSync(guildsDataPath, JSON.stringify(data, null, 2));
}

/**
 * Trouve le premier channel de type role_selection dans les données
 * @param {Object} data - Les données des channels (optionnel, sinon utilise getChannelsData)
 * @returns {Object|null} - L'objet channel ou null si aucun trouvé
 */
function findRoleSelectionChannel(data = null) {
	const channelsData = data || getChannelsData();

	// Parcourir toutes les entrées pour trouver un channel de type role_selection
	for (const entry of Object.values(channelsData)) {
		if (entry.type === 'role_selection' || (entry.selectChannel === true)) {
			return entry;
		}
	}

	return null;
}

/**
 * Met à jour le menu de sélection de rôles dans le channel dédié
 * @param {Discord.Guild} guild - L'objet Guild Discord
 * @returns {Promise<boolean>} - true si mise à jour réussie, false sinon
 */
async function updateRoleSelectionChannel(guild) {
	try {
		// Récupérer les données et le channel de sélection
		const channelsData = getChannelsData();
		const roleSelectionChannelData = findRoleSelectionChannel(channelsData);

		if (!roleSelectionChannelData) {
			console.log('Aucun channel de sélection de rôles trouvé.');
			return false;
		}

		// Récupérer le channel Discord
		const roleSelectionChannel = await guild.channels.fetch(roleSelectionChannelData.idChannel).catch(() => null);

		if (!roleSelectionChannel) {
			console.log('Le channel de sélection référencé dans les données n\'existe plus.');
			return false;
		}

		// Récupérer les messages récents
		const messages = await roleSelectionChannel.messages.fetch({ limit: 10 });

		// Chercher le message contenant le menu de sélection
		let menuMessage = null;
		for (const message of messages.values()) {
			// Vérifier si le message a des composants et si l'un d'eux est notre menu
			if (message.components && message.components.length > 0) {
				for (const row of message.components) {
					for (const component of row.components) {
						if (component.customId === 'select_game_roles') {
							menuMessage = message;
							break;
						}
					}
					if (menuMessage) break;
				}
			}
			if (menuMessage) break;
		}

		// Importer la fonction nécessaire pour générer les options
		const { generateRoleOptions, createRoleSelectionMenu } = require('../commands/management/role_channel');

		if (menuMessage) {
			// Le message avec le menu existe, mettons-le à jour
			try {
				// Générer les nouvelles options
				const options = await generateRoleOptions(channelsData);

				// Créer un nouveau menu avec ces options
				const newRow = await createRoleSelectionMenu(options);

				// Mettre à jour le message existant
				await menuMessage.edit({
					content: 'Liste des jeux disponibles :',
					components: [newRow],
				});

				console.log(`Le menu de sélection dans ${roleSelectionChannel.name} a été mis à jour avec succès.`);
				return true;
			}
			catch (updateError) {
				console.error('Erreur lors de la mise à jour du menu:', updateError);
				// Si la mise à jour échoue, on va recréer complètement le menu
			}
		}

		// Si on n'a pas trouvé de message avec le menu ou si la mise à jour a échoué,
		// on recrée complètement le menu
		console.log('Menu non trouvé ou mise à jour impossible, création d\'un nouveau menu...');

		// Supprimer tous les messages
		for (const message of messages.values()) {
			await message.delete().catch(error => {
				console.error(`Erreur lors de la suppression d'un message: ${error}`);
			});
		}

		// Importer la fonction pour publier un nouveau menu complet
		const { publishSelectionMenu } = require('../commands/management/role_channel');

		// Publier le nouveau menu de sélection
		await publishSelectionMenu(roleSelectionChannel, channelsData);

		console.log(`Un nouveau menu de sélection dans ${roleSelectionChannel.name} a été créé.`);
		return true;
	}
	catch (error) {
		console.error('Erreur lors de la mise à jour du channel de sélection:', error);
		return false;
	}
}

/**
 * Génère les options pour le menu de sélection de rôles
 * @param {Object} channelsData - Les données des channels
 * @returns {Array<Object>} - Les options pour le menu de sélection
 */
function generateRoleOptions(channelsData) {
	const options = [];
	for (const entry of Object.values(channelsData)) {
		if (entry.selectChannel === true || entry.type === 'role_selection') continue;

		const label = entry.name || entry.nameSimplified || 'Inconnu';
		const opt = {
			label: label.slice(0, 25),
			value: (entry.nameSimplified || label).slice(0, 100),
		};

		if (entry.emoji) {
			opt.emoji = entry.emoji;
		}
		else {
			const match = /^(.+)・(.+)$/.exec(label);
			if (match && match[1].length <= 3) {
				opt.emoji = match[1];
			}
		}
		options.push(opt);
	}
	return options;
}

/**
 * Crée un composant de menu de sélection pour les rôles
 * @param {Array<Object>} options - Les options pour le menu
 * @returns {ActionRowBuilder} - Le composant de menu prêt à être utilisé
 */
function createRoleSelectionMenu(options) {
	const validOptions = options.length > 0 ? options : [{
		label: 'Aucun jeu disponible',
		value: 'no-games',
	}];
	const limitedOptions = validOptions.slice(0, 25);
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('select_game_roles')
		.setPlaceholder('Choisissez un ou plusieurs jeux')
		.setMinValues(1)
		.setMaxValues(limitedOptions.length)
		.addOptions(limitedOptions);

	return new ActionRowBuilder().addComponents(selectMenu);
}

/**
 * @param {Discord.TextChannel} channel - Le channel où publier le menu
 * @param {Object} channelsData - Les données des channels
 * @returns {Promise<void>}
 */
async function publishSelectionMenu(channel, channelsData) {
	const options = generateRoleOptions(channelsData);
	const embed = new EmbedBuilder()
		.setTitle('Sélection des rôles de jeux')
		.setDescription(
			'Choisissez dans la liste ci-dessous les jeux auxquels vous souhaitez être associé.\n\n' +
			'Validez pour appliquer. Pour retirer un rôle, rouvrez le menu et désélectionnez-le.',
		)
		.setColor(0x00ff00);

	await channel.send({ embeds: [embed] });

	if (options.length === 0) {
		await channel.send('Aucun jeu n\'a été trouvé dans la configuration. Veuillez ajouter des jeux via la commande /create.');
	}

	try {
		const row = createRoleSelectionMenu(options);
		await channel.send({ content: 'Liste des jeux disponibles :', components: [row] });
	}
	catch (menuError) {
		const logger = require('./logger');
		logger.error('Erreur lors de la création du menu de sélection:', menuError);
		await channel.send('Erreur lors de la création du menu de sélection. Contactez un administrateur.');
	}
}

module.exports = {
	getChannelsData,
	setChannelsData,
	getGuildsData,
	setGuildsData,
	findRoleSelectionChannel,
	updateRoleSelectionChannel,
	generateRoleOptions,
	createRoleSelectionMenu,
	publishSelectionMenu,
};
