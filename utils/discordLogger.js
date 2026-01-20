const { EmbedBuilder, WebhookClient } = require('discord.js');
const logger = require('./logger');
const { getGuildsData } = require('./utils');
require('dotenv').config();

// Webhook and Master Channel are optional
const masterWebhookUrl = process.env.MASTER_LOG_WEBHOOK_URL;
const masterChannelId = process.env.MASTER_LOG_CHANNEL_ID;
let masterWebhook = null;

if (masterWebhookUrl) {
    try {
        masterWebhook = new WebhookClient({ url: masterWebhookUrl });
    } catch (error) {
        logger.error('Failed to initialize Master Webhook:', error);
    }
}

/**
 * Utility to handle Discord side logging.
 */
module.exports = {
    /**
     * Logs an event to the local server log channel and the master log channel.
     * @param {import('discord.js').Guild} guild 
     * @param {Object} data 
     */
    async logAction(guild, { title, description, color = 0x3498DB, fields = [], status = 'info' }) {
        logger.debug(`logAction called for ${title} in guild ${guild.id}`);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .addFields(fields)
            .setTimestamp()
            .setFooter({ text: `Guild: ${guild.name} (${guild.id})` });

        // 1. Local Logging
        try {
            const guildsData = getGuildsData();
            const localChannelId = guildsData[guild.id]?.localLogChannelId;

            let logChannel = null;
            if (localChannelId) {
                logger.debug(`Attempting to fetch local log channel by ID: ${localChannelId}`);
                logChannel = await guild.channels.fetch(localChannelId).catch(() => null);
            }

            if (!logChannel) {
                // Fallback to searching by name if ID failed or wasn't provided
                logger.debug('Attempting to find local log channel by name: bot-logs');
                logChannel = guild.channels.cache.find(c => (c.name === 'bot-logs' || c.name === 'bot-log') && c.isTextBased());
            }

            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send({ embeds: [embed] });
                logger.debug(`Local log sent to #${logChannel.name}`);
            } else {
                logger.debug('No local log channel found or accessible.');
            }
        } catch (error) {
            logger.error(`Failed to send local log in ${guild.id}:`, error);
        }

        // 2. Master Logging
        // Option A: Webhook
        if (masterWebhook) {
            try {
                logger.debug('Attempting to send master log via Webhook');
                const masterEmbed = EmbedBuilder.from(embed);
                const statusEmoji = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
                masterEmbed.setTitle(`${statusEmoji} ${title}`);

                await masterWebhook.send({
                    username: 'Dwarf Supervision',
                    embeds: [masterEmbed],
                });
                logger.debug('Master log sent via Webhook');
            } catch (error) {
                logger.error('Failed to send Master log via Webhook:', error);
            }
        }

        // Option B: Channel ID (even if webhook exists, we might want to try if webhook fails? 
        // No, user usually wants one or the other but we follow logic)
        if (!masterWebhook && masterChannelId) {
            try {
                logger.debug(`Attempting to fetch master log channel by ID: ${masterChannelId}`);
                const masterChannel = await guild.client.channels.fetch(masterChannelId).catch(() => null);
                if (masterChannel && masterChannel.isTextBased()) {
                    const masterEmbed = EmbedBuilder.from(embed);
                    const statusEmoji = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
                    masterEmbed.setTitle(`${statusEmoji} ${title}`);
                    await masterChannel.send({ embeds: [masterEmbed] });
                    logger.debug(`Master log sent to channel ID ${masterChannelId}`);
                } else {
                    logger.debug('Master log channel not found or not text-based.');
                }
            } catch (error) {
                logger.error('Failed to send Master log via Channel ID:', error);
            }
        }

        // 3. Logger entry (Always happens)
        logger.info(`Action Logged: ${title} in guild ${guild.id}`, { status, description, fields });
    },
};
