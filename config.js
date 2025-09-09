// config.js — shared config for this service (Drako clone)
// Reads both generic and DRAKO_ envs so the same index can serve either style.

function req(key) {
  const v = process.env[key];
  if (!v || String(v).trim() === '') {
    throw new Error(`Missing required env: ${key}`);
  }
  return v.trim();
}

const cfg = {
  // ---- Drako (this service)
  drako: {
    token:                req('DRAKO_DISCORD_TOKEN'),
    applicationId:        req('DRAKO_APPLICATION_ID'),
    guildId:              req('DRAKO_GUILD_ID'),
    dbPath:               req('DRAKO_DB_PATH'),
    currentTradesChannel: req('DRAKO_CURRENT_TRADES_CHANNEL_ID'),
    mentionRoleId:        req('DRAKO_MENTION_ROLE_ID'),    // role to ping on new posts (default for Drako)
    allowedRoleId:        req('DRAKO_ALLOWED_ROLE_ID'),    // who can use /drako
    traderRoleId:         req('DRAKO_TRADER_ROLE_ID'),     // used if you reference it in UI (unchanged behavior)
    ownerId:              req('DRAKO_OWNER_ID'),
  },

  // ---- Generic keys (kept if you later want to re-use this index in JV service too)
  // token:          process.env.DISCORD_TOKEN,
  // applicationId:  process.env.APPLICATION_ID,
  // guildId:        process.env.GUILD_ID,
  // dbPath:         process.env.DB_PATH,
  // currentTradesChannel: process.env.CURRENT_TRADES_CHANNEL_ID,
  // mentionRoleId:  process.env.TRADER_ROLE_ID || process.env.MENTION_ROLE_ID,
  // ownerId:        process.env.OWNER_ID,
};

export default cfg;