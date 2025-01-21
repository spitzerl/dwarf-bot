// Importation des classes nécessaires de discord.js
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config(); // Charge les variables d'environnement depuis le fichier .env

// Récupération du token dans les variables d'environnement
const token = process.env.TOKEN;

// Vérification que le token a bien été défini
if (!token) {
	console.error("ERREUR : Le token du bot est introuvable. Assurez-vous que votre fichier .env contient une ligne TOKEN=LE_TOKEN_ICI");
	process.exit(1); // Quitte le processus avec un code d'erreur
}

// Création d'une nouvelle instance du client Discord
const client = new Client({
	intents: [GatewayIntentBits.Guilds], // Ajoutez d'autres intents si nécessaire
});

// Création d'une collection pour les commandes
client.commands = new Collection();

// Récupération des commandes
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ("data" in command && "execute" in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Événement déclenché lorsque le client est prêt
client.once(Events.ClientReady, () => {
	console.log(`Prêt ! Connecté en tant que ${client.user.tag}`);
});

// Événement déclenché lorsqu'un utilisateur envoie un message
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral });
		}
	}
});

// Connexion du client à Discord
client.login(token).catch((error) => {
	console.error("Échec lors de la tentative de connexion :", error);
});
