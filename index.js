// Importation des classes nécessaires de discord.js
const { Client, Events, GatewayIntentBits } = require("discord.js");
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

// Événement déclenché lorsque le client est prêt
client.once(Events.ClientReady, () => {
	console.log(`Prêt ! Connecté en tant que ${client.user.tag}`);
});

// Connexion du client à Discord
client.login(token).catch((error) => {
	console.error("Échec lors de la tentative de connexion :", error);
});
