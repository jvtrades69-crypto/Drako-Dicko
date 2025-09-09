// config.js — Drako bot
function need(key) {
  const v = process.env[key];
  if (!v || String(v).trim() === '') {
    throw new Error(`Missing required env: ${key}`);
  }
  return v.trim();
}

// Prefer DRAKO_*; fall back to generic keys if present
const cfg = {
  token:               process.env.DRAKO_DISCORD_TOKEN || need('DRAKO_DISCORD_TOKEN'),
  applicationId:       process.env.DRAKO_APPLICATION_ID || need('DRAKO_APPLICATION_ID'),
  guildId:             process.env.DRAKO_GUILD_ID       || need('DRAKO_GUILD_ID'),
  ownerId:             process.env.DRAKO_OWNER_ID        || need('DRAKO_OWNER_ID'),
  traderRoleId:        process.env.DRAKO_TRADER_ROLE_ID  || need('DRAKO_TRADER_ROLE_ID'),
  currentTradesChannelId:
                       process.env.DRAKO_CURRENT_TRADES_CHANNEL_ID || need('DRAKO_CURRENT_TRADES_CHANNEL_ID'),
  dbPath:              (process.env.DRAKO_DB_PATH || process.env.DB_PATH || './drako-signals.json').trim(),
};

export default cfg;