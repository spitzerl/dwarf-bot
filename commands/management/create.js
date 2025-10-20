const {
	SlashCommandBuilder,
	PermissionsBitField,
	ChannelType,
} = require('discord.js');
const { getChannelsData, setChannelsData, updateRoleSelectionChannel } = require('../../utils/utils');
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
		let roleColor = interaction.options.getString('color') || 'FFFFFF';	// Valeur par défaut
		let emoji = interaction.options.getString('emoji') || '';	// Valeur par défaut
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
						color: 0xFF0000,
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
							color: 0xFF0000,
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
			// Vérifier que la couleur est valide
			const validColor = roleColor && roleColor.match(/^[0-9A-Fa-f]{6}$/) ?
				'#' + roleColor : '#00FF00';

			// Création du rôle (utilise `color` car il semble que `colors` n'est pas supporté)
			const role = await guild.roles.create({
				name: emoji + '・' + name,
				color: validColor,
				permissions: [],
			});

			// Création du channel textuel
			const channel = await guild.channels.create({
				name: emoji + '・' + name,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild.id,
						deny: [PermissionsBitField.Flags.ViewChannel],
					},
					{
						id: role.id,
						allow: [PermissionsBitField.Flags.ViewChannel],
					},
				],
			});

			// Stockage des informations dans le fichier JSON
			const data = {
				name: name,
				nameSimplified: toKebabCase(name),
				idChannel: channel.id,
				idRole: role.id,
				emoji: emoji, // Ajout de l'emoji dans le JSON
			};

			channelsData[channel.id] = data;

			setChannelsData(channelsData);

			// Mettre à jour automatiquement le channel de sélection de rôles s'il existe
			updateRoleSelectionChannel(guild)
				.then(success => {
					if (success) {
						console.log('Le menu de sélection a été mis à jour suite à la création du nouveau jeu.');
					}
				})
				.catch(error => {
					console.error('Erreur lors de la mise à jour du menu de sélection:', error);
				});

			// S'assurer que roleColor est une chaîne valide avant la conversion
			const colorInt = roleColor && roleColor.match(/^[0-9A-Fa-f]{6}$/) ?
				parseInt(roleColor, 16) : 0x00FF00; // Valeur par défaut vert si conversion impossible

			interaction.reply({
				embeds: [
					{
						title: 'Succès',
						description: 'Channel et rôle créés avec succès !\nVous pouvez accéder au channel en cliquant sur le bouton ci-dessous.',
						color: colorInt,
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
						color: 0xFF0000,
					},
				],
				flags: 64,
			});
		}
	},
};
