const {
	SlashCommandBuilder,
	PermissionsBitField,
	ChannelType,
	ActionRowBuilder,
	StringSelectMenuBuilder,
} = require('discord.js');
const { getChannelsData, setChannelsData } = require('../../utils/utils');
const { toKebabCase } = require('../../utils/stringFormatter');

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
		// Vérifications d'autorisation (admin / manage channels)
		if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
			return interaction.reply({
				content: 'Vous n\'avez pas la permission de gérer les channels.',
				ephemeral: true,
			});
		}

		const subcommand = interaction.options.getSubcommand();
		const guild = interaction.guild;
		const channelsData = getChannelsData();

		// COMMANDE CREATE - Création d'un nouveau channel de sélection
		if (subcommand === 'create') {
			const name = interaction.options.getString('name');

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
				};

				channelsData[channel.id] = data;
				setChannelsData(channelsData);

				return interaction.reply({ content: `Channel créé : <#${channel.id}> et menu posté.` });
			}
			catch (error) {
				console.error('Erreur lors de la création du channel:', error);
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
				// Trouver le premier channel de type role_selection
				const roleSelectionChannel = Object.values(channelsData).find(
					entry => entry.type === 'role_selection' || entry.selectChannel === true,
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

				return interaction.reply({
					content: `Le channel de sélection ${channel.name} a été supprimé avec succès.`,
					ephemeral: true,
				});
			}
			catch (error) {
				console.error('Erreur lors de la suppression du channel:', error);
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

			// Trouver le premier channel de type role_selection
			const roleSelectionChannel = Object.values(channelsData).find(
				entry => entry.type === 'role_selection' || entry.selectChannel === true,
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
						console.error(`Erreur lors de la suppression d'un message: ${error}`);
					});
				}

				// Publier le nouveau menu de sélection
				await publishSelectionMenu(channel, channelsData);

				return interaction.editReply({
					content: `Le menu de sélection dans <#${channel.id}> a été mis à jour avec succès.`,
				});
			}
			catch (error) {
				console.error('Erreur lors de la mise à jour du channel:', error);
				return interaction.editReply({
					content: 'Une erreur est survenue lors de la mise à jour du channel.',
				});
			}
		}
	},
};

/**
};

/**
 * Génère les options pour le menu de sélection de rôles
 * @param {Object} channelsData - Les données des channels
 * @returns {Array<Object>} - Les options pour le menu de sélection
 */
function generateRoleOptions(channelsData) {
	// Préparer les options de la liste déroulante depuis channels.json
	const options = [];
	for (const entry of Object.values(channelsData)) {
		// Ignorer l'entrée s'il s'agit d'un channel de sélection
		if (entry.selectChannel === true || entry.type === 'role_selection') continue;

		// Utiliser le nom et emoji stockés dans le JSON
		const label = entry.name || entry.nameSimplified || 'Inconnu';

		// Préparer l'option pour le select menu
		const opt = {
			label: label.slice(0, 25), // Limiter à 25 caractères le label
			value: (entry.nameSimplified || label).slice(0, 100),
		};

		// Ajouter l'emoji s'il existe dans le JSON ou essayer de l'extraire du nom si c'est une ancienne entrée
		if (entry.emoji) {
			// Utiliser l'emoji stocké dans le JSON
			opt.emoji = entry.emoji;
		}
		else {
			// Rétrocompatibilité: essayer d'extraire l'emoji du nom si c'est une ancienne entrée
			const match = /^(.+)・(.+)$/.exec(label);
			if (match && match[1].length <= 3) {
				opt.emoji = match[1];
			}
		}

		// Pas de description pour simplifier et réduire les erreurs
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
	// S'assurer qu'il y a au moins une option
	const validOptions = options.length > 0 ? options : [{
		label: 'Aucun jeu disponible',
		value: 'no-games',
	}];

	// Discord limite le nombre d'options à 25
	const limitedOptions = validOptions.slice(0, 25);

	// Créer le menu
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('select_game_roles')
		.setPlaceholder('Choisissez un ou plusieurs jeux')
		.setMinValues(1)
		.setMaxValues(limitedOptions.length) // Pas de limite sur le nombre de rôles
		.addOptions(limitedOptions);

	return new ActionRowBuilder().addComponents(selectMenu);
}

// Exporter la fonction pour qu'elle soit utilisable par d'autres modules
/**
 * @param {Discord.TextChannel} channel - Le channel où publier le menu
 * @param {Object} channelsData - Les données des channels
 * @returns {Promise<void>}
 */
async function publishSelectionMenu(channel, channelsData) {
	// Générer les options du menu
	const options = generateRoleOptions(channelsData);

	// Créer d'abord un message avec l'embed explicatif
	const embed = {
		title: 'Sélection des rôles de jeux',
		description:
			'Choisissez dans la liste ci-dessous les jeux auxquels vous souhaitez être associé.\n\n' +
			'Validez pour appliquer. Pour retirer un rôle, rouvrez le menu et désélectionnez-le.',
		color: 0x00ff00,
	};

	await channel.send({ embeds: [embed] });

	// Vérifier qu'il y a au moins une option valide
	if (options.length === 0) {
		// Message d'information si aucun jeu disponible
		await channel.send('Aucun jeu n\'a été trouvé dans la configuration. Veuillez ajouter des jeux via la commande /create.');
	}

	try {
		// Créer le menu de sélection avec nos options
		const row = createRoleSelectionMenu(options);

		// Envoyer le message avec uniquement le composant
		await channel.send({ content: 'Liste des jeux disponibles :', components: [row] });
	}
	catch (menuError) {
		console.error('Erreur lors de la création du menu:', menuError);
		await channel.send('Erreur lors de la création du menu de sélection. Contactez un administrateur.');
	}
}

// Exporter le module avec toutes les fonctions nécessaires pour la gestion des menus
module.exports.publishSelectionMenu = publishSelectionMenu;
module.exports.generateRoleOptions = generateRoleOptions;
module.exports.createRoleSelectionMenu = createRoleSelectionMenu;