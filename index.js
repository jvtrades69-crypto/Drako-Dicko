// index.js — Drako clone bot (focused build)
import {
  Client, GatewayIntentBits, ChannelType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { customAlphabet } from 'nanoid';
import fs from 'fs-extra';
import config from './config.js';

// ---- storage
const DB_PATH = config.drako.dbPath;
await fs.ensureFile(DB_PATH);
let signals = (await fs.readJson(DB_PATH).catch(() => null)) || {};
async function saveDB() { await fs.writeJson(DB_PATH, signals, { spaces: 2 }); }

// ---- client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));
process.on('uncaughtException',  e => console.error('uncaughtException:', e));

const nano = customAlphabet('1234567890abcdef', 10);

// ---- helpers
const isNum = v => v !== undefined && v !== null && v !== '' && !isNaN(Number(v));
const toNum = v => isNum(v) ? Number(v) : null;
const TP_KEYS = ['tp1','tp2','tp3','tp4','tp5'];
const STATUS = { RUN_VALID:'RUN_VALID', CLOSED:'CLOSED', STOPPED_BE:'STOPPED_BE', STOPPED_OUT:'STOPPED_OUT' };

function norm(raw) {
  const s = { ...raw };
  s.entry = toNum(s.entry);
  s.sl = toNum(s.sl);
  s.slOriginal ??= s.sl;
  for (const k of TP_KEYS) s[k] = toNum(s[k]);
  s.fills = Array.isArray(s.fills) ? s.fills : [];
  s.latestTpHit ??= null;
  s.status ||= STATUS.RUN_VALID;
  if (typeof s.validReentry !== 'boolean') s.validReentry = true;
  s.extraRole ||= '';
  s.plan = s.plan && typeof s.plan === 'object' ? s.plan : {};
  for (const K of ['TP1','TP2','TP3','TP4','TP5']) {
    const v = s.plan[K];
    s.plan[K] = isNum(v) ? Number(v) : null;
  }
  s.tpHits = s.tpHits && typeof s.tpHits === 'object' ? s.tpHits : { TP1:false, TP2:false, TP3:false, TP4:false, TP5:false };
  if (s.finalR !== undefined && s.finalR !== null && !isNum(s.finalR)) delete s.finalR;
  return s;
}

function extractRoleIds(defaultRoleId, extraRoleRaw) {
  const ids = [];
  if (defaultRoleId) ids.push(defaultRoleId);
  if (extraRoleRaw) {
    const found = String(extraRoleRaw).match(/\d{6,}/g);
    if (found) ids.push(...found);
  }
  return Array.from(new Set(ids));
}
function buildMentions(defaultRoleId, extraRoleRaw, forEdit=false) {
  const ids = extractRoleIds(defaultRoleId, extraRoleRaw);
  const content = ids.length ? ids.map(id => `<@&${id}>`).join(' ') : '';
  if (forEdit) return { content, allowedMentions: { parse: [] } };
  if (!ids.length) return { content: '', allowedMentions: { parse: [] } };
  return { content, allowedMentions: { parse: [], roles: ids } };
}

// ---- basic text renders (compact)
function renderSignalText(s) {
  const bullets = [];
  bullets.push(`${s.asset} | ${s.direction} ${'🟢'}`);
  bullets.push('');
  bullets.push('📊 **Trade Details**');
  bullets.push(`Entry: ${isNum(s.entry) ? s.entry : '—'}`);
  bullets.push(`SL: ${isNum(s.sl)    ? s.sl    : '—'}`);
  bullets.push('');
  bullets.push('🧭 **Status**');
  bullets.push(`Active ${s.validReentry ? '🟩' : '🟥'}`);
  bullets.push(`Valid for re-entry: ${s.validReentry ? 'Yes' : 'No'}`);
  return bullets.join('\n');
}
function renderSummaryText(active) {
  if (!active.length) {
    return [
      `**Drako Current Active Trades** 📊`,
      '',
      '• There are currently no ongoing trades valid for entry – stay posted for future trades!',
    ].join('\n');
  }
  const lines = ['**Drako Current Active Trades** 📊', ''];
  let i = 1;
  for (const s of active) {
    lines.push(`${i}. ${s.asset} ${s.direction === 'LONG' ? 'Long' : 'Short'} 🟢 —  <#${config.drako.currentTradesChannel}>`);
    lines.push(`   Entry: ${isNum(s.entry) ? s.entry : '—'}`);
    lines.push(`   SL: ${isNum(s.sl) ? s.sl : '—'}`);
    lines.push('');
    i++;
  }
  return lines.join('\n').trim();
}

// ---- channel ops
async function postSignalMessage(signal, defaultMentionRoleId) {
  const channel = await client.channels.fetch(signal.channelId);
  const { content: mention, allowedMentions } = buildMentions(defaultMentionRoleId, signal.extraRole, false);
  const content = `${renderSignalText(norm(signal))}${mention ? `\n\n${mention}` : ''}`;
  const sent = await channel.send({ content, ...(mention ? { allowedMentions } : {}) });
  return sent.id;
}
async function editSignalMessage(signal, defaultMentionRoleId) {
  const channel = await client.channels.fetch(signal.channelId);
  const msg = await channel.messages.fetch(signal.messageId).catch(() => null);
  if (!msg) return false;
  const { content: mention, allowedMentions } = buildMentions(defaultMentionRoleId, signal.extraRole, true);
  await msg.edit({
    content: `${renderSignalText(norm(signal))}${mention ? `\n\n${mention}` : ''}`,
    ...(mention ? { allowedMentions } : { allowedMentions: { parse: [] } }),
  }).catch(() => {});
  return true;
}
async function deleteSignalMessage(signal) {
  const channel = await client.channels.fetch(signal.channelId);
  const msg = await channel.messages.fetch(signal.messageId).catch(() => null);
  if (msg) await msg.delete().catch(() => {});
}

async function hardPurgeChannel(channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    while (true) {
      const batch = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!batch || batch.size === 0) break;
      const young = batch.filter(m => (Date.now() - m.createdTimestamp) < 13 * 24 * 60 * 60 * 1000);
      if (young.size > 1) {
        try { await channel.bulkDelete(young, true); } catch (e) { console.error('purge: bulkDelete failed', e); }
      }
      const oldies = batch.filter(m => !young.has(m.id));
      for (const m of oldies.values()) { try { await m.delete(); } catch {} }
      if (batch.size < 100) break;
    }
  } catch (e) { console.error('hardPurgeChannel outer error:', e); }
}
async function updateSummary() {
  try {
    await hardPurgeChannel(config.drako.currentTradesChannel);
    const channel = await client.channels.fetch(config.drako.currentTradesChannel);
    // show only signals whose original message still exists
    const act = [];
    for (const s of Object.values(signals)) {
      const n = norm(s);
      if (n.status !== STATUS.RUN_VALID || n.validReentry !== true) continue;
      // verify message still exists in original channel
      const ch = await client.channels.fetch(n.channelId).catch(() => null);
      if (!ch) continue;
      const exists = await ch.messages.fetch(n.messageId).catch(() => null);
      if (!exists) continue;
      act.push(n);
    }
    const text = renderSummaryText(act);
    await channel.send({ content: text, allowedMentions: { parse: [] } }).catch(e => console.error('summary send failed:', e));
  } catch (e) { console.error('updateSummary error:', e); }
}

