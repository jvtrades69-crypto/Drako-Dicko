// config.js
import 'dotenv/config';

export default {
  applicationId: process.env.APPLICATION_ID,
  guildId: process.env.GUILD_ID,
  token: process.env.DISCORD_TOKEN,

  // Channels
  currentTradesChannelId: process.env.CURRENT_TRADES_CHANNEL_ID,
  signalsChannelId: process.env.SIGNALS_CHANNEL_ID || null, // optional, you said it's unused

  // Storage
  dbPath: process.env.DB_PATH || './signals.json',

  // Mentions / ownership
  ownerId: process.env.OWNER_ID,
  traderRoleId: process.env.TRADER_ROLE_ID, // role to @mention when a trade is posted

  // Permissions
  commandAllowedRoleId: process.env.COMMAND_ALLOWED_ROLE_ID,
  commandAllowedExtraRoleIds: (process.env.COMMAND_ALLOWED_EXTRA_ROLE_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  adminUserIds: (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
};
