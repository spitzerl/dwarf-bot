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

// Récupération des événements
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Connexion du client à Discord
client.login(token).catch((error) => {
	console.error("Échec lors de la tentative de connexion :", error);
});
