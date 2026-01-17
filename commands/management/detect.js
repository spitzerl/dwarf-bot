const {
	SlashCommandBuilder,
	PermissionsBitField,
} = require('discord.js');
const { getChannelsData, setChannelsData, updateRoleSelectionChannel } = require('../../utils/utils');
const { toKebabCase } = require('../../utils/stringFormatter');

/**
 * Normalise une chaîne pour la comparaison (ignore la casse et les caractères spéciaux)
 * @param {string} str - La chaîne à normaliser
 * @returns {string} - La chaîne normalisée
 */
function normalizeForComparison(str) {
	if (!str) return '';

	// Retirer les emojis et le séparateur ・ s'il y en a
	let cleaned = str;

	// Pattern pour détecter les emojis suivis d'un séparateur
	const emojiSeparatorPattern = /^.+・/;
	if (emojiSeparatorPattern.test(cleaned)) {
		cleaned = cleaned.replace(emojiSeparatorPattern, '');
	}

	// Convertir en minuscules et retirer les caractères spéciaux
	return cleaned
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Retirer les accents
		.replace(/[^a-z0-9]/g, ''); // Ne garder que les lettres et chiffres
}

/**
 * Extrait l'emoji du nom si présent (format: emoji・nom)
 * @param {string} name - Le nom potentiellement avec emoji
 * @returns {string|null} - L'emoji ou null
 */
function extractEmoji(name) {
	if (!name) return null;

	const match = /^(.+)・/.exec(name);
	if (match && match[1]) {
		// Vérifier si c'est un emoji (généralement court, 1-4 caractères avec emojis)
		const potential = match[1].trim();
		if (potential.length <= 4) {
			return potential;
		}
	}
	return null;
}

/**
 * Extrait le nom propre (sans emoji ni séparateur)
 * @param {string} fullName - Le nom complet
 * @returns {string} - Le nom nettoyé
 */
function extractCleanName(fullName) {
	if (!fullName) return '';

	// Pattern pour détecter les emojis suivis d'un séparateur
	const emojiSeparatorPattern = /^.+・(.+)$/;
	const match = emojiSeparatorPattern.exec(fullName);

	if (match && match[1]) {
		return match[1].trim();
	}

	return fullName.trim();
}

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
		// Vérification des autorisations
		if (
			!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) ||
			!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)
		) {
			return interaction.reply({
				embeds: [
					{
						title: 'Erreur',
						description: 'Vous n\'avez pas les autorisations nécessaires pour exécuter cette commande.',
						color: 0xFF0000,
					},
				],
				ephemeral: true,
			});
		}

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
				if (data.idChannel) usedChannelIds.add(data.idChannel);
				if (data.idRole) usedRoleIds.add(data.idRole);
			}

			// Parcourir les salons
			for (const [channelId, channel] of textChannels) {
				// Ignorer si déjà suivi
				if (usedChannelIds.has(channelId)) {
					const existingData = Object.values(channelsData).find(d => d.idChannel === channelId);
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

			// Construire la réponse
			const embed = {
				title: preview ? '🔍 Aperçu de la détection' : '✅ Détection effectuée',
				color: preview ? 0x3498DB : 0x00FF00,
				fields: [],
				timestamp: new Date().toISOString(),
			};

			// Ajouter les correspondances trouvées
			if (matches.length > 0) {
				let matchesText = '';
				for (const match of matches) {
					matchesText += `• <#${match.channel.id}> ↔ <@&${match.role.id}>\n`;
				}

				embed.fields.push({
					name: `🆕 Nouvelles associations trouvées (${matches.length})`,
					value: matchesText.slice(0, 1024) || 'Aucune',
				});
			}
			else {
				embed.fields.push({
					name: '🆕 Nouvelles associations',
					value: 'Aucune nouvelle association trouvée.',
				});
			}

			// Ajouter les éléments déjà suivis
			if (alreadyTracked.length > 0) {
				let trackedText = '';
				for (const item of alreadyTracked.slice(0, 10)) { // Limiter à 10
					trackedText += `• <#${item.channel.id}>`;
					if (item.role) {
						trackedText += ` ↔ <@&${item.role.id}>`;
					}
					trackedText += '\n';
				}
				if (alreadyTracked.length > 10) {
					trackedText += `... et ${alreadyTracked.length - 10} autres`;
				}

				embed.fields.push({
					name: `📋 Déjà enregistrés (${alreadyTracked.length})`,
					value: trackedText || 'Aucun',
				});
			}

			// Si mode preview, ajouter les instructions
			if (preview) {
				embed.description = matches.length > 0
					? `**${matches.length}** association(s) prête(s) à être ajoutée(s).\n\nUtilisez \`/detect preview:False\` pour appliquer les changements.`
					: 'Aucune nouvelle association à ajouter. Les noms des rôles et salons ne correspondent pas ou sont déjà enregistrés.';

				embed.footer = {
					text: '💡 La détection compare les noms en ignorant la casse, les accents et les emojis',
				};
			}
			else {
				// Appliquer les changements
				let addedCount = 0;

				for (const match of matches) {
					const data = {
						name: match.cleanName,
						nameSimplified: toKebabCase(match.cleanName),
						idChannel: match.channel.id,
						idRole: match.role.id,
						emoji: match.emoji,
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
								console.log('Le menu de sélection a été mis à jour suite à la détection.');
							}
						})
						.catch(error => {
							console.error('Erreur lors de la mise à jour du menu de sélection:', error);
						});

					embed.description = `**${addedCount}** association(s) ajoutée(s) avec succès !`;
				}
				else {
					embed.description = 'Aucune nouvelle association à ajouter.';
				}
			}

			return interaction.editReply({ embeds: [embed] });
		}
		catch (error) {
			console.error('Erreur lors de la détection:', error);
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