// ---- control UI
function controlRows(id) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tp1_${id}`).setLabel('🎯 TP1 Hit').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tp2_${id}`).setLabel('🎯 TP2 Hit').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tp3_${id}`).setLabel('🎯 TP3 Hit').setStyle(ButtonStyle.Success),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tp4_${id}`).setLabel('🎯 TP4 Hit').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tp5_${id}`).setLabel('🎯 TP5 Hit').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`upd_tpprices_${id}`).setLabel('✏️ Update TP Prices').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`upd_plan_${id}`).setLabel('✏️ Update TP % Plan').setStyle(ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`upd_trade_${id}`).setLabel('✏️ Update Trade Info').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`upd_roles_${id}`).setLabel('✏️ Update Role Mention').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`fullclose_${id}`).setLabel('✅ Fully Close').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`stopbe_${id}`).setLabel('🟥 Stopped BE').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`stopped_${id}`).setLabel('🔴 Stopped Out').setStyle(ButtonStyle.Danger),
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`del_${id}`).setLabel('❌ Delete').setStyle(ButtonStyle.Secondary)
  );
  return [row1,row2,row3,row4];
}
async function createControlThread(signal, initiatorId) {
  const channel = await client.channels.fetch(signal.channelId);
  const thread = await channel.threads.create({
    name: `controls-${signal.asset}-${signal.id.slice(0, 4)}`,
    type: ChannelType.PrivateThread,
    invitable: false,
  });
  await thread.members.add(config.drako.ownerId).catch(() => {});
  if (initiatorId) await thread.members.add(initiatorId).catch(() => {});
  await thread.send({ content: 'Owner Control Panel', components: controlRows(signal.id) });
  return thread.id;
}

// ---- lifecycle
client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

// Clean up storage when message deleted manually
client.on('messageDelete', async (message) => {
  try {
    const found = Object.values(signals).find(s => s.messageId === message.id);
    if (!found) return;
    delete signals[found.id];
    await saveDB();
    await updateSummary().catch(() => {});
    console.log(`ℹ️ Signal ${found.id} removed due to manual delete.`);
  } catch (e) { console.error('messageDelete handler error:', e); }
});

// ---- interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // /drako
    if (interaction.isChatInputCommand() && interaction.commandName === 'drako') {
      // only owner or allowed role may use
      const isOwner = interaction.user.id === config.drako.ownerId;
      const hasRole = interaction.member?.roles?.cache?.has(config.drako.allowedRoleId);
      if (!isOwner && !hasRole) {
        return interaction.reply({ content: 'You are not allowed to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const assetSel   = interaction.options.getString('asset');
      const direction  = interaction.options.getString('direction');
      const entry      = interaction.options.getString('entry');
      const sl         = interaction.options.getString('sl');
      const tp1        = interaction.options.getString('tp1');
      const tp2        = interaction.options.getString('tp2');
      const tp3        = interaction.options.getString('tp3');
      const tp4        = interaction.options.getString('tp4');
      const tp5        = interaction.options.getString('tp5');
      const reason     = interaction.options.getString('reason');
      const extraRole  = interaction.options.getString('extra_role');

      const tp1_pct = interaction.options.getString('tp1_pct');
      const tp2_pct = interaction.options.getString('tp2_pct');
      const tp3_pct = interaction.options.getString('tp3_pct');
      const tp4_pct = interaction.options.getString('tp4_pct');
      const tp5_pct = interaction.options.getString('tp5_pct');

      const id = nano();
      const signal = norm({
        id,
        asset: String(assetSel).toUpperCase(),
        direction: (direction || 'LONG').toUpperCase(),
        entry, sl, tp1, tp2, tp3, tp4, tp5,
        reason: reason || '',
        extraRole: extraRole || '',
        plan: {
          TP1: isNum(tp1_pct) ? Number(tp1_pct) : null,
          TP2: isNum(tp2_pct) ? Number(tp2_pct) : null,
          TP3: isNum(tp3_pct) ? Number(tp3_pct) : null,
          TP4: isNum(tp4_pct) ? Number(tp4_pct) : null,
          TP5: isNum(tp5_pct) ? Number(tp5_pct) : null,
        },
        status: STATUS.RUN_VALID,
        validReentry: true,
        latestTpHit: null,
        fills: [],
        tpHits: { TP1:false, TP2:false, TP3:false, TP4:false, TP5:false },
        finalR: null,
        messageId: null,
        channelId: interaction.channelId,
        jumpUrl: null,
      });

      signals[id] = signal;
      await saveDB();

      const msgId = await postSignalMessage(signal, config.drako.mentionRoleId);
      signals[id].messageId = msgId;

      // get jump URL
      const ch = await client.channels.fetch(signal.channelId);
      const msg = await ch.messages.fetch(msgId);
      signals[id].jumpUrl = msg.url;

      await saveDB();
      await createControlThread(signals[id], interaction.user.id);
      await updateSummary();

      return interaction.editReply({ content: '✅ Trade signal posted.' });
    }

    // Buttons & modals (TP hits / updates / closes)
    if (interaction.isButton() || interaction.isModalSubmit()) {
      // only owner can use the panel
      if (interaction.user.id !== config.drako.ownerId) {
        return interaction.reply({ content: 'Only the owner can use these controls.', ephemeral: true });
      }

      // ====== Update modals (ids start with modal_*) ======
      if (interaction.isModalSubmit()) {
        await interaction.deferReply({ ephemeral: true });

        // Update TP Prices
        if (interaction.customId.startsWith('modal_tpprices_')) {
          const id = interaction.customId.replace('modal_tpprices_', '');
          const s = signals[id]; if (!s) return interaction.editReply({ content: 'Signal not found.' });
          const patch = {};
          for (const k of TP_KEYS) {
            const v = interaction.fields.getTextInputValue(`upd_${k}`)?.trim();
            if (v !== undefined && v !== '') patch[k] = v;
          }
          signals[id] = norm({ ...s, ...patch });
          await saveDB();
          await editSignalMessage(signals[id], config.drako.mentionRoleId);
          await updateSummary();
          return interaction.editReply({ content: '✅ TP prices updated.' });
        }

        // Update TP % Plan
        if (interaction.customId.startsWith('modal_plan_')) {
          const id = interaction.customId.replace('modal_plan_', '');
          const s = norm(signals[id]); if (!s) return interaction.editReply({ content: 'Signal not found.' });
          const patchPlan = { ...s.plan };
          for (const t of TP_KEYS) {
            const raw = interaction.fields.getTextInputValue(`plan_${t}`)?.trim();
            if (raw === '' || raw === undefined) continue;
            if (isNum(raw)) patchPlan[t.toUpperCase()] = Math.max(0, Math.min(100, Number(raw)));
          }
          signals[id] = norm({ ...s, plan: patchPlan });
          await saveDB();
          await editSignalMessage(signals[id], config.drako.mentionRoleId);
          await updateSummary();
          return interaction.editReply({ content: '✅ TP % plan updated.' });
        }

        // Update Trade Info
        if (interaction.customId.startsWith('modal_trade_')) {
          const id = interaction.customId.replace('modal_trade_', '');
          const s = signals[id]; if (!s) return interaction.editReply({ content: 'Signal not found.' });
          const patch = {};
          const entry  = interaction.fields.getTextInputValue('upd_entry')?.trim();
          const sl     = interaction.fields.getTextInputValue('upd_sl')?.trim();
          const asset  = interaction.fields.getTextInputValue('upd_asset')?.trim();
          const dir    = interaction.fields.getTextInputValue('upd_dir')?.trim()?.toUpperCase();
          const reason = interaction.fields.getTextInputValue('upd_reason')?.trim();
          if (entry) patch.entry = entry;
          if (sl)    patch.sl = sl;
          if (asset) patch.asset = asset.toUpperCase();
          if (dir === 'LONG' || dir === 'SHORT') patch.direction = dir;
          if (reason !== undefined) patch.reason = reason;

          signals[id] = norm({ ...s, ...patch });
          await saveDB();
          await editSignalMessage(signals[id], config.drako.mentionRoleId);
          await updateSummary();
          return interaction.editReply({ content: '✅ Trade info updated.' });
        }

        // Update Role mention(s)
        if (interaction.customId.startsWith('modal_roles_')) {
          const id = interaction.customId.replace('modal_roles_', '');
          const s = signals[id]; if (!s) return interaction.editReply({ content: 'Signal not found.' });
          const rolesRaw = interaction.fields.getTextInputValue('roles_input') ?? '';
          signals[id] = norm({ ...s, extraRole: rolesRaw });
          await saveDB();
          await editSignalMessage(signals[id], config.drako.mentionRoleId);
          await updateSummary();
          return interaction.editReply({ content: '✅ Role mentions updated.' });
        }

        // Fully Close (final R optional) — compact path (close remaining)
        if (interaction.customId.startsWith('modal_full_')) {
          const id = interaction.customId.replace('modal_full_', '');
          const s = norm(signals[id]); if (!s) return interaction.editReply({ content: 'Signal not found.' });

          const finalRStr = interaction.fields.getTextInputValue('final_r')?.trim();
          const hasFinalR = finalRStr !== undefined && finalRStr !== '';
          if (hasFinalR && !isNum(finalRStr)) return interaction.editReply({ content: '❌ Final R must be a number.' });

          let updated = { ...s, status: STATUS.CLOSED, validReentry: false };
          if (hasFinalR) updated.finalR = Number(finalRStr);

          signals[id] = norm(updated);
          await saveDB();
          await editSignalMessage(signals[id], config.drako.mentionRoleId);
          await updateSummary();
          return interaction.editReply({ content: '✅ Fully closed.' });
        }

        return; // end modal handling
      }

      // ====== Buttons
      if (interaction.isButton()) {
        const [action, id] = interaction.customId.split('_');
        const s = norm(signals[id]);
        if (!s) return interaction.reply({ content: 'Signal not found.', ephemeral: true });

        const showModal = async (modal) => interaction.showModal(modal);

        // open modals
        if (action === 'upd_tpprices') {
          const modal = new ModalBuilder().setCustomId(`modal_tpprices_${id}`).setTitle('Update TP Prices (TP1–TP5)');
          for (const [cid, label] of [['upd_tp1','TP1'],['upd_tp2','TP2'],['upd_tp3','TP3'],['upd_tp4','TP4'],['upd_tp5','TP5']]) {
            modal.addComponents(new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId(cid).setLabel(label).setStyle(TextInputStyle.Short).setRequired(false)
            ));
          }
          return showModal(modal);
        }
        if (action === 'upd_plan') {
          const modal = new ModalBuilder().setCustomId(`modal_plan_${id}`).setTitle('Update TP % Plan (0–100)');
          for (const t of ['tp1','tp2','tp3','tp4','tp5']) {
            modal.addComponents(new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId(`plan_${t}`).setLabel(`${t.toUpperCase()} planned %`).setStyle(TextInputStyle.Short).setRequired(false)
            ));
          }
          return showModal(modal);
        }
        if (action === 'upd_trade') {
          const modal = new ModalBuilder().setCustomId(`modal_trade_${id}`).setTitle('Update Trade Info');
          const fields = [
            ['upd_entry','Entry',TextInputStyle.Short],
            ['upd_sl','SL',TextInputStyle.Short],
            ['upd_asset','Asset',TextInputStyle.Short],
            ['upd_dir','Direction (LONG/SHORT)',TextInputStyle.Short],
            ['upd_reason','Reason (optional)',TextInputStyle.Paragraph],
          ];
          for (const [cid,label,style] of fields) {
            modal.addComponents(new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId(cid).setLabel(label).setStyle(style).setRequired(false)
            ));
          }
          return showModal(modal);
        }
        if (action === 'upd_roles') {
          const modal = new ModalBuilder().setCustomId(`modal_roles_${id}`).setTitle('Update Role Mention(s)');
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('roles_input').setLabel('Enter one or more roles (IDs or @mentions)').setStyle(TextInputStyle.Paragraph).setRequired(false)
          ));
          return showModal(modal);
        }
        if (action === 'fullclose') {
          const modal = new ModalBuilder().setCustomId(`modal_full_${id}`).setTitle('Fully Close Position');
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('final_r').setLabel('Final R (optional)').setPlaceholder('e.g., 0, -0.5, -1').setStyle(TextInputStyle.Short).setRequired(false)
          ));
          return showModal(modal);
        }

        if (action === 'del') {
          await interaction.deferReply({ ephemeral: true });
          await deleteSignalMessage(s).catch(() => {});
          delete signals[id];
          await saveDB();
          await updateSummary().catch(() => {});
          return interaction.editReply({ content: '🗑️ Signal deleted.' });
        }

        // TP hits: open quick modal for optional % (one-time)
        if (['tp1','tp2','tp3','tp4','tp5'].includes(action)) {
          const tpUpper = action.toUpperCase();
          if (s.tpHits?.[tpUpper]) {
            return interaction.reply({ content: `${tpUpper} already recorded.`, ephemeral: true });
          }
          const modal = new ModalBuilder().setCustomId(`modal_tp_${action}_${id}`).setTitle(`${tpUpper} Hit`);
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('tp_pct').setLabel('Close % (0–100; leave blank to skip)').setStyle(TextInputStyle.Short).setRequired(false)
          ));
          return showModal(modal);
        }

        return interaction.reply({ content: 'Unknown action.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('interaction error:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ Internal error.' });
      } else {
        await interaction.reply({ content: '❌ Internal error.', ephemeral: true });
      }
    } catch {}
  }
});

client.login(config.drako.token);