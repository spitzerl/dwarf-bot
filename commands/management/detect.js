const {
	SlashCommandBuilder,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const { getChannelsData, setChannelsData, updateRoleSelectionChannel } = require('../../utils/utils');
const {
	toKebabCase,
	normalizeForComparison,
	extractEmoji,
	extractCleanName
} = require('../../utils/stringFormatter');
const logger = require('../../utils/logger');

module.exports = {
	category: 'management',
	data: new SlashCommandBuilder()
		.setName('detect')
		.setDescription('Détecte et associe automatiquement les rôles et salons existants')
		.addBooleanOption(option =>
			option
				.setName('preview')
				.setDescription('Afficher seulement un aperçu sans modifier les données (par défaut: true)')
				.setRequired(false),
		),

	async execute(interaction) {
		// Par défaut, on est en mode preview
		const preview = interaction.options.getBoolean('preview') ?? true;
		const guild = interaction.guild;

		await interaction.deferReply();

		try {
			// Récupérer les données existantes
			const channelsData = getChannelsData();

			// Récupérer tous les salons textuels du serveur
			const textChannels = guild.channels.cache.filter(
				channel => channel.type === 0, // GuildText
			);

			// Récupérer tous les rôles du serveur (sauf @everyone et les rôles bot/managed)
			const roles = guild.roles.cache.filter(
				role => !role.managed && role.id !== guild.id,
			);

			// Liste des associations trouvées
			const matches = [];
			const alreadyTracked = [];
			const usedRoleIds = new Set();
			const usedChannelIds = new Set();

			// D'abord, marquer les channels et roles déjà suivis
			for (const data of Object.values(channelsData)) {
				// Filtrer par guilde : n'ignorer que ce qui appartient à CETTE guilde
				if (data.guildId && data.guildId !== guild.id) continue;

				if (data.idChannel) usedChannelIds.add(data.idChannel);
				if (data.idRole) usedRoleIds.add(data.idRole);
			}

			// Parcourir les salons
			for (const [channelId, channel] of textChannels) {
				// Ignorer si déjà suivi
				if (usedChannelIds.has(channelId)) {
					const existingData = Object.values(channelsData).find(d => d.idChannel === channelId && (!d.guildId || d.guildId === guild.id));
					if (existingData) {
						alreadyTracked.push({
							channel: channel,
							role: existingData.idRole ? guild.roles.cache.get(existingData.idRole) : null,
							name: existingData.name,
						});
					}
					continue;
				}

				const channelNameNormalized = normalizeForComparison(channel.name);
				const channelCleanName = extractCleanName(channel.name);

				// Chercher un rôle correspondant
				for (const [roleId, role] of roles) {
					// Ignorer si ce rôle est déjà utilisé
					if (usedRoleIds.has(roleId)) continue;

					const roleNameNormalized = normalizeForComparison(role.name);

					// Comparer les noms normalisés
					if (channelNameNormalized === roleNameNormalized && channelNameNormalized !== '') {
						matches.push({
							channel: channel,
							role: role,
							channelName: channel.name,
							roleName: role.name,
							cleanName: channelCleanName || extractCleanName(role.name),
							emoji: extractEmoji(channel.name) || extractEmoji(role.name) || '🟩',
						});

						// Marquer comme utilisés
						usedChannelIds.add(channelId);
						usedRoleIds.add(roleId);
						break;
					}
				}
			}

			// Construire les embeds
			const embeds = [];
			const baseEmbed = {
				title: preview ? '🔍 Aperçu de la détection' : '✅ Détection effectuée',
				color: preview ? 0x3498DB : 0x00FF00,
				timestamp: new Date().toISOString(),
			};

			let currentEmbed = { ...baseEmbed, fields: [] };
			embeds.push(currentEmbed);

			const addField = (name, text) => {
				// Discord limits: 1024 characters per field value, 6000 total across all embeds in a message
				const lines = text.split('\n');
				let currentFieldValue = '';
				let isFirstField = true;

				for (const line of lines) {
					if (!line) continue;
					if ((currentFieldValue + line).length > 1000) {
						currentEmbed.fields.push({
							name: isFirstField ? name : name + ' (suite)',
							value: currentFieldValue
						});
						currentFieldValue = '';
						isFirstField = false;

						// Vérifier si l'embed actuel est trop plein (limite de 25 champs ou ~5000 caractères pour être sûr)
						if (currentEmbed.fields.length >= 20) {
							currentEmbed = { ...baseEmbed, fields: [] };
							embeds.push(currentEmbed);
						}
					}
					currentFieldValue += line + '\n';
				}

				if (currentFieldValue) {
					currentEmbed.fields.push({
						name: isFirstField ? name : name + ' (suite)',
						value: currentFieldValue
					});
				}
			};

			// Ajouter les correspondances trouvées
			if (matches.length > 0) {
				let matchesText = '';
				for (const match of matches) {
					matchesText += `• <#${match.channel.id}> ↔ <@&${match.role.id}>\n`;
				}
				addField(`🆕 Nouvelles associations trouvées (${matches.length})`, matchesText);
			}
			else {
				currentEmbed.fields.push({
					name: '🆕 Nouvelles associations',
					value: 'Aucune nouvelle association trouvée.',
				});
			}

			// Ajouter les éléments déjà suivis
			if (alreadyTracked.length > 0) {
				let trackedText = '';
				for (const item of alreadyTracked) {
					trackedText += `• <#${item.channel.id}>`;
					if (item.role) {
						trackedText += ` ↔ <@&${item.role.id}>`;
					}
					trackedText += '\n';
				}
				addField(`📋 Déjà enregistrés (${alreadyTracked.length})`, trackedText);
			}

			// Limiter à 10 embeds (limite Discord par message)
			const finalEmbeds = embeds.slice(0, 10);


			// Si mode preview, ajouter les instructions et un bouton de confirmation
			if (preview) {
				const firstEmbed = finalEmbeds[0];
				firstEmbed.description = matches.length > 0
					? `**${matches.length}** association(s) prête(s) à être ajoutée(s).`
					: 'Aucune nouvelle association à ajouter. Les noms des rôles et salons ne correspondent pas ou sont déjà enregistrés.';

				firstEmbed.footer = {
					text: '💡 La détection compare les noms en ignorant la casse, les accents et les emojis',
				};


				// Si des correspondances ont été trouvées, ajouter un bouton pour confirmer
				if (matches.length > 0) {
					const confirmButton = new ButtonBuilder()
						.setCustomId('detect_confirm')
						.setLabel('Appliquer les changements')
						.setStyle(ButtonStyle.Success)
						.setEmoji('✅');

					const cancelButton = new ButtonBuilder()
						.setCustomId('detect_cancel')
						.setLabel('Annuler')
						.setStyle(ButtonStyle.Secondary)
						.setEmoji('❌');

					const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

					const response = await interaction.editReply({ embeds: finalEmbeds, components: [row] });

					// Créer un collector pour les boutons
					const collector = response.createMessageComponentCollector({
						filter: (i) => i.user.id === interaction.user.id,
						time: 60000, // 60 secondes
					});

					collector.on('collect', async (i) => {
						if (i.customId === 'detect_confirm') {
							// Appliquer les changements
							let addedCount = 0;
							const currentChannelsData = getChannelsData();

							for (const match of matches) {
								const data = {
									name: match.cleanName,
									nameSimplified: toKebabCase(match.cleanName),
									idChannel: match.channel.id,
									idRole: match.role.id,
									emoji: match.emoji,
									guildId: guild.id, // Ajout du guildId
								};

								currentChannelsData[match.channel.id] = data;
								addedCount++;
							}

							if (addedCount > 0) {
								setChannelsData(currentChannelsData);

								// Mettre à jour le menu de sélection de rôles s'il existe
								updateRoleSelectionChannel(guild)
									.then(success => {
										if (success) {
											logger.info('Le menu de sélection a été mis à jour suite à la détection.');
										}
									})
									.catch(error => {
										logger.error('Erreur lors de la mise à jour du menu de sélection:', error);
									});
							}

							// Mettre à jour l'embed
							const resultEmbed = {
								title: '✅ Détection effectuée',
								color: 0x00FF00,
								description: `**${addedCount}** association(s) ajoutée(s) avec succès au fichier channels.json !`,
								timestamp: new Date().toISOString(),
							};

							await i.update({ embeds: [resultEmbed], components: [] });
						}
						else if (i.customId === 'detect_cancel') {
							const cancelEmbed = {
								title: '❌ Détection annulée',
								color: 0xFF0000,
								description: 'Aucune modification n\'a été effectuée.',
								timestamp: new Date().toISOString(),
							};

							await i.update({ embeds: [cancelEmbed], components: [] });
						}
					});

					collector.on('end', async (collected, reason) => {
						if (reason === 'time' && collected.size === 0) {
							const timeoutEmbed = {
								title: '⏰ Délai expiré',
								color: 0xFFA500,
								description: 'Le délai de confirmation a expiré. Aucune modification n\'a été effectuée.',
								timestamp: new Date().toISOString(),
							};

							await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
						}
					});

					return;
				}
			}
			else {
				// Appliquer les changements directement (mode sans preview)
				let addedCount = 0;

				for (const match of matches) {
					const data = {
						name: match.cleanName,
						nameSimplified: toKebabCase(match.cleanName),
						idChannel: match.channel.id,
						idRole: match.role.id,
						emoji: match.emoji,
						guildId: guild.id, // Ajout du guildId
					};

					channelsData[match.channel.id] = data;
					addedCount++;
				}

				if (addedCount > 0) {
					setChannelsData(channelsData);

					// Mettre à jour le menu de sélection de rôles s'il existe
					updateRoleSelectionChannel(guild)
						.then(success => {
							if (success) {
								logger.info('Le menu de sélection a été mis à jour suite à la détection.');
							}
						})
						.catch(error => {
							logger.error('Erreur lors de la mise à jour du menu de sélection:', error);
						});

					finalEmbeds[0].description = `**${addedCount}** association(s) ajoutée(s) avec succès !`;
				}
				else {
					finalEmbeds[0].description = 'Aucune nouvelle association à ajouter.';
				}
			}

			return interaction.editReply({ embeds: finalEmbeds });
		}
		catch (error) {
			logger.error('Erreur lors de la détection:', error);
			return interaction.editReply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Une erreur est survenue lors de la détection.',
						color: 0xFF0000,
					},
				],
			});
		}
	},
};
