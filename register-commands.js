// register-commands.js — registers /drako on your guild
import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import config from './config.js';

const commands = [
  {
    name: 'drako',
    description: 'Create a new trade signal (Drako)',
    options: [
      { name: 'asset', type: 3, description: 'Asset (BTC/ETH/SOL or custom)', required: true,
        choices: [
          { name: 'BTC', value: 'BTC' },
          { name: 'ETH', value: 'ETH' },
          { name: 'SOL', value: 'SOL' },
          { name: 'OTHER', value: 'OTHER' },
        ]
      },
      { name: 'direction', type: 3, description: 'LONG or SHORT', required: true,
        choices: [{ name: 'LONG', value: 'LONG' }, { name: 'SHORT', value: 'SHORT' }]
      },
      { name: 'entry', type: 3, description: 'Entry price', required: false },
      { name: 'sl', type: 3, description: 'Stop loss', required: false },
      { name: 'tp1', type: 3, description: 'TP1', required: false },
      { name: 'tp2', type: 3, description: 'TP2', required: false },
      { name: 'tp3', type: 3, description: 'TP3', required: false },
      { name: 'tp4', type: 3, description: 'TP4', required: false },
      { name: 'tp5', type: 3, description: 'TP5', required: false },
      { name: 'reason', type: 3, description: 'Reason (optional)', required: false },
      { name: 'extra_role', type: 3, description: 'Additional role mentions (IDs or @mentions)', required: false },

      // optional planned % per TP
      { name: 'tp1_pct', type: 3, description: 'Planned % at TP1', required: false },
      { name: 'tp2_pct', type: 3, description: 'Planned % at TP2', required: false },
      { name: 'tp3_pct', type: 3, description: 'Planned % at TP3', required: false },
      { name: 'tp4_pct', type: 3, description: 'Planned % at TP4', required: false },
      { name: 'tp5_pct', type: 3, description: 'Planned % at TP5', required: false },
    ]
  }
];

async function main() {
  if (!config.token || !config.applicationId || !config.guildId) {
    throw new Error('Missing token/clientId/guildId in config.js');
  }
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.applicationId, config.guildId),
    { body: commands }
  );
  console.log('✅ /drako command registered.');
}

main().catch((e) => {
  console.error('Failed to register commands:', e);
  process.exit(1);
});