// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';

// ---------- ENV ----------
const REQUIRED = [
  'DISCORD_TOKEN',
  'APPLICATION_ID',
  'GUILD_ID',
  'CURRENT_TRADES_CHANNEL_ID',
  'DB_PATH',
  'OWNER_ID',
  'COMMAND_ALLOWED_ROLE_ID'
];
for (const k of REQUIRED) {
  if (!process.env[k] || String(process.env[k]).trim() === '') {
    console.error(`[ENV] Missing ${k}`);
  }
}

const TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.GUILD_ID;
const CURRENT_TRADES_CHANNEL_ID = process.env.CURRENT_TRADES_CHANNEL_ID;
const DB_PATH = process.env.DB_PATH || './signals.json';
const OWNER_ID = process.env.OWNER_ID;
const TRADER_ROLE_ID = process.env.TRADER_ROLE_ID; // default mention role (optional)
const COMMAND_ALLOWED_ROLE_ID = process.env.COMMAND_ALLOWED_ROLE_ID;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ---------- CLIENT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// ---------- DB ----------
/**
 * Shape:
 * {
 *   summaryMessageId: "123" | null,
 *   trades: [{
 *     id, asset, direction, entry, sl, tp1, tp2, tp3, reason,
 *     authorId, messageId, channelId, createdAt, status
 *   }]
 * }
 */
async function loadDB() {
  if (!(await fs.pathExists(DB_PATH))) {
    await fs.outputJson(DB_PATH, { summaryMessageId: null, trades: [] }, { spaces: 2 });
  }
  return fs.readJson(DB_PATH);
}
async function saveDB(db) {
  await fs.outputJson(DB_PATH, db, { spaces: 2 });
}

// ---------- PERMISSIONS ----------
function canUse(interaction) {
  if (!interaction?.inGuild()) return false;
  if (interaction.user.id === OWNER_ID) return true;
  if (ADMIN_USER_IDS.includes(interaction.user.id)) return true;

  const member = interaction.member;
  if (!member) return false;
  // Has the allowed role?
  return member.roles?.cache?.has(COMMAND_ALLOWED_ROLE_ID);
}

async function guard(interaction) {
  if (canUse(interaction)) return true;
  await interaction.reply({
    content: "You don’t have permission to use this command.",
    ephemeral: true
  });
  return false;
}

// ---------- HELPERS ----------
function line(label, value) {
  return value ? `**${label}** ${value}` : '';
}
function safeFloat(n) {
  if (n === undefined || n === null || n === '') return undefined;
  const f = Number(n);
  return Number.isFinite(f) ? f : undefined;
}

function buildSignalEmbed(payload, author) {
  const {
    asset, direction, entry, sl, tp1, tp2, tp3, reason
  } = payload;

  const color = direction === 'Long' ? 0x00ff88 : 0xff3b30; // green/red

  const desc = [
    line('Entry:', entry),
    line('SL:', sl),
    line('TP1:', tp1),
    line('TP2:', tp2),
    line('TP3:', tp3),
    '',
    reason ? `**Reasoning**\n${reason}` : ''
  ].filter(Boolean).join('\n');

  return new EmbedBuilder()
    .setTitle(`${asset?.toUpperCase()} | ${direction} ${direction === 'Long' ? '🟢' : '🔴'}`)
    .setDescription(desc)
    .setColor(color)
    .setFooter({ text: `By ${author.tag}` })
    .setTimestamp(new Date());
}

