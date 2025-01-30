/**
 * Convert a string to kebab case and in lowercase.
 * @param {string} str: String to convert.
 * @returns {string}: Output string.
 */
function toKebabCase(str) {
	return str
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

module.exports = { toKebabCase };
