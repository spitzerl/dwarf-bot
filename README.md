![dwarf-thin](https://github.com/user-attachments/assets/eba9ec38-b607-4569-b142-e27d7eca48b7)

# Dwarf BOT
Discord bot made to manage channels, roles and events for a better user experience.

[Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=1331017569724924054)

---

## 🚀 Features

### 🛡️ Security & Access Control
- **Role-Based Access Control (RBAC)**: Centralized permission system for "Admin" and "Moderator" roles.
- **Input Validation**: Sanitization of all user inputs to prevent malicious naming or formatting.
- **Rate Limiting**: Cooldown system on management commands to prevent spam.

### 📋 Role & Channel Management
- **Automatic Setup**: Create a game role and its associated private text channel in one command.
- **Self-Service Roles**: Dynamic select menu allowing users to choose their own game roles.
- **Auto-Sync**: The role selection menu updates automatically when new games are added or removed.
- **Server Scanner**: `/detect` command to sync existing roles and channels with the bot's database.

### 🔍 Monitoring & Supervision
- **Structured Logging**: Professional logs using Winston with daily file rotation.
- **Local Logs**: Action logs sent to a dedicated channel (configurable per server).
- **Global Supervision**: Support for a master log channel (via Webhook) to monitor the bot across all servers.

---

## 🛠️ Installation

### 1. Clone the project
```bash
git clone https://github.com/spitzerl/dwarf-bot.git
cd dwarf-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configuration
Duplicate the `.env.example` file to `.env` and fill in your credentials:

| Variable | Description |
| :--- | :--- |
| `TOKEN` | Your Discord Bot Token |
| `CLIENT_ID` | Your Application (Client) ID |
| `GUILD_ID` | ID of your primary/dev server (for fast command testing) |
| `MASTER_LOG_WEBHOOK_URL` | (Optional) Webhook URL for global supervision |
| `MASTER_LOG_CHANNEL_ID` | (Optional) Channel ID for global logs if webhook is not used |

---

## 🛰️ Deployment

### Register Commands
- **Local (Fast)**: `npm run deploy-commands` (Registers commands to your `GUILD_ID` only).
- **Global**: `npm run deploy-global` (Registers commands everywhere. *Can take up to 1 hour to propagate*).

### Run the Bot
- **Development**: `npm run dev` (Uses `node index.js`)
- **Production**: `npm start`

---

## 🎮 Commands

| Command | Category | Description |
| :--- | :--- | :--- |
| `/create` | Management | Creates a text channel and its associated role. |
| `/delete` | Management | Deletes a channel and its role. |
| `/role_channel create` | Management | Creates a selection channel. |
| `/role_channel edit` | Management | Edits association details (Modal popup). |
| `/role_channel associate` | Management | Manually links a channel and a role. |
| `/role_channel list` | Management | Lists all role-channel associations. |
| `/role_channel sync` | Management | Bulk syncs names to `Emoji・Name` format. |
| `/role_channel update` | Management | Refreshes the role selection menu. |
| `/detect` | Management | Scans and maps existing roles/channels. |
| `/check roles` | Management | Finds roles without associated channels. |
| `/check channels` | Management | Finds channels without associated roles. |
| `/logs` | Management | Configures the server's log channel. |
| `/reload` | System | Reloads a command file. |
| `/ping` | Common | Checks bot latency. |
| `/server` | Common | Server information. |
| `/user` | Common | User information. |

---

## 📂 Project Structure
- `commands/`: Slash commands grouped by category.
- `events/`: Discord event handlers (ready, interactions, etc.).
- `utils/`: Core logic (permissions, logging, validation, JSON management).
- `data/`: Persistent storage for guild and channel mappings.
- `logs/`: Rotating application log files.
