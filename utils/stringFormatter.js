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
		if (potential.length <= 8) { // Augmenté un peu pour certains emojis complexes
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

/**
 * Convertit une chaîne de caractères en kebab case et en minuscule.
 * @param {string} str - La chaîne de caractères à convertir.
 * @returns {string} La chaîne de caractères en kebab case et en minuscule.
 */
function toKebabCase(str) {
	if (!str) return '';
	return str
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

module.exports = { toKebabCase, normalizeForComparison, extractEmoji, extractCleanName };
