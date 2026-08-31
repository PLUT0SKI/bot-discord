const fs = require('fs');
const path = require('path');
const { Client, EmbedBuilder, PermissionsBitField } = require('discord.js');

const INVITES_FILE = path.join(__dirname, 'invites.json');
const INVITE_CHANNEL_ID = '1543837870106869831';

let inviteData = {};
const inviteCache = new Map();
const processingGuilds = new Set();

function loadData() {
  try {
    if (!fs.existsSync(INVITES_FILE)) {
      inviteData = {};
      saveData();
      return;
    }
    const raw = fs.readFileSync(INVITES_FILE, 'utf8').trim();
    inviteData = raw ? JSON.parse(raw) : {};
    if (!inviteData || typeof inviteData !== 'object' || Array.isArray(inviteData)) inviteData = {};
    console.log('✅ invites.json cargado correctamente.');
  } catch (error) {
    console.error('❌ ERROR AL CARGAR invites.json:', error);
    inviteData = {};
  }
}

function saveData() {
  try {
    const tempFile = `${INVITES_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inviteData, null, 2), 'utf8');
    fs.renameSync(tempFile, INVITES_FILE);
  } catch (error) {
    console.error('❌ ERROR AL GUARDAR invites.json:', error);
  }
}

function getGuildData(guildId) {
  if (!inviteData[guildId]) inviteData[guildId] = { users: {}, joinedBy: {} };
  if (!inviteData[guildId].users) inviteData[guildId].users = {};
  if (!inviteData[guildId].joinedBy) inviteData[guildId].joinedBy = {};
  return inviteData[guildId];
}

async function refreshGuildInvites(guild) {
  try {
    const me = guild.members.me;
    if (me && !me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      console.error(`❌ ${guild.name}: el bot necesita "Gestionar servidor" para detectar invitaciones.`);
      return null;
    }

    const invites = await guild.invites.fetch();
    const cache = new Map();

    for (const invite of invites.values()) {
      cache.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviter?.id ?? null
      });
    }

    inviteCache.set(guild.id, cache);
    return cache;
  } catch (error) {
    console.error(`❌ No pude obtener las invitaciones de ${guild.name}: ${error.message}`);
    return null;
  }
}

async function findUsedInvite(guild) {
  const oldCache = inviteCache.get(guild.id);
  const newCache = await refreshGuildInvites(guild);
  if (!newCache || !oldCache) return null;

  for (const [code, current] of newCache) {
    const previous = oldCache.get(code);
    if (current.uses > (previous?.uses ?? 0)) return current;
  }
  return null;
}

async function handleMemberAdd(member) {
  if (!member.guild || member.user.bot) return;

  if (processingGuilds.has(member.guild.id)) {
    setTimeout(() => handleMemberAdd(member), 1500);
    return;
  }

  processingGuilds.add(member.guild.id);

  try {
    const inviter = await findUsedInvite(member.guild);
    if (!inviter?.inviterId) {
      console.log(`ℹ️ No se pudo determinar quién invitó a ${member.user.tag}.`);
      return;
    }

    const data = getGuildData(member.guild.id);
    if (data.joinedBy[member.id]) return;

    const inviterId = inviter.inviterId;
    data.users[inviterId] = (data.users[inviterId] || 0) + 1;
    data.joinedBy[member.id] = inviterId;
    saveData();

    const channel = member.guild.channels.cache.get(INVITE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error(`❌ No encontré el canal de invitaciones ${INVITE_CHANNEL_ID}.`);
      return;
    }

    const total = data.users[inviterId];
    const mensaje = `**${member} fue invitado a la comunidad por <@${inviterId}> y ahora tiene __${total} invitación${total === 1 ? '' : 'es'}__.**`;
    await channel.send({ content: mensaje });
    console.log(`✅ ${member.user.tag} fue invitado por ${inviterId}. Total: ${total}`);
  } catch (error) {
    console.error('❌ ERROR EN SISTEMA DE INVITACIONES:', error);
  } finally {
    processingGuilds.delete(member.guild.id);
  }
}

async function handleMemberRemove(member) {
  if (!member.guild || member.user.bot) return;

  try {
    const data = getGuildData(member.guild.id);
    const inviterId = data.joinedBy[member.id];
    if (!inviterId) return;

    if (data.users[inviterId] > 0) data.users[inviterId]--;
    delete data.joinedBy[member.id];
    saveData();
  } catch (error) {
    console.error('❌ ERROR AL PROCESAR SALIDA EN INVITACIONES:', error);
  }
}

function getInvites(userId, guildId) {
  return getGuildData(guildId).users[userId] || 0;
}

function install(client) {
  loadData();

  client.once('ready', async () => {
    console.log('🔄 Cargando invitaciones de todos los servidores...');
    for (const guild of client.guilds.cache.values()) await refreshGuildInvites(guild);
    console.log(`✅ Sistema de invitaciones listo. Archivo: ${INVITES_FILE}`);
  });

  client.on('guildMemberAdd', handleMemberAdd);
  client.on('guildMemberRemove', handleMemberRemove);

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'invites') return;
    if (!interaction.guild) return;

    const total = getInvites(interaction.user.id, interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('🎟️ Tus invitaciones')
      .setDescription(`Actualmente tienes **${total} invitación${total === 1 ? '' : 'es'}** en la comunidad.`)
      .setColor(0x5865F2)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: 'Sistema de invitaciones' });

    await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
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
