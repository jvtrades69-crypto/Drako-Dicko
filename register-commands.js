// register-commands.js — registers /drako on your Drako application
import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import config from './config.js';

const rest = new REST({ version: '10' }).setToken(config.drako.token);

// Same options as your /signal
const drakoCommand = {
  name: 'drako',
  description: 'Create a new Drako trade signal',
  options: [
    { name: 'asset',     type: 3,  description: 'Asset (BTC, ETH, SOL, or OTHER)', required: true,
      choices: [
        { name: 'BTC', value: 'BTC' }, { name: 'ETH', value: 'ETH' },
        { name: 'SOL', value: 'SOL' }, { name: 'OTHER', value: 'OTHER' },
      ],
    },
    { name: 'direction', type: 3,  description: 'LONG or SHORT', required: true,
      choices: [{ name: 'LONG', value: 'LONG' }, { name: 'SHORT', value: 'SHORT' }],
    },
    { name: 'entry',     type: 3,  description: 'Entry price', required: false },
    { name: 'sl',        type: 3,  description: 'Stop loss', required: false },
    { name: 'tp1',       type: 3,  description: 'TP1', required: false },
    { name: 'tp2',       type: 3,  description: 'TP2', required: false },
    { name: 'tp3',       type: 3,  description: 'TP3', required: false },
    { name: 'tp4',       type: 3,  description: 'TP4', required: false },
    { name: 'tp5',       type: 3,  description: 'TP5', required: false },

    // Optional planned %s:
    { name: 'tp1_pct',   type: 3,  description: 'TP1 close %', required: false },
    { name: 'tp2_pct',   type: 3,  description: 'TP2 close %', required: false },
    { name: 'tp3_pct',   type: 3,  description: 'TP3 close %', required: false },
    { name: 'tp4_pct',   type: 3,  description: 'TP4 close %', required: false },
    { name: 'tp5_pct',   type: 3,  description: 'TP5 close %', required: false },

    { name: 'reason',    type: 3,  description: 'Reason (optional)', required: false },
    { name: 'extra_role',type: 3,  description: 'Extra role mention(s) (IDs or @role)', required: false },
  ],
};

async function main() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.drako.applicationId, config.drako.guildId),
      { body: [drakoCommand] }
    );
    console.log('✅ Registered /drako for Drako app.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
    process.exit(1);
  }
}

main();