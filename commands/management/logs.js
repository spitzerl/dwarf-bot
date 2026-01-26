const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildsData, setGuildsData } = require('../../utils/utils');
const logger = require('../../utils/logger');
const { logAction } = require('../../utils/discordLogger');

module.exports = {
    category: 'management',
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configuration des salons de logs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Définit le salon de logs pour ce serveur')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Le salon où envoyer les logs')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Affiche le salon de logs actuel')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildsData = getGuildsData();
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const channel = interaction.options.getChannel('channel');

            if (!guildsData[guildId]) {
                guildsData[guildId] = {};
            }

            guildsData[guildId].localLogChannelId = channel.id;
            setGuildsData(guildsData);

            logger.info(`Log channel set to ${channel.id} for guild ${guildId}`);

            await interaction.reply({
                content: `Le salon de logs a été défini sur <#${channel.id}>.`,
                ephemeral: true
            });
        }
        else if (subcommand === 'show') {
            const channelId = guildsData[guildId]?.localLogChannelId;

            if (channelId) {
                await interaction.reply({
                    content: `Le salon de logs actuel est <#${channelId}>.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Aucun salon de logs n\'est configuré pour ce serveur (le bot cherchera un salon nommé `bot-logs` par défaut).',
                    ephemeral: true
                });
            }
        }
    },
};
