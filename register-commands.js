// register-commands.js
import 'dotenv/config';
import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !APP_ID || !GUILD_ID) {
  console.error('[ENV] DISCORD_TOKEN / APPLICATION_ID / GUILD_ID required');
  process.exit(1);
}

const commands = [
  {
    name: 'drako',
    description: 'Create a trade signal (replica bot version)',
    dm_permission: false,
    default_member_permissions: null, // runtime-gated by role in index.js
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'asset',
        description: 'Asset symbol (e.g., BTC, ETH, SOL)',
        required: true
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'direction',
        description: 'Long or Short',
        required: true,
        choices: [
          { name: 'Long', value: 'Long' },
          { name: 'Short', value: 'Short' }
        ]
      },
      {
        type: ApplicationCommandOptionType.Number,
        name: 'entry',
        description: 'Entry price',
        required: false
      },
      {
        type: ApplicationCommandOptionType.Number,
        name: 'sl',
        description: 'Stop Loss',
        required: false
      },
      {
        type: ApplicationCommandOptionType.Number,
        name: 'tp1',
        description: 'Take Profit 1',
        required: false
      },
      {
        type: ApplicationCommandOptionType.Number,
        name: 'tp2',
        description: 'Take Profit 2',
        required: false
      },
      {
        type: ApplicationCommandOptionType.Number,
        name: 'tp3',
        description: 'Take Profit 3',
        required: false
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'reason',
        description: 'Optional reasoning (text)',
        required: false
      }
    ]
  }
];

async function main() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log(`[register] Putting ${commands.length} command(s) to guild ${GUILD_ID} ...`);
    await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
    console.log('[register] Done.');
  } catch (err) {
    console.error('[register] Failed:', err);
    process.exit(1);
  }
}

main();
