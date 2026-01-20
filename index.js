const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

// Log du démarrage
logger.info('========================================');
logger.info('Démarrage du bot Discord Dwarf');
logger.info(`Date: ${new Date().toISOString()}`);
logger.info('========================================');

require('dotenv').config(); // Charge les variables d'environnement depuis le fichier .env

// Récupération du token dans les variables d'environnement
const token = process.env.TOKEN;

logger.info('Vérification des variables d\'environnement...');
logger.info(`TOKEN présent: ${token ? 'OUI (masqué)' : 'NON'}`);
logger.info(`CLIENT_ID présent: ${process.env.CLIENT_ID ? 'OUI' : 'NON'}`);
logger.info(`GUILD_ID présent: ${process.env.GUILD_ID ? 'OUI' : 'NON (optionnel)'}`);

// Vérification que le token a bien été défini
if (!token) {
	logger.error('ERREUR : Le token du bot est introuvable. Assurez-vous que votre fichier .env contient une ligne TOKEN=LE_TOKEN_ICI');
	logger.error('Dans Dokploy, vérifiez que la variable d\'environnement TOKEN est bien configurée.');
	process.exit(1); // Quitte le processus avec un code d'erreur
}

console.log('Création de l\'instance du client Discord...');

// Création d'une nouvelle instance du client Discord
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
	], // Intent de base, suffisant pour les commandes slash
});

// Création d'une collection pour les commandes
client.commands = new Collection();

logger.info('Chargement des commandes...');
// Récupération des commandes
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

let commandCount = 0;
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			commandCount++;
			logger.info(`  ✓ Commande chargée: ${command.data.name}`);
		}
		else {
			logger.warn(`  ⚠ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
logger.info(`Total: ${commandCount} commande(s) chargée(s)`);

console.log('Chargement des événements...');
// Récupération des événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

let eventCount = 0;
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
	eventCount++;
	console.log(`  ✓ Événement chargé: ${event.name}`);
}
console.log(`Total: ${eventCount} événement(s) chargé(s)`);

logger.info('========================================');
logger.info('Tentative de connexion à Discord...');
logger.info('========================================');

// Connexion du client à Discord
client.login(token)
	.then(() => {
		logger.info('Connexion à Discord initiée avec succès');
	})
	.catch((error) => {
		logger.error('========================================');
		logger.error('ERREUR: Échec lors de la tentative de connexion à Discord');
		logger.error('========================================');
		logger.error(`Détails de l'erreur: ${error}`);
		logger.error(`Code d'erreur: ${error.code}`);
		logger.error(`Message: ${error.message}`);

		if (error.code === 'TOKEN_INVALID') {
			logger.error('\n⚠ Le token fourni est invalide ou a expiré.');
			logger.error('Veuillez vérifier le token dans votre configuration Dokploy.');
		}

		logger.error('========================================');
		process.exit(1);
	});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
	logger.error('ERREUR NON GÉRÉE (unhandledRejection):');
	logger.error(error);
});

process.on('uncaughtException', (error) => {
	logger.error('EXCEPTION NON CAPTURÉE (uncaughtException):');
	logger.error(error);
	process.exit(1);
});

// Empêcher le processus de se terminer immédiatement
logger.info('Le bot est maintenant en attente de connexion à Discord...');
logger.info('Ce processus restera actif jusqu\'à ce que le bot soit arrêté manuellement.');
