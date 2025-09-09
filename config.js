// register-commands.js
import { REST, Routes } from 'discord.js';
import config from './config.js';

// Pull from config (supports DRAKO_* or base envs)
const token = config.token;
const clientId = config.applicationId;
const guildId = config.guildId;

if (!token || !clientId || !guildId) {
  throw new Error('Missing token/clientId/guildId in config.js.');
}

// Define the commands you want registered for this bot
// (Add /drako here if this is the Drako bot; keep /signal for the JV bot)
const commands = [
  {
    name: 'signal',
    description: 'Create a new trade signal',
    options: [
      { name: 'asset', type: 3, description: 'Asset name', required: true },
      { name: 'direction', type: 3, description: 'Long/Short', required: true,
        choices: [{ name: 'Long', value: 'Long' }, { name: 'Short', value: 'Short' }] },
      { name: 'entry', type: 3, description: 'Entry price', required: true },
      { name: 'sl', type: 3, description: 'Stop loss', required: true },
      { name: 'tp1', type: 3, description: 'Take Profit 1', required: false },
      { name: 'tp2', type: 3, description: 'Take Profit 2', required: false },
      { name: 'tp3', type: 3, description: 'Take Profit 3', required: false },
      { name: 'reason', type: 3, description: 'Reasoning', required: false },
      { name: 'extra_role', type: 3, description: 'Extra role mention(s)', required: false },
      { name: 'tp1_pct', type: 3, description: 'TP1 planned %', required: false },
      { name: 'tp2_pct', type: 3, description: 'TP2 planned %', required: false },
      { name: 'tp3_pct', type: 3, description: 'TP3 planned %', required: false },
      { name: 'tp4_pct', type: 3, description: 'TP4 planned %', required: false },
      { name: 'tp5_pct', type: 3, description: 'TP5 planned %', required: false },
    ],
  },
  // If this is the Drako bot and you want a separate /drako command:
  // {
  //   name: 'drako',
  //   description: 'Create a new Drako trade signal',
  //   options: [ ...same as above... ],
  // },
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
