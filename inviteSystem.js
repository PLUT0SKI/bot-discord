const fs = require('fs');
const path = require('path');
const { Client, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

const INVITES_FILE = path.join(__dirname, 'invites.json');
const INVITES_BACKUP_FILE = path.join(__dirname, 'invites.backup.json');
const INVITE_CHANNEL_ID = '1543837870106869831';

let inviteData = {};
const inviteCache = new Map();
const guildQueues = new Map();

function writeJsonAtomic(file, data) {
  const tempFile = `${file}.tmp`;
  const content = JSON.stringify(data, null, 2);
  const fd = fs.openSync(tempFile, 'w');
  try {
    fs.writeSync(fd, content, null, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempFile, file);
}

function saveData() {
  try {
    writeJsonAtomic(INVITES_FILE, inviteData);
    writeJsonAtomic(INVITES_BACKUP_FILE, inviteData);
    console.log(`💾 Invitaciones guardadas: ${INVITES_FILE}`);
  } catch (error) {
    console.error('❌ ERROR AL GUARDAR invites.json:', error);
  }
}

function isValidInviteData(data) {
  return data && typeof data === 'object' && !Array.isArray(data);
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return isValidInviteData(parsed) ? parsed : null;
}

function loadData() {
  try {
    let loaded = null;

    try {
      loaded = readJson(INVITES_FILE);
    } catch (error) {
      console.error('⚠️ invites.json está dañado. Intentando recuperar el respaldo...');
    }

    if (!loaded) {
      try {
        loaded = readJson(INVITES_BACKUP_FILE);
      } catch (error) {
        console.error('⚠️ invites.backup.json también está dañado o no existe.');
      }
    }

    if (loaded) {
      inviteData = loaded;
      console.log('✅ invites.json cargado correctamente.');
      return;
    }

    inviteData = {};
    saveData();
    console.log('🆕 invites.json creado correctamente.');
  } catch (error) {
    console.error('❌ ERROR AL CARGAR EL SISTEMA DE INVITACIONES:', error);
    inviteData = {};
  }
}

function getGuildData(guildId) {
  if (!inviteData[guildId]) {
    inviteData[guildId] = {
      users: {},
      joinedBy: {}
    };
  }

  if (!inviteData[guildId].users) inviteData[guildId].users = {};
  if (!inviteData[guildId].joinedBy) inviteData[guildId].joinedBy = {};

  return inviteData[guildId];
}

async function fetchGuildInvites(guild) {
  try {
    const me = guild.members.me;

    if (me && !me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      console.error(`❌ ${guild.name}: el bot necesita el permiso "Gestionar servidor".`);
      return null;
    }

    return await guild.invites.fetch({ cache: false });
  } catch (error) {
    console.error(`❌ No pude obtener las invitaciones de ${guild.name}: ${error.message}`);
    return null;
  }
}

function makeInviteCache(invites) {
  const cache = new Map();

  for (const invite of invites.values()) {
    cache.set(invite.code, {
      uses: invite.uses ?? 0,
      inviterId: invite.inviter?.id ?? invite.inviterId ?? null
    });
  }

  return cache;
}

async function refreshGuildInvites(guild) {
  const invites = await fetchGuildInvites(guild);
  if (!invites) return null;

  const cache = makeInviteCache(invites);
  inviteCache.set(guild.id, cache);
  return cache;
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

async function findUsedInvite(guild, oldCache) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const invites = await fetchGuildInvites(guild);
    if (!invites) return { invites: null, usedInvite: null };

    let usedInvite = null;

    for (const invite of invites.values()) {
      const previous = oldCache?.get(invite.code);
      const currentUses = invite.uses ?? 0;
      const previousUses = previous?.uses ?? 0;
      const inviterId = invite.inviter?.id ?? invite.inviterId ?? previous?.inviterId ?? null;

      if (inviterId && currentUses > previousUses) {
        if (!usedInvite || currentUses - previousUses > usedInvite.delta) {
          usedInvite = {
            code: invite.code,
            uses: currentUses,
            delta: currentUses - previousUses,
            inviterId
          };
        }
      }
    }

    if (usedInvite) return { invites, usedInvite };

    if (attempt < 7) {
      await new Promise(resolve => setTimeout(resolve, 750));
    }
  }

  const latestInvites = await fetchGuildInvites(guild);
  return { invites: latestInvites, usedInvite: null };
}

async function handleMemberAdd(member) {
  if (!member.guild || member.user.bot) return;

  return queueGuildTask(member.guild.id, async () => {
    try {
      const oldCache = inviteCache.get(member.guild.id);
      const result = await findUsedInvite(member.guild, oldCache);
      const newInvites = result.invites;
      const usedInvite = result.usedInvite;

      if (newInvites) {
        inviteCache.set(member.guild.id, makeInviteCache(newInvites));
      }

      if (!usedInvite?.inviterId) {
        console.log(`⚠️ No se pudo determinar quién invitó a ${member.user.tag}.`);
        return;
      }

      const data = getGuildData(member.guild.id);
      const inviterId = usedInvite.inviterId;
      const previousTotal = Number(data.users[inviterId] || 0);
      const total = previousTotal + 1;

      // ESTE es el único contador oficial del sistema.
      // Tanto el mensaje de entrada como /invites leen este mismo valor.
      data.users[inviterId] = total;
      data.joinedBy[member.id] = inviterId;

      // Guardar inmediatamente para que sobreviva a reinicios.
      saveData();

      const channel = member.guild.channels.cache.get(INVITE_CHANNEL_ID);

      if (!channel || !channel.isTextBased()) {
        console.error(`❌ No encontré el canal de invitaciones ${INVITE_CHANNEL_ID}.`);
        return;
      }

      const mensaje = `**${member} fue invitado a la comunidad por <@${inviterId}> y ahora tiene __${total} invitación${total === 1 ? '' : 'es'}__.**`;
      await channel.send({ content: mensaje });

      console.log(`✅ ${member.user.tag} fue invitado por ${inviterId}. Antes: ${previousTotal}. Ahora: ${total}`);
      console.log(`💾 invites.json actualizado para ${inviterId}: ${total}`);
    } catch (error) {
      console.error('❌ ERROR EN SISTEMA DE INVITACIONES:', error);
    }
  });
}

async function handleMemberRemove(member) {
  if (!member.guild || member.user.bot) return;
  console.log(`ℹ️ ${member.user.tag} salió. No se descontó la invitación.`);
}

function getInvites(userId, guildId) {
  // IMPORTANTE: NO recargamos invites.json aquí.
  // /invites debe leer exactamente el mismo objeto en memoria
  // que acaba de actualizar guildMemberAdd. Así nunca puede mostrar
  // 0 mientras el mensaje de entrada muestra 1.
  const data = getGuildData(guildId);
  return Number(data.users[userId] || 0);
}

async function initializeGuild(guild) {
  const invites = await fetchGuildInvites(guild);
  if (!invites) return;

  inviteCache.set(guild.id, makeInviteCache(invites));
  console.log(`✅ ${guild.name}: ${invites.size} invitaciones cargadas en caché.`);
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

module.exports = { install, getInvites, refreshGuildInvites };
