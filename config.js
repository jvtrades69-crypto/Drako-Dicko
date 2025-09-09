// config.js — works for JV and Drako bots (ESM default export)

function pick(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && `${v}`.trim() !== '') return v.trim();
  }
  return undefined;
}

const config = {
  // Token / ids
  token:                  pick('DRAKO_DISCORD_TOKEN', 'DISCORD_TOKEN'),
  applicationId:          pick('DRAKO_APPLICATION_ID', 'APPLICATION_ID'),
  guildId:                pick('DRAKO_GUILD_ID', 'GUILD_ID'),
  ownerId:                pick('DRAKO_OWNER_ID', 'OWNER_ID'),

  // Roles / channels
  traderRoleId:           pick('DRAKO_TRADER_ROLE_ID', 'TRADER_ROLE_ID'),
  currentTradesChannelId: pick('DRAKO_CURRENT_TRADES_CHANNEL_ID', 'CURRENT_TRADES_CHANNEL_ID'),

  // Optional: separate DB path if you need it elsewhere
  dbPath:                 pick('DRAKO_DB_PATH', 'DB_PATH'),
};

export default config;
