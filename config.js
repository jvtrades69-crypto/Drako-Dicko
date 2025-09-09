// config.js — Drako bot configuration

function need(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

const config = {
  // slash command name for this bot
  commandName: 'drako',

  // Discord app + token + guild
  applicationId: need('DRAKO_APPLICATION_ID'),
  token: need('DRAKO_DISCORD_TOKEN'),
  guildId: need('DRAKO_GUILD_ID'),

  // IDs
  ownerId: need('DRAKO_OWNER_ID'),

  // who is allowed to use /drako
  allowedRoleId: need('DRAKO_ALLOWED_ROLE_ID'),

  // which role to @ by default on every signal (you can still add extra in the command)
  mentionRoleId: need('DRAKO_MENTION_ROLE_ID'),

  // channel to post the Current Active Trades summary
  currentTradesChannelId: need('DRAKO_CURRENT_TRADES_CHANNEL_ID'),

  // per-bot JSON DB
  dbPath: need('DRAKO_DB_PATH'),
};

export default config;