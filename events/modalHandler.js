const { Events } = require('discord.js');
const { getChannelsData, setChannelsData, updateRoleSelectionChannel } = require('../utils/utils');
const { toKebabCase, extractEmoji, extractCleanName } = require('../utils/stringFormatter');
const logger = require('../utils/logger');
const { logAction } = require('../utils/discordLogger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        // Vérifier si c'est notre modal d'édition d'association
        if (interaction.customId.startsWith('edit_assoc_')) {
            const channelId = interaction.customId.replace('edit_assoc_', '');
            await interaction.deferReply({ ephemeral: true });

            try {
                const rawDisplayName = interaction.fields.getTextInputValue('display_name');
                const channelName = interaction.fields.getTextInputValue('channel_name');
                const roleName = interaction.fields.getTextInputValue('role_name');
                const rawEmoji = interaction.fields.getTextInputValue('emoji');
                const roleColor = interaction.fields.getTextInputValue('role_color');

                // Extraire proprement si l'utilisateur a tout mis dans le champ nom
                const displayName = extractCleanName(rawDisplayName);
                const emoji = rawEmoji || extractEmoji(rawDisplayName) || '🟩';

                const channelsData = getChannelsData();
                const channelData = channelsData[channelId];

                if (!channelData) {
                    return interaction.editReply({ content: 'Données de l\'association introuvables.' });
                }

                const guild = interaction.guild;
                const channel = await guild.channels.fetch(channelId).catch(() => null);

                let role = null;
                if (channelData.idRole) {
                    role = await guild.roles.fetch(channelData.idRole).catch(() => null);
                }

                // 1. Mettre à jour le salon Discord
                if (channel && channel.name !== channelName) {
                    await channel.setName(channelName).catch(err => logger.error(`Erreur renommage salon: ${err}`));
                }

                // 2. Mettre à jour le rôle Discord
                if (role) {
                    if (roleName && role.name !== roleName) {
                        await role.setName(roleName).catch(err => logger.error(`Erreur renommage rôle: ${err}`));
                    }
                    if (roleColor) {
                        // Valider le format hex
                        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                        if (hexRegex.test(roleColor)) {
                            await role.setColor(roleColor).catch(err => logger.error(`Erreur couleur rôle: ${err}`));
                        }
                    }
                }

                // 3. Mettre à jour les données JSON
                channelData.name = displayName;
                channelData.nameSimplified = toKebabCase(displayName);
                channelData.emoji = emoji;

                setChannelsData(channelsData);

                // 4. Mettre à jour le menu de sélection
                await updateRoleSelectionChannel(guild);

                // 5. Log et Réponse
                await logAction(guild, {
                    title: 'Association Modifiée',
                    description: `L'association pour <#${channelId}> a été modifiée par <@${interaction.user.id}>.`,
                    color: 0x3498DB,
                    user: interaction.user,
                    fields: [
                        { name: 'Nom', value: displayName, inline: true },
                        { name: 'Emoji', value: emoji, inline: true },
                        { name: 'Salon', value: channelName, inline: true },
                        { name: 'Rôle', value: roleName || 'Aucun', inline: true },
                    ],
                });

                return interaction.editReply({
                    content: `L'association **${displayName}** a été mise à jour avec succès !`,
                });

            }
            catch (error) {
                logger.error('Erreur lors du traitement du modal d\'édition:', error);
                return interaction.editReply({
                    content: 'Une erreur est survenue lors de l\'enregistrement des modifications.',
                });
            }
        }
    },
};
