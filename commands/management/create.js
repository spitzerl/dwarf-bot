const {
	SlashCommandBuilder,
	PermissionsBitField,
	ChannelType,
} = require('discord.js');
const { getChannelsData, setChannelsData } = require('../../utils/utils');
const { toKebabCase } = require('../../utils/stringFormatter');

module.exports = {
	category: 'management',
	data: new SlashCommandBuilder()
		.setName('create')
		.setDescription('Create text channel and associated role')
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('Channel and role name')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('color')
				.setDescription('Role color (hex)')
				.setMinLength(6)
				.setMaxLength(6),
		)
		.addStringOption((option) =>
			option.setName('emoji').setDescription('Channel and role emoji'),
		),

	async execute(interaction) {
		// Assignation des variables
		const name = interaction.options.getString('name');
		let roleColor = interaction.options.getString('color') || 'FFFFFF'; // Valeur par défaut
		let emoji = interaction.options.getString('emoji') || ''; // Valeur par défaut
		const guild = interaction.guild;

		// Vérification des autorisations
		if (
			!interaction.memberPermissions.has('MANAGE_CHANNELS') ||
      !interaction.memberPermissions.has('MANAGE_ROLES')
		) {
			return interaction.reply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Vous n\'avez pas les autorisations nécessaires pour exécuter cette commande.',
						color: 'FF0000',
					},
				],
				ephemeral: true,
			});
		}

		const channelsData = getChannelsData();

		// Verifier si le jeu existe déjà
		for (const channelData of Object.values(channelsData)) {
			if (channelData.nameSimplified === toKebabCase(name)) {
				return interaction.reply({
					embeds: [
						{
							title: 'Erreur',
							description: 'Ce channel existe déjà.',
							color: 'FF0000',
						},
					],
					ephemeral: true,
				});
			}
		}

		// Couleur par défaut du rôle
		if (!roleColor) {
			roleColor = 'FFFFFF';
		}

		// Emoji par défaut du rôle
		if (!emoji) {
			emoji = '🟩';
		}

		try {
			// Création du channel textuel
			const channel = await guild.channels.create({
				name: emoji + '・' + name,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild.id,
						allow: [ PermissionsBitField.Flags.ViewChannel ],
					},
				],
			});

			// Création du rôle
			const role = await guild.roles.create({
				name: emoji + '・' + name,
				color: '#' + roleColor,
				permissions: [],
			});

			// Stockage des informations dans le fichier JSON
			const data = {
				name: name,
				nameSimplified: toKebabCase(name),
				idChannel: channel.id,
				idRole: role.id,
			};

			channelsData[channel.id] = data;

			setChannelsData(channelsData);

			interaction.reply({
				embeds: [
					{
						title: 'Succès',
						description: 'Channel et rôle créés avec succès !',
						color: parseInt(roleColor, 16),
						fields: [
							{
								name: 'Salon',
								value: `<#${channel.id}>`,
								inline: true,
							},
							{
								name: 'Rôle',
								value: `<@&${role.id}>`,
								inline: true,
							},
						],
					},
				],
			});
		}
		catch (error) {
			console.error(error);
			interaction.reply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Erreur lors de la création du channel et du rôle.',
						color: roleColor,
					},
				],
				ephemeral: true,
			});
		}
	},
};
