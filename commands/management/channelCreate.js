const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const { getChannelsData, setChannelsData } = require("../../utils/utils");
const { toKebabCase } = require("../../utils/stringFormatter");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("create")
		.setDescription("Create text channel and associated role")
		.addStringOption((option) => option.setName("name").setDescription("Channel and role name").setRequired(true))
		.addStringOption((option) => option.setName("color").setDescription("Role color").setMinLength(6).setMaxLength(6))
		.addStringOption((option) => option.setName("emoji").setDescription("Emoji for channel name and role")),

	async execute(interaction) {
		// Assignation des variables
		const name = interaction.options.getString("name"); // Corrected option name
		const roleColor = interaction.options.getString("color");
		const emoji = interaction.options.getString("emoji"); // Corrected function call
		const guild = interaction.guild;

		// Vérification des autorisations
		if (!interaction.memberPermissions.has("MANAGE_CHANNELS") || !interaction.memberPermissions.has("MANAGE_ROLES")) {
			return interaction.reply({ content: "Vous n'avez pas les autorisations nécessaires pour exécuter cette commande.", flags: 64 });
		}

		// Verifier si le jeu existe déjà
		const channelsData = getChannelsData();
		for (const channelData of Object.values(channelsData)) {
			if (channelData.nameSimplified === toKebabCase(name)) {
				return interaction.reply({ content: "Ce channel existe déjà.", flags: 64 });
			}
		}

		try {
			// Création du channel textuel
			const channel = await guild.channels.create({
				name: emoji + "・" + name,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild.id,
						allow: [PermissionsBitField.Flags.ViewChannel],
					},
				],
			});

			// Création du rôle
			const role = await guild.roles.create({
				name: emoji + "・" + name,
				color: `#` + roleColor,
				permissions: [],
			});

			// Stockage des informations dans le fichier JSON
			const data = {
				name: name,
				nameSimplified: toKebabCase(name),
				idChannel: channel.id,
				idRole: role.id,
			};

			const channelsData = getChannelsData();

			channelsData[channel.id] = data;

			setChannelsData(channelsData);

			interaction.reply({ content: `Channel et rôle créés avec succès !`, flags: 64 });
		} catch (error) {
			console.error(error);
			interaction.reply({ content: "Erreur lors de la création du channel et du rôle.", flags: 64 });
		}
	},
};
