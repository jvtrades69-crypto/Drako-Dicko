import { REST, Routes } from 'discord.js';
import config from './config.js';

const token   = config.token;
const clientId = config.applicationId; // this is your Application (Client) ID
const guildId  = config.guildId;

if (!token || !clientId || !guildId) {
  console.error('Loaded config:', {
    token: token ? `${token.slice(0, 8)}…` : undefined,
    clientId,
    guildId,
  });
  throw new Error('Missing token/clientId/guildId in config.js.');
}

// ---- Commands to register for this bot ----
// If this is the Drako bot and you want a distinct command name,
// change "signal" to "drako" (or add another block).
const commands = [
  {
    name: 'signal',
    description: 'Create a new trade signal',
    options: [
      { name: 'asset', type: 3, description: 'Asset (e.g., BTC, ETH, SOL, OTHER)', required: true,
        choices: [
          { name: 'BTC', value: 'BTC' },
          { name: 'ETH', value: 'ETH' },
          { name: 'SOL', value: 'SOL' },
          { name: 'OTHER', value: 'OTHER' },
        ]},
      { name: 'direction', type: 3, description: 'Long/Short', required: true,
        choices: [{ name: 'LONG', value: 'LONG' }, { name: 'SHORT', value: 'SHORT' }] },
      { name: 'entry', type: 3, description: 'Entry price', required: true },
      { name: 'sl',    type: 3, description: 'Stop loss', required: true },
      { name: 'tp1',   type: 3, description: 'Take Profit 1', required: false },
      { name: 'tp2',   type: 3, description: 'Take Profit 2', required: false },
      { name: 'tp3',   type: 3, description: 'Take Profit 3', required: false },
      { name: 'tp4',   type: 3, description: 'Take Profit 4', required: false },
      { name: 'tp5',   type: 3, description: 'Take Profit 5', required: false },
      { name: 'reason',     type: 3, description: 'Reason (optional)', required: false },
      { name: 'extra_role', type: 3, description: 'Extra role mention(s)', required: false },
      { name: 'tp1_pct', type: 3, description: 'TP1 planned %', required: false },
      { name: 'tp2_pct', type: 3, description: 'TP2 planned %', required: false },
      { name: 'tp3_pct', type: 3, description: 'TP3 planned %', required: false },
      { name: 'tp4_pct', type: 3, description: 'TP4 planned %', required: false },
      { name: 'tp5_pct', type: 3, description: 'TP5 planned %', required: false },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  console.log(`Registering ${commands.length} command(s) to guild ${guildId} for app ${clientId}…`);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('✅ Commands registered.');
}

main().catch((e) => {
  console.error('❌ Failed to register commands:', e);
  process.exit(1);
});
