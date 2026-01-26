const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getChannelsData } = require('../../utils/utils');
const logger = require('../../utils/logger');

module.exports = {
    category: 'management',
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Vérifie les associations entre rôles et salons')
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Affiche les rôles qui n\'ont pas de salon associé'),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Affiche les salons qui n\'ont pas de rôle associé'),
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const channelsData = getChannelsData();

        await interaction.deferReply();

        try {
            if (subcommand === 'roles') {
                // Récupérer tous les IDs de rôles associés dans channels.json (pour cette guilde)
                const associatedRoleIds = new Set(
                    Object.values(channelsData)
                        .filter(d => d.guildId === guild.id && d.idRole)
                        .map(d => d.idRole),
                );

                // Filtrer les rôles du serveur
                const rolesWithoutChannel = guild.roles.cache.filter(role => {
                    // Ignorer @everyone
                    if (role.id === guild.id) return false;
                    // Ignorer les rôles gérés (bots, boosters, etc.)
                    if (role.managed) return false;
                    // Garder ceux qui ne sont pas dans la liste des associés
                    return !associatedRoleIds.has(role.id);
                });

                const embed = {
                    title: `🔍 Rôles sans salon associé (${rolesWithoutChannel.size})`,
                    color: 0x3498DB,
                    timestamp: new Date().toISOString(),
                    description: rolesWithoutChannel.size > 0
                        ? rolesWithoutChannel.map(r => `• <@&${r.id}>`).join('\n')
                        : 'Tous les rôles ont un salon associé.',
                };

                // Gérer la limite de caractères de l'embed
                if (embed.description.length > 4096) {
                    embed.description = embed.description.substring(0, 4090) + '...';
                    embed.footer = { text: 'La liste est trop longue pour être affichée entièrement.' };
                }

                return interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'channels') {
                // Récupérer tous les IDs de salons associés dans channels.json (pour cette guilde)
                const associatedChannelIds = new Set(
                    Object.values(channelsData)
                        .filter(d => d.guildId === guild.id && d.idRole) // On ne compte que ceux qui ont un rôle
                        .map(d => d.idChannel),
                );

                // Filtrer les salons textuels
                const channelsWithoutRole = guild.channels.cache.filter(channel => {
                    // Uniquement les salons textuels
                    if (channel.type !== ChannelType.GuildText) return false;

                    // Ignorer les salons de type 'role_selection' (qui ont idRole: null souvent)
                    const existingData = channelsData[channel.id];
                    if (existingData && (existingData.type === 'role_selection' || existingData.selectChannel)) {
                        return false;
                    }

                    // Garder ceux qui ne sont pas associés à un rôle
                    return !associatedChannelIds.has(channel.id);
                });

                const embed = {
                    title: `🔍 Salons sans rôle associé (${channelsWithoutRole.size})`,
                    color: 0xE67E22,
                    timestamp: new Date().toISOString(),
                    description: channelsWithoutRole.size > 0
                        ? channelsWithoutRole.map(c => `• <#${c.id}>`).join('\n')
                        : 'Tous les salons textuels ont un rôle associé.',
                };

                // Gérer la limite de caractères de l'embed
                if (embed.description.length > 4096) {
                    embed.description = embed.description.substring(0, 4090) + '...';
                    embed.footer = { text: 'La liste est trop longue pour être affichée entièrement.' };
                }

                return interaction.editReply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error(`Erreur lors de la commande check ${subcommand}:`, error);
            return interaction.editReply({
                content: 'Une erreur est survenue lors de la vérification.',
                ephemeral: true,
            });
        }
    },
};
