const { PermissionsBitField } = require('discord.js');

/**
 * Checks if a member has administrative privileges.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
const isAdmin = (member) => {
    if (!member) return false;
    // Check for Administrator permission or a specific "Admin" role
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
};

/**
 * Checks if a member has moderator privileges.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
const isModerator = (member) => {
    if (!member) return false;
    return isAdmin(member) ||
        member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
        member.roles.cache.some(role => role.name.toLowerCase() === 'modo' || role.name.toLowerCase() === 'moderateur');
};

module.exports = {
    isAdmin,
    isModerator,
};
