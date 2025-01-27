const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { getChannelsData, setChannelsData } = require("../../utils/utils");
const { toKebabCase } = require("../../utils/stringFormatter");

module.exports = {
  category: "management",
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Supprimer un channel et son rôle associé")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Nom du channel et du rôle à supprimer")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Assignation des variables
    const name = interaction.options.getString("name");
    const guild = interaction.guild;

    // Vérification des autorisations
    if (
      !interaction.memberPermissions.has("MANAGE_CHANNELS") ||
      !interaction.memberPermissions.has("MANAGE_ROLES")
    ) {
      return interaction.reply({
        content:
          "Vous n'avez pas les autorisations nécessaires pour exécuter cette commande.",
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
        content: "Ce channel n'existe pas.",
        flags: 64,
      });
    }

    try {
      // Suppression du channel
      const channel = guild.channels.cache.get(channelDataToDelete.idChannel);
      if (channel) await channel.delete();

      // Suppression du rôle
      const role = guild.roles.cache.get(channelDataToDelete.idRole);
      if (role) await role.delete();

      // Mise à jour des données des channels
      delete channelsData[channelDataToDelete.idChannel];
      setChannelsData(channelsData);

      interaction.reply({
        content: `Channel et rôle supprimés avec succès !`,
        flags: 64,
      });
    } catch (error) {
      console.error(error);
      interaction.reply({
        content: "Erreur lors de la suppression du channel et du rôle.",
        flags: 64,
      });
    }
  },
};