async function upsertSummaryMessage(db) {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(CURRENT_TRADES_CHANNEL_ID);
  if (!channel) throw new Error('CURRENT_TRADES_CHANNEL_ID not found or bot lacks access.');

  // Only show ACTIVE trades
  const active = db.trades.filter(t => t.status === 'ACTIVE');

  const lines = [];
  if (active.length === 0) {
    lines.push('_No active trades_');
  } else {
    for (const t of active) {
      const row = [
        `**${t.asset.toUpperCase()} ${t.direction === 'Long' ? '🟢' : '🔴'}**`,
        t.entry ? `Entry: ${t.entry}` : '',
        t.sl ? `SL: ${t.sl}` : '',
        t.tp1 ? `TP1: ${t.tp1}` : '',
        t.tp2 ? `TP2: ${t.tp2}` : '',
        t.tp3 ? `TP3: ${t.tp3}` : ''
      ].filter(Boolean).join(' · ');
      lines.push(`• ${row}`);
    }
  }

  const content = `**Current Trades Summary**\n${lines.join('\n')}`;

  if (db.summaryMessageId) {
    try {
      const msg = await channel.messages.fetch(db.summaryMessageId);
      await msg.edit({ content });
      return;
    } catch {
      // fall-through to send new
    }
  }
  const sent = await channel.send({ content });
  db.summaryMessageId = sent.id;
  await saveDB(db);
}

// ---------- BUTTONS (close/update) ----------
const BUTTON_CLOSE = 'drako_close';
const BUTTON_UPDATE = 'drako_update';

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BUTTON_UPDATE).setLabel('Update Levels').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(BUTTON_CLOSE).setLabel('Close Trade').setStyle(ButtonStyle.Danger)
  );
}

// ---------- CLIENT EVENTS ----------
client.once('ready', async () => {
  console.log(`[READY] Logged in as ${client.user.tag}`);
  // Ensure db exists
  await loadDB();
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /drako command
    if (interaction.isChatInputCommand() && interaction.commandName === 'drako') {
      if (!(await guard(interaction))) return;

      const asset = interaction.options.getString('asset', true);
      const direction = interaction.options.getString('direction', true);
      const entry = safeFloat(interaction.options.getNumber('entry'));
      const sl = safeFloat(interaction.options.getNumber('sl'));
      const tp1 = safeFloat(interaction.options.getNumber('tp1'));
      const tp2 = safeFloat(interaction.options.getNumber('tp2'));
      const tp3 = safeFloat(interaction.options.getNumber('tp3'));
      const reason = interaction.options.getString('reason') || '';

      const db = await loadDB();

      const trade = {
        id: nanoid(10),
        asset,
        direction,
        entry,
        sl,
        tp1,
        tp2,
        tp3,
        reason,
        authorId: interaction.user.id,
        channelId: interaction.channelId,
        messageId: null,
        status: 'ACTIVE',
        createdAt: Date.now()
      };

      const embed = buildSignalEmbed(trade, interaction.user);

      const mentions = TRADER_ROLE_ID ? `<@&${TRADER_ROLE_ID}>` : '';
      const sent = await interaction.reply({
        content: mentions || undefined,
        embeds: [embed],
        components: [buildButtons()],
        fetchReply: true
      });

      trade.messageId = sent.id;
      db.trades.push(trade);
      await saveDB(db);
      await upsertSummaryMessage(db);
      return;
    }

    // Buttons (update/close)
    if (interaction.isButton()) {
      const db = await loadDB();
      const trade = db.trades.find(t => t.messageId === interaction.message.id);
      if (!trade) {
        await interaction.reply({ content: 'Trade not found in DB.', ephemeral: true });
        return;
      }

      if (!(await guard(interaction))) return;

      if (interaction.customId === BUTTON_CLOSE) {
        trade.status = 'CLOSED';
        await saveDB(db);
        await upsertSummaryMessage(db);
        await interaction.reply({ content: 'Trade closed and summary updated.', ephemeral: true });
        return;
      }

      if (interaction.customId === BUTTON_UPDATE) {
        // Simple example: pull current values and re-render the embed (no modal for brevity)
        const embed = buildSignalEmbed(trade, interaction.user);
        await interaction.message.edit({ embeds: [embed], components: [buildButtons()] });
        await upsertSummaryMessage(db);
        await interaction.reply({ content: 'Levels refreshed.', ephemeral: true });
        return;
      }
    }
  } catch (err) {
    console.error('[interactionCreate] error:', err);
    if (interaction.isRepliable()) {
      try {
        await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
      } catch {}
    }
  }
});

// ---------- LOGIN ----------
client.login(TOKEN);
