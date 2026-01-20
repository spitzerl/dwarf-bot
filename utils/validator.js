/**
 * Utility to validate and sanitize user inputs.
 */
module.exports = {
    /**
     * Sanitizes a string input.
     * @param {string} input
     * @returns {string}
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>\"\'\\]/g, ''); // Basic sanitization
    },

    /**
     * Validates Discord role/channel name length and format.
     * @param {string} name
     * @returns {boolean}
     */
    isValidDiscordName(name) {
        if (!name || typeof name !== 'string') return false;
        // Discord names are usually 1-100 chars
        return name.length >= 1 && name.length <= 100;
    },
};
