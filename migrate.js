const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, 'data');
const channelsPath = path.join(dataDir, 'channels.json');
const guildsPath = path.join(dataDir, 'guilds.json');

async function migrate() {
    console.log('--- Starting Migration ---');

    if (!fs.existsSync(channelsPath)) {
        console.log('No channels.json found. Skipping.');
        return;
    }

    const channelsData = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
    const guildsData = fs.existsSync(guildsPath) ? JSON.parse(fs.readFileSync(guildsPath, 'utf8')) : {};

    let migratedCount = 0;
    let manualFixCount = 0;

    for (const [id, entry] of Object.entries(channelsData)) {
        if (!entry.guildId) {
            console.log(`Migrating entry: ${entry.name || id}...`);

            // Try 1: Check if this channel is a role selection channel in guilds.json
            let foundGuildId = null;
            for (const [guildId, guildInfo] of Object.entries(guildsData)) {
                if (guildInfo.roleSelectionChannelId === id) {
                    foundGuildId = guildId;
                    break;
                }
            }

            // Try 2: If we still don't have it, and env has a GUILD_ID, maybe it belongs there?
            // (Careful here, but often bots are only in one guild early on)
            if (!foundGuildId && process.env.GUILD_ID) {
                foundGuildId = process.env.GUILD_ID;
                console.log(`  -> Using GUILD_ID from env for ${entry.name}`);
            }

            if (foundGuildId) {
                entry.guildId = foundGuildId;
                migratedCount++;
                console.log(`  ✓ Assigned to guild: ${foundGuildId}`);
            } else {
                manualFixCount++;
                console.log(`  ⚠ Could not determine guildId for ${entry.name || id}.`);
            }
        }
    }

    if (migratedCount > 0) {
        fs.writeFileSync(channelsPath, JSON.stringify(channelsData, null, 2));
        console.log(`--- Migration Complete: ${migratedCount} entries updated ---`);
    } else {
        console.log('--- No entries needed migration ---');
    }

    if (manualFixCount > 0) {
        console.log(`--- ⚠ WARNING: ${manualFixCount} entries still missing guildId. ---`);
    }
}

migrate().catch(console.error);
