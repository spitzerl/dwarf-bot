const { Events } = require('discord.js');
const { getChannelsData } = require('../utils/utils');
const logger = require('../utils/logger');
const { logAction } = require('../utils/discordLogger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Vérifier s'il s'agit d'une interaction avec un menu de sélection
		if (!interaction.isStringSelectMenu()) return;

		// Vérifier s'il s'agit de notre menu de sélection de rôles
		if (interaction.customId === 'select_game_roles') {
			try {
				// Différer la réponse pour avoir plus de temps de traitement
				await interaction.deferReply({ ephemeral: true });

				// Récupérer les valeurs sélectionnées
				const selectedValues = interaction.values;
				logger.info(`Utilisateur: ${interaction.user.tag} a sélectionné: ${selectedValues.join(', ')}`);

				// Si l'utilisateur n'est pas un membre du serveur, on ne peut pas gérer ses rôles
				if (!interaction.member) {
					return await interaction.editReply({ content: 'Impossible de modifier vos rôles: vous n\'êtes pas membre de ce serveur.' });
				}

				// Récupérer les données des channels depuis le fichier JSON
				const channelsData = getChannelsData();

				// Récupérer tous les rôles de jeux existants
				const gameRoles = new Map(); // Map pour stocker idRole -> channelEntry
				const selectedRoleIds = []; // Liste des IDs de rôles sélectionnés

				// Parcourir toutes les entrées pour recenser les rôles existants
				for (const entry of Object.values(channelsData)) {
					// Filtrer par guildId (si présent)
					if (entry.guildId && entry.guildId !== interaction.guildId) continue;

					if (entry.idRole && !entry.selectChannel) {
						gameRoles.set(entry.idRole, entry);
					}
				}

				// Pour chaque valeur sélectionnée (nameSimplified)
				const rolesAdded = [];
				const rolesRemoved = [];
				const rolesMissing = [];

				// Ajouter les rôles sélectionnés
				for (const value of selectedValues) {
					if (value === 'no-games') continue; // Ignorer l'option par défaut

					// Trouver l'entrée qui correspond au jeu sélectionné
					const channelEntry = Object.values(channelsData).find(
						(entry) => entry.nameSimplified === value,
					);

					if (channelEntry && channelEntry.idRole) {
						// Mémoriser cet ID de rôle comme sélectionné
						selectedRoleIds.push(channelEntry.idRole);

						try {
							// Vérifier que le rôle existe encore sur le serveur
							const role = interaction.guild.roles.cache.get(channelEntry.idRole);
							if (role) {
								// Ajouter le rôle uniquement si l'utilisateur ne l'a pas déjà
								if (!interaction.member.roles.cache.has(role.id)) {
									await interaction.member.roles.add(role);
									rolesAdded.push(role.name);
								}
							}
							else {
								rolesMissing.push(channelEntry.name || value);
							}
						}
						catch (error) {
							logger.error(`Erreur lors de l'ajout du rôle ${channelEntry.idRole}:`, error);
							rolesMissing.push(channelEntry.name || value);
						}
					}
					else {
						rolesMissing.push(value);
					}
				}

				// Retirer les rôles de jeux que l'utilisateur possède mais qui ne sont plus sélectionnés
				logger.info(`Vérification des rôles à retirer pour ${interaction.user.tag}...`);

				// Récupérer les rôles actuels de l'utilisateur et les convertir en array pour faciliter le debug
				const userRoles = Array.from(interaction.member.roles.cache.keys());
				logger.debug(`Rôles actuels: ${userRoles.join(', ')}`);
				logger.debug(`Rôles sélectionnés: ${selectedRoleIds.join(', ')}`);

				// Traiter chaque rôle de jeu
				for (const roleId of gameRoles.keys()) {
					// Si l'utilisateur a ce rôle mais qu'il n'est pas dans la sélection actuelle
					if (interaction.member.roles.cache.has(roleId) && !selectedRoleIds.includes(roleId)) {
						const role = interaction.guild.roles.cache.get(roleId);
						if (role) {
							logger.info(`Tentative de retrait du rôle ${role.name} (${roleId}) pour ${interaction.user.tag}`);

							try {
								// Retirer le rôle et attendre que l'opération se termine
								await interaction.member.roles.remove(roleId);
								logger.info(`✅ Rôle ${role.name} retiré avec succès`);
								rolesRemoved.push(role.name);
							}
							catch (roleError) {
								logger.error(`❌ Erreur lors du retrait du rôle ${role.name}:`, roleError);
							}
						}
						else {
							logger.warn(`Rôle ${roleId} introuvable dans le serveur`);
						}
					}
				}

				// Générer le message de réponse
				let replyMessage = '';
				if (rolesAdded.length > 0) {
					replyMessage += `✅ Rôles ajoutés: ${rolesAdded.join(', ')}\n`;
				}
				if (rolesRemoved.length > 0) {
					replyMessage += `❌ Rôles retirés: ${rolesRemoved.join(', ')}\n`;
				}
				if (rolesMissing.length > 0) {
					replyMessage += `⚠️ Rôles non trouvés: ${rolesMissing.join(', ')}\n`;
					replyMessage += 'Ces jeux n\'ont pas de rôles associés. Demandez à un admin de les créer.';
				}

				// Si aucun changement n'a été effectué
				if (replyMessage === '') {
					replyMessage = 'Aucun changement effectué.';
				}

				// Répondre à l'interaction avec un message éphémère
				await interaction.editReply({
					content: replyMessage,
				});

				// Rafraîchir les rôles du membre après les modifications
				try {
					await interaction.member.fetch(true);
					logger.info(`Rôles mis à jour pour ${interaction.user.tag}`);
				}
				catch (fetchError) {
					logger.error('Erreur lors du rafraîchissement des rôles:', fetchError);
				}
			}
			catch (error) {
				logger.error('Erreur lors du traitement de la sélection de rôle:', error);
				if (interaction.deferred) {
					await interaction.editReply({
						content: 'Une erreur est survenue lors du traitement de votre sélection.',
					});
				}
				else {
					await interaction.reply({
						content: 'Une erreur est survenue lors du traitement de votre sélection.',
						ephemeral: true,
					});
				}
			}
		}
	},
};