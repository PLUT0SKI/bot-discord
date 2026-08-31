const fs = require('fs');
const path = require('path');
const { Client, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

const INVITES_FILE = path.join(__dirname, 'invites.json');
const INVITE_CHANNEL_ID = '1543837870106869831';

let inviteData = {};
const inviteCache = new Map();
const guildQueues = new Map();

function loadData() {
  try {
    if (!fs.existsSync(INVITES_FILE)) {
      inviteData = {};
      saveData();
      return;
    }

    const raw = fs.readFileSync(INVITES_FILE, 'utf8').trim();
    inviteData = raw ? JSON.parse(raw) : {};

    if (!inviteData || typeof inviteData !== 'object' || Array.isArray(inviteData)) {
      inviteData = {};
    }

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
    console.log('💾 Invitaciones guardadas en invites.json.');
  } catch (error) {
    console.error('❌ ERROR AL GUARDAR invites.json:', error);
  }
}

function getGuildData(guildId) {
  if (!inviteData[guildId]) {
    inviteData[guildId] = { users: {}, joinedBy: {} };
  }

  if (!inviteData[guildId].users) inviteData[guildId].users = {};
  if (!inviteData[guildId].joinedBy) inviteData[guildId].joinedBy = {};

  return inviteData[guildId];
}

async function fetchGuildInvites(guild) {
  try {
    const me = guild.members.me;

    if (me && !me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      console.error(`❌ ${guild.name}: el bot necesita "Gestionar servidor" para detectar invitaciones.`);
      return null;
    }

    const invites = await guild.invites.fetch();
    return invites;
  } catch (error) {
    console.error(`❌ No pude obtener las invitaciones de ${guild.name}: ${error.message}`);
    return null;
  }
}

function queueGuildTask(guildId, task) {
  const previous = guildQueues.get(guildId) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(task)
    .finally(() => {
      if (guildQueues.get(guildId) === next) {
        guildQueues.delete(guildId);
      }
    });

  guildQueues.set(guildId, next);
  return next;
}

async function handleMemberAdd(member) {
  if (!member.guild || member.user.bot) return;

  return queueGuildTask(member.guild.id, async () => {
    try {
      // Esperamos para que Discord actualice el contador de usos.
      await new Promise(resolve => setTimeout(resolve, 1500));

      const oldCache = inviteCache.get(member.guild.id);
      const newInvites = await fetchGuildInvites(member.guild);

      if (!newInvites) return;

      const newCache = new Map();
      let usedInvite = null;

      for (const invite of newInvites.values()) {
        const current = {
          uses: invite.uses ?? 0,
          inviterId: invite.inviter?.id ?? null
        };

        newCache.set(invite.code, current);

        const previous = oldCache?.get(invite.code);

        if (
          current.inviterId &&
          current.uses > (previous?.uses ?? 0)
        ) {
          if (!usedInvite || current.uses > usedInvite.uses) {
            usedInvite = current;
          }
        }
      }

      inviteCache.set(member.guild.id, newCache);

      if (!usedInvite?.inviterId) {
        console.log(`ℹ️ No se pudo determinar quién invitó a ${member.user.tag}.`);
        return;
      }

      const data = getGuildData(member.guild.id);
      const inviterId = usedInvite.inviterId;

      // Guardamos quién invitó a cada miembro para poder descontar
      // exactamente esa invitación cuando el miembro abandone el servidor.
      data.users[inviterId] = (data.users[inviterId] || 0) + 1;
      data.joinedBy[member.id] = inviterId;

      saveData();

      const total = data.users[inviterId];
      const channel = member.guild.channels.cache.get(INVITE_CHANNEL_ID);

      if (!channel || !channel.isTextBased()) {
        console.error(`❌ No encontré el canal de invitaciones ${INVITE_CHANNEL_ID}.`);
        return;
      }

      const mensaje = `**${member} fue invitado a la comunidad por <@${inviterId}> y ahora tiene __${total} invitación${total === 1 ? '' : 'es'}__.**`;
      await channel.send({ content: mensaje });

      console.log(`✅ ${member.user.tag} fue invitado por ${inviterId}. Total: ${total}`);
    } catch (error) {
      console.error('❌ ERROR EN SISTEMA DE INVITACIONES:', error);
    }
  });
}

async function handleMemberRemove(member) {
  if (!member.guild || member.user.bot) return;

  return queueGuildTask(member.guild.id, async () => {
    try {
      const data = getGuildData(member.guild.id);
      const inviterId = data.joinedBy[member.id];

      // Si no tenemos registrado quién lo invitó, no tocamos ningún contador.
      if (!inviterId) {
        console.log(`ℹ️ ${member.user.tag} salió, pero no tenía invitador registrado.`);
        return;
      }

      // El miembro salió: quitamos exactamente la invitación que había generado.
      const currentTotal = data.users[inviterId] || 0;
      data.users[inviterId] = Math.max(0, currentTotal - 1);

      // Eliminamos el vínculo porque el miembro ya no está dentro.
      delete data.joinedBy[member.id];

      saveData();

      console.log(`➖ ${member.user.tag} salió. Se descontó 1 invitación a ${inviterId}. Total: ${data.users[inviterId]}`);
    } catch (error) {
      console.error('❌ ERROR AL DESCONTAR INVITACIÓN:', error);
    }
  });
}

function getInvites(userId, guildId) {
  return getGuildData(guildId).users[userId] || 0;
}

async function initializeGuild(guild) {
  const invites = await fetchGuildInvites(guild);
  if (!invites) return;

  const cache = new Map();

  for (const invite of invites.values()) {
    cache.set(invite.code, {
      uses: invite.uses ?? 0,
      inviterId: invite.inviter?.id ?? null
    });
  }

  inviteCache.set(guild.id, cache);

  const data = getGuildData(guild.id);
  let changed = false;

  const discordTotals = {};

  for (const invite of invites.values()) {
    if (!invite.inviter?.id) continue;
    const uses = invite.uses ?? 0;
    discordTotals[invite.inviter.id] =
      (discordTotals[invite.inviter.id] || 0) + uses;
  }

  for (const [inviterId, discordTotal] of Object.entries(discordTotals)) {
    const savedTotal = data.users[inviterId] || 0;

    // Solo recuperamos un contador mayor al guardado. No lo bajamos aquí,
    // porque Discord conserva los usos históricos de una invitación aunque
    // el miembro invitado haya abandonado el servidor.
    if (discordTotal > savedTotal) {
      data.users[inviterId] = discordTotal;
      changed = true;
    }
  }

  if (changed) {
    saveData();
    console.log(`🔄 ${guild.name}: contadores recuperados desde Discord.`);
  }
}

function install(client) {
  loadData();

  client.once('ready', async () => {
    console.log('🔄 Cargando invitaciones de todos los servidores...');

    for (const guild of client.guilds.cache.values()) {
      await initializeGuild(guild);
    }

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

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
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
