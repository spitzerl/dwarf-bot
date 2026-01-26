const { Events, MessageFlags, Collection } = require('discord.js');
const logger = require('../utils/logger');
const { logAction } = require('../utils/discordLogger');
const { isAdmin, isModerator } = require('../utils/permissions');

const cooldowns = new Collection();

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) {
			return;
		}

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		// --- COOLDOWN SYSTEM ---
		if (!cooldowns.has(command.data.name)) {
			cooldowns.set(command.data.name, new Collection());
		}

		const now = Date.now();
		const timestamps = cooldowns.get(command.data.name);
		const defaultCooldownAmount = 3;
		const cooldownAmount = (command.cooldown || defaultCooldownAmount) * 1000;

		if (timestamps.has(interaction.user.id)) {
			const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

			if (now < expirationTime) {
				const expiredTimestamp = Math.round(expirationTime / 1000);
				return interaction.reply({
					content: `S'il vous plaît attendez, vous pourrez utiliser \`${command.data.name}\` à nouveau <t:${expiredTimestamp}:R>.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		timestamps.set(interaction.user.id, now);
		setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

		// --- PERMISSION SYSTEM (RBAC) ---
		if (command.category === 'management') {
			if (!isModerator(interaction.member)) {
				logger.warn(`User ${interaction.user.tag} (${interaction.user.id}) tried to use management command ${command.data.name} without permission.`);
				return interaction.reply({
					content: 'Vous n\'avez pas les permissions nécessaires (Modérateur) pour utiliser cette commande.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		try {
			await command.execute(interaction);

			// --- LOGGING ACTION ---
			if (command.category === 'management') {
				const { formatOptions } = require('../utils/discordLogger');
				const optionsDetails = formatOptions(interaction);

				await logAction(interaction.guild, {
					title: `🛠️ Commande: /${command.data.name}`,
					description: `L'utilisateur <@${interaction.user.id}> a exécuté une commande de gestion.`,
					status: 'success',
					color: 0x3498DB,
					user: interaction.user,
					fields: [
						{ name: '👤 Utilisateur', value: `${interaction.user.tag}`, inline: true },
						{ name: '📍 Salon', value: `<#${interaction.channel.id}>`, inline: true },
						{ name: '📝 Détails', value: optionsDetails.substring(0, 1024) },
					],
				});
			}
		}
		catch (error) {
			logger.error(`Error executing ${interaction.commandName}:`, error);

			// Log failure to Discord
			if (command.category === 'management') {
				const { formatOptions } = require('../utils/discordLogger');
				const optionsDetails = formatOptions(interaction);

				await logAction(interaction.guild, {
					title: `❌ Échec: /${command.data.name}`,
					description: `Une erreur est survenue lors de l'exécution d'une commande de gestion.`,
					status: 'error',
					color: 0xE74C3C,
					user: interaction.user,
					fields: [
						{ name: 'Erreur', value: `\`\`\`${error.message || 'Erreur inconnue'}\`\`\`` },
						{ name: '📝 Détails', value: optionsDetails.substring(0, 1024) },
					],
				});
			}

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			}
			else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
