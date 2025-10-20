const { SlashCommandBuilder } = require('discord.js');
const { getChannelsData, setChannelsData, updateRoleSelectionChannel } = require('../../utils/utils');
const { toKebabCase } = require('../../utils/stringFormatter');

module.exports = {
	category: 'management',
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Supprimer un channel et son rôle associé')
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('Nom du channel et du rôle à supprimer')
				.setRequired(true),
		),

	async execute(interaction) {
		// Assignation des variables
		const name = interaction.options.getString('name');
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

		// Récupération des données des channels
		const channelsData = getChannelsData();
		let channelDataToDelete = null;
		for (const channelData of Object.values(channelsData)) {
			// Conversion du nom en kebab case
			if (channelData.nameSimplified === toKebabCase(name)) {
				channelDataToDelete = channelData;
				break;
			}
		}

		// Vérification si le channel existe
		if (!channelDataToDelete) {
			return interaction.reply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Ce channel n\'existe pas.',
						color: 0xFF0000,
					},
				],
				flags: 64,
			});
		}

		try {
			// Suppression du channel
			const channel = guild.channels.cache.get(channelDataToDelete.idChannel);
			if (channel) {
				await channel.delete();
			}

			// Suppression du rôle
			const role = guild.roles.cache.get(channelDataToDelete.idRole);
			if (role) {
				await role.delete();
			}

			// Mise à jour des données des channels
			delete channelsData[channelDataToDelete.idChannel];
			setChannelsData(channelsData);

			// Mettre à jour automatiquement le channel de sélection de rôles s'il existe
			updateRoleSelectionChannel(guild)
				.then(success => {
					if (success) {
						console.log('Le menu de sélection a été mis à jour suite à la suppression du jeu.');
					}
				})
				.catch(error => {
					console.error('Erreur lors de la mise à jour du menu de sélection:', error);
				});

			interaction.reply({
				embeds: [
					{
						title: 'Succès',
						description: 'Channel et rôle supprimés avec succès !',
						color: 0x00FF00,
					},
				],
				flags: 64,
			});
		}
		catch (error) {
			console.error(error);
			interaction.reply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Erreur lors de la suppression du channel et du rôle.',
						color: 0xFF0000,
					},
				],
				flags: 64,
			});
		}
	},
};
