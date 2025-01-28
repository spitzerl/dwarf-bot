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
				 flags: 64,
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
					 flags: 64,
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
						description: 'Channel et rôle créés avec succès !\nVous pouvez accéder au channel en cliquant sur le bouton ci-dessous.',
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
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								label: 'Prendre le rôle',
								style: 1,
								customId: `assign-role-${role.id}`,
							},
						],
					},
				],
			});

			const filter = (i) => i.customId === `assign-role-${role.id}` && i.user.id === interaction.user.id;

			const collector = interaction.channel.createMessageComponentCollector({
				filter,
				time: 15000,
			});

			collector.on('collect', (i) => {
				if (i.customId === `assign-role-${role.id}`) {
					const roleId = role.id;
					const roleObj = interaction.guild.roles.cache.get(roleId);
					const member = interaction.member;

					if (roleObj) {
						if (member.roles.cache.has(roleId)) {
							member.roles.remove(roleId);
							i.reply({
								embeds: [
									{
										title: 'Rôle retiré',
										description: 'Vous avez été retiré du rôle.',
										color: 0xFF0000,
									},
								],
								 flags: 64,
							});
						}
						else {
							member.roles.add(roleId);
							i.reply({
								embeds: [
									{
										title: 'Rôle attribué',
										description: 'Vous avez été ajouté au rôle.',
										color: 0x00FF00,
									},
								],
								 flags: 64,
							});
						}
					}
					else {
						i.reply({
							embeds: [
								{
									title: 'Erreur',
									description: 'Rôle introuvable.',
									color: 0xFF0000,
								},
							],
							 flags: 64,
						});
					}
				}
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
				 flags: 64,
			});
		}
	},
};
