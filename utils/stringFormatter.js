/**
 * Convertit une chaîne de caractères en kebab case et en minuscule.
 * @param {string} str - La chaîne de caractères à convertir.
 * @returns {string} La chaîne de caractères en kebab case et en minuscule.
 */
function toKebabCase(str) {
	return str
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

module.exports = { toKebabCase };
