const { Client, GatewayIntentBits, Partials } = require('discord.js');

// ==========================================
// CLIENTE
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// ==========================================
// SISTEMAS
// Cada sistema tiene su propio archivo.
// giveaways.js y commandSync.js se cargan
// desde package.json antes de index.js.
// ==========================================

require('./systems/welcomeGoodbye')(client);
require('./systems/tickets')(client);
require('./systems/payments')(client);
const moderation = require('./systems/logsModeration')(client);
require('./systems/clear')(client, moderation);
require('./systems/reactionRoles')(client);
require('./systems/reactionRoleCommand')(client);
require('./systems/embeds')(client);

// ==========================================
// BOT ENCENDIDO
// ==========================================

client.once('ready', () => {
  console.log(`BOT ENCENDIDO COMO ${client.user.tag}`);
});

client.on('error', error => {
  console.error('ERROR DEL CLIENTE DE DISCORD:', error);
});

// ==========================================
// LOGIN
// ==========================================

if (!process.env.DISCORD_TOKEN) {
  console.error('NO SE ENCONTRO DISCORD_TOKEN EN RAILWAY.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
