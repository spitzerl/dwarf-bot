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
| `/role_channel` | Management | Manages the self-service role selection menu. |
| `/detect` | Management | Scans and maps existing roles/channels. |
| `/logs` | Management | Configures the log channel for the current server. |
| `/reload` | System | Reloads a specific command file. |
| `/ping` | Common | Checks the bot's latency. |
| `/server` | Common | Displays information about the server. |
| `/user` | Common | Displays information about a user. |

---

## 📂 Project Structure
- `commands/`: Slash commands grouped by category.
- `events/`: Discord event handlers (ready, interactions, etc.).
- `utils/`: Core logic (permissions, logging, validation, JSON management).
- `data/`: Persistent storage for guild and channel mappings.
- `logs/`: Rotating application log files.
