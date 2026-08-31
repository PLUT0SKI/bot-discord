const fs = require('fs');
const path = require('path');
const { Client, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

const INVITES_FILE = path.join(__dirname, 'invites.json');
const INVITE_CHANNEL_ID = '1543837870106869831';

let inviteData = {};
const inviteCache = new Map();
const guildQueues = new Map();

function saveData() {
  try {
    const tempFile = `${INVITES_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inviteData, null, 2), 'utf8');
    fs.renameSync(tempFile, INVITES_FILE);
    console.log(`💾 Invitaciones guardadas: ${INVITES_FILE}`);
  } catch (error) {
    console.error('❌ ERROR AL GUARDAR invites.json:', error);
  }
}

function loadData() {
  try {
    if (!fs.existsSync(INVITES_FILE)) {
      inviteData = {};
      saveData();
      console.log('🆕 invites.json creado.');
      return;
    }

    const raw = fs.readFileSync(INVITES_FILE, 'utf8').trim();
    inviteData = raw ? JSON.parse(raw) : {};

    if (!inviteData || typeof inviteData !== 'object' || Array.isArray(inviteData)) {
      inviteData = {};
      saveData();
    }
  } catch (error) {
    console.error('❌ ERROR AL CARGAR invites.json:', error);
    inviteData = {};
    saveData();
  }
}

// Recarga el archivo justo antes de leer/escribir un contador.
// Esto evita que /invites y guildMemberAdd usen copias antiguas
// si el proceso fue reiniciado o existe más de una instancia activa.
function reloadData() {
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
  } catch (error) {
    console.error('❌ ERROR AL RECARGAR invites.json:', error);
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

    // cache:false fuerza una consulta nueva a Discord.
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

    if (usedInvite) {
      return { invites, usedInvite };
    }

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

      // Siempre leemos el contador más reciente antes de incrementarlo.
      reloadData();

      const data = getGuildData(member.guild.id);
      const inviterId = usedInvite.inviterId;
      const previousTotal = Number(data.users[inviterId] || 0);
      const total = previousTotal + 1;

      data.users[inviterId] = total;
      data.joinedBy[member.id] = inviterId;

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
  reloadData();
  return Number(getGuildData(guildId).users[userId] || 0);
}

async function initializeGuild(guild) {
  const invites = await fetchGuildInvites(guild);
  if (!invites) return;

  inviteCache.set(guild.id, makeInviteCache(invites));

  // IMPORTANTE: no reconstruimos los contadores usando invite.uses.
  // invite.uses es el uso histórico de Discord y puede no coincidir
  // con el contador persistente del bot. El contador oficial del sistema
  // es invites.json y solo cambia cuando nuestro bot detecta una entrada.
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
