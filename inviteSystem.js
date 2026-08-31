const fs = require('fs');
const { Client, EmbedBuilder } = require('discord.js');

const INVITES_FILE = './invites.json';
const INVITE_CHANNEL_ID = '1543837870106869831';

let inviteData = {};
let inviteCache = new Map();

function loadData() {
  try {
    if (fs.existsSync(INVITES_FILE)) {
      inviteData = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8')) || {};
    }
  } catch (error) {
    console.error('ERROR AL CARGAR invites.json:', error);
    inviteData = {};
  }
}

function saveData() {
  try {
    fs.writeFileSync(INVITES_FILE, JSON.stringify(inviteData, null, 2));
  } catch (error) {
    console.error('ERROR AL GUARDAR invites.json:', error);
  }
}

function getGuildData(guildId) {
  if (!inviteData[guildId]) {
    inviteData[guildId] = { users: {}, joinedBy: {} };
  }
  return inviteData[guildId];
}

async function refreshGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const cache = new Map();

    invites.forEach(invite => {
      cache.set(invite.code, {
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null
      });
    });

    inviteCache.set(guild.id, cache);
    return cache;
  } catch (error) {
    console.error(`No pude obtener las invitaciones de ${guild.name}:`, error.message);
    return null;
  }
}

async function findUsedInvite(guild) {
  const oldCache = inviteCache.get(guild.id) || new Map();
  const newCache = await refreshGuildInvites(guild);
  if (!newCache) return null;

  for (const [code, current] of newCache) {
    const previous = oldCache.get(code);

    if (current.uses > (previous?.uses || 0)) {
      return current;
    }
  }

  return null;
}

async function handleMemberAdd(member) {
  if (member.user.bot) return;

  const inviter = await findUsedInvite(member.guild);
  if (!inviter?.inviterId) return;

  const data = getGuildData(member.guild.id);
  const inviterId = inviter.inviterId;

  data.users[inviterId] = (data.users[inviterId] || 0) + 1;
  data.joinedBy[member.id] = inviterId;
  saveData();

  const channel = member.guild.channels.cache.get(INVITE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const total = data.users[inviterId];

  // Mensaje normal, SIN embed.
  const mensaje =
    `${member} fue invitado a la comunidad por <@${inviterId}> y ahora tiene ${total} invitación${total === 1 ? '' : 'es'}.`;

  await channel.send({ content: mensaje }).catch(() => {});
}

async function handleMemberRemove(member) {
  if (member.user.bot) return;

  const data = getGuildData(member.guild.id);
  const inviterId = data.joinedBy[member.id];
  if (!inviterId) return;

  if (data.users[inviterId] > 0) {
    data.users[inviterId]--;
  }

  delete data.joinedBy[member.id];
  saveData();
}

function getInvites(userId, guildId) {
  return getGuildData(guildId).users[userId] || 0;
}

function install(client) {
  loadData();

  client.once('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      await refreshGuildInvites(guild);
    }

    console.log('✅ Sistema de invitaciones cargado.');
  });

  client.on('guildMemberAdd', handleMemberAdd);
  client.on('guildMemberRemove', handleMemberRemove);

  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const command = message.content.trim().toLowerCase();
    if (command !== '!invites' && command !== '!invitaciones') return;

    const total = getInvites(message.author.id, message.guild.id);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🎟️ Tus invitaciones')
      .setDescription(
        `${message.author}, actualmente tienes **${total} invitación${total === 1 ? '' : 'es'}** en la comunidad.`
      )
      .setFooter({ text: 'Sistema de invitaciones' });

    await message.reply({ embeds: [embed] }).catch(() => {});
  });
}

const originalLogin = Client.prototype.login;

Client.prototype.login = function (...args) {
  if (!this.__inviteSystemInstalled) {
    this.__inviteSystemInstalled = true;
    install(this);
  }

  return originalLogin.apply(this, args);
};

module.exports = { install, getInvites };
