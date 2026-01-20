const {
	SlashCommandBuilder,
	PermissionsBitField,
	ChannelType,
	ActionRowBuilder,
	StringSelectMenuBuilder,
} = require('discord.js');
const {
	getChannelsData,
	setChannelsData,
	generateRoleOptions,
	createRoleSelectionMenu,
	publishSelectionMenu,
	getGuildsData,
	setGuildsData
} = require('../../utils/utils');
const { toKebabCase } = require('../../utils/stringFormatter');
const logger = require('../../utils/logger');
const { logAction } = require('../../utils/discordLogger');
const { sanitizeString, isValidDiscordName } = require('../../utils/validator');

module.exports = {
	category: 'management',
	data: new SlashCommandBuilder()
		.setName('role_channel')
		.setDescription('Gestion des channels de sélection de rôles de jeux')
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Crée un channel et y publie une liste déroulante pour choisir les rôles de jeux')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Nom du channel à créer')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Supprime un channel de sélection de rôles')
				.addChannelOption(option =>
					option
						.setName('channel')
						.setDescription('Le channel à supprimer (optionnel, utilisera le channel de rôle existant si non spécifié)')
						.setRequired(false)
						.addChannelTypes(ChannelType.GuildText),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Force la mise à jour de la liste des jeux dans le channel de sélection de rôles'),
		),

	async execute(interaction) {

		const subcommand = interaction.options.getSubcommand();
		const guild = interaction.guild;
		const channelsData = getChannelsData();

		// COMMANDE CREATE - Création d'un nouveau channel de sélection
		if (subcommand === 'create') {
			const rawName = interaction.options.getString('name');

			if (!isValidDiscordName(rawName)) {
				return interaction.reply({ content: 'Nom de channel invalide.', ephemeral: true });
			}

			const name = sanitizeString(rawName);

			// Vérifier si un channel avec le même nom simplifié existe déjà
			const nameSimplified = toKebabCase(name);
			for (const c of Object.values(channelsData)) {
				if (c.nameSimplified === nameSimplified) {
					return interaction.reply({
						content: 'Un channel avec ce nom existe déjà (référencé dans channels.json).',
						ephemeral: true,
					});
				}
			}

			// Vérifier si le salon existe déjà sur le serveur
			const existing = guild.channels.cache.find((ch) => ch.name === name || ch.name === `#${name}` || ch.name === name);
			if (existing) {
				return interaction.reply({
					content: 'Un channel portant ce nom existe déjà sur le serveur.',
					ephemeral: true,
				});
			}

			try {
				// Création du channel textuel
				const channel = await guild.channels.create({
					name: name,
					type: ChannelType.GuildText,
				});

				// Publier le menu de sélection
				await publishSelectionMenu(channel, channelsData);

				// Ajouter au channels.json avec le type 'role_selection'
				const data = {
					name: name,
					nameSimplified: nameSimplified,
					idChannel: channel.id,
					idRole: null,
					selectChannel: true,
					type: 'role_selection', // Type spécifique pour les channels de sélection de rôles
					emoji: '📋', // Emoji par défaut pour les channels de sélection
					guildId: guild.id, // Ajout du guildId
				};

				// Enregistrer également dans guilds.json
				const guildsData = getGuildsData();
				if (!guildsData[guild.id]) guildsData[guild.id] = {};
				guildsData[guild.id].roleSelectionChannelId = channel.id;
				setGuildsData(guildsData);

				channelsData[channel.id] = data;
				setChannelsData(channelsData);

				return interaction.reply({ content: `Channel créé : <#${channel.id}> et menu posté.` });
			}
			catch (error) {
				logger.error('Erreur lors de la création du channel de sélection:', error);
				return interaction.reply({
					content: 'Erreur lors de la création du channel.',
					ephemeral: true,
				});
			}
		}
		// COMMANDE DELETE - Suppression d'un channel de sélection
		else if (subcommand === 'delete') {
			let channel = interaction.options.getChannel('channel');
			let channelData = null;

			// Si aucun channel n'est spécifié, chercher le channel de type role_selection
			if (!channel) {
				// Trouver le channel de type role_selection pour CETTE guilde
				const roleSelectionChannel = Object.values(channelsData).find(
					entry => (entry.type === 'role_selection' || entry.selectChannel === true) && entry.guildId === guild.id,
				);

				if (!roleSelectionChannel) {
					return interaction.reply({
						content: 'Aucun channel de sélection de rôles trouvé. Veuillez spécifier un channel existant.',
						ephemeral: true,
					});
				}

				// Récupérer le channel Discord à partir de son ID
				channel = await interaction.guild.channels.fetch(roleSelectionChannel.idChannel).catch(() => null);
				if (!channel) {
					// Si le channel n'existe plus sur le serveur, on supprime quand même l'entrée du JSON
					delete channelsData[roleSelectionChannel.idChannel];
					setChannelsData(channelsData);

					return interaction.reply({
						content: 'Le channel de sélection de rôles n\'existe plus sur le serveur. L\'entrée a été supprimée.',
						ephemeral: true,
					});
				}

				channelData = roleSelectionChannel;
			}
			else {
				// Vérifier si ce channel est bien un channel de sélection
				channelData = channelsData[channel.id];
				if (!channelData || (!channelData.selectChannel && channelData.type !== 'role_selection')) {
					return interaction.reply({
						content: 'Ce channel n\'est pas un channel de sélection de rôles enregistré.',
						ephemeral: true,
					});
				}
			}

			try {
				// Supprimer le channel Discord
				await channel.delete('Suppression par commande /role_channel delete');

				// Supprimer l'entrée du JSON
				delete channelsData[channel.id];
				setChannelsData(channelsData);

				// Supprimer de guilds.json
				const guildsData = getGuildsData();
				if (guildsData[guild.id] && guildsData[guild.id].roleSelectionChannelId === channel.id) {
					delete guildsData[guild.id].roleSelectionChannelId;
					setGuildsData(guildsData);
				}

				return interaction.reply({
					content: `Le channel de sélection ${channel.name} a été supprimé avec succès.`,
					ephemeral: true,
				});
			}
			catch (error) {
				logger.error('Erreur lors de la suppression du channel de sélection:', error);
				return interaction.reply({
					content: 'Une erreur est survenue lors de la suppression du channel.',
					ephemeral: true,
				});
			}
		}
		// COMMANDE UPDATE - Mise à jour forcée d'un channel de sélection
		else if (subcommand === 'update') {
			let channel = null;
			let channelData = null;

			// Trouver le channel de type role_selection pour CETTE guilde
			const roleSelectionChannel = Object.values(channelsData).find(
				entry => (entry.type === 'role_selection' || entry.selectChannel === true) && entry.guildId === guild.id,
			);

			if (!roleSelectionChannel) {
				return interaction.reply({
					content: 'Aucun channel de sélection de rôles trouvé. Veuillez d\'abord en créer un avec /role_channel create.',
					ephemeral: true,
				});
			}

			// Récupérer le channel Discord à partir de son ID
			channel = await interaction.guild.channels.fetch(roleSelectionChannel.idChannel).catch(() => null);
			if (!channel) {
				return interaction.reply({
					content: 'Le channel de sélection de rôles référencé dans les données n\'existe plus sur le serveur.',
					ephemeral: true,
				});
			}

			// eslint-disable-next-line no-unused-vars
			channelData = roleSelectionChannel;

			try {
				// Supprimer les anciens messages
				await interaction.reply({
					content: `Mise à jour du channel <#${channel.id}> en cours...`,
					ephemeral: true,
				});

				// Récupérer les anciens messages
				const messages = await channel.messages.fetch({ limit: 10 });

				// Supprimer tous les messages récupérés
				for (const message of messages.values()) {
					await message.delete().catch(error => {
						logger.error(`Erreur lors de la suppression d'un message dans le channel de sélection: ${error}`);
					});
				}

				// Publier le nouveau menu de sélection
				await publishSelectionMenu(channel, channelsData);

				return interaction.editReply({
					content: `Le menu de sélection dans <#${channel.id}> a été mis à jour avec succès.`,
				});
			}
			catch (error) {
				logger.error('Erreur lors de la mise à jour du channel de sélection:', error);
				return interaction.editReply({
					content: 'Une erreur est survenue lors de la mise à jour du channel.',
				});
			}
		}
	},
};

// Export module with category
module.exports.category = 'management';
