const { EmbedBuilder, WebhookClient } = require('discord.js');
const logger = require('./logger');
require('dotenv').config();

// You should add MASTER_LOG_WEBHOOK_URL to your .env
const masterWebhookUrl = process.env.MASTER_LOG_WEBHOOK_URL;
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
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .addFields(fields)
            .setTimestamp()
            .setFooter({ text: `Guild: ${guild.name} (${guild.id})` });

        // 1. Local Logging
        try {
            const logChannel = guild.channels.cache.find(c => c.name === 'bot-logs');
            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`Failed to send local log in ${guild.id}:`, error);
        }

        // 2. Master Logging (via Webhook for cross-server ease)
        if (masterWebhook) {
            try {
                // Add status flag for master view
                const masterEmbed = EmbedBuilder.from(embed);
                const statusEmoji = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
                masterEmbed.setTitle(`${statusEmoji} ${title}`);

                await masterWebhook.send({
                    username: 'Dwarf Supervision',
                    embeds: [masterEmbed],
                });
            } catch (error) {
                logger.error('Failed to send Master log:', error);
            }
        }

        // 3. Logger entry
        logger.info(`Action Logged: ${title} in guild ${guild.id}`, { status, description, fields });
    },
};
