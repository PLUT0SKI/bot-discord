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

    console.log('✅ invites.json cargado correctamente.');
  } catch (error) {
    console.error('❌ ERROR AL CARGAR invites.json:', error);
    inviteData = {};
    saveData();
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

    return await guild.invites.fetch();
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
      inviterId: invite.inviter?.id ?? null
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
  // Discord puede tardar un poco en actualizar invite.uses.
  // Hacemos varios intentos para evitar falsos "no se pudo determinar".
  for (let attempt = 0; attempt < 6; attempt++) {
    const invites = await fetchGuildInvites(guild);
    if (!invites) return { invites: null, usedInvite: null };

    let usedInvite = null;

    for (const invite of invites.values()) {
      const previous = oldCache?.get(invite.code);
      const currentUses = invite.uses ?? 0;
      const previousUses = previous?.uses ?? 0;
      const inviterId = invite.inviter?.id ?? previous?.inviterId ?? null;

      if (inviterId && currentUses > previousUses) {
        if (!usedInvite || currentUses > usedInvite.uses) {
          usedInvite = {
            code: invite.code,
            uses: currentUses,
            inviterId
          };
        }
      }
    }

    if (usedInvite) {
      return { invites, usedInvite };
    }

    if (attempt < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

      data.users[inviterId] = (data.users[inviterId] || 0) + 1;
      data.joinedBy[member.id] = inviterId;

      // Guardamos inmediatamente después de cada invitación.
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
      console.log(`💾 invites.json actualizado para ${inviterId}: ${total}`);
    } catch (error) {
      console.error('❌ ERROR EN SISTEMA DE INVITACIONES:', error);
    }
  });
}

async function handleMemberRemove(member) {
  if (!member.guild || member.user.bot) return;

  // No descontamos invitaciones cuando alguien abandona.
  console.log(`ℹ️ ${member.user.tag} salió. No se descontó la invitación.`);
}

function getInvites(userId, guildId) {
  return getGuildData(guildId).users[userId] || 0;
}

async function initializeGuild(guild) {
  const invites = await fetchGuildInvites(guild);
  if (!invites) return;

  const cache = makeInviteCache(invites);
  inviteCache.set(guild.id, cache);

  const data = getGuildData(guild.id);
  const discordTotals = {};
  let changed = false;

  // Recupera usos de invitaciones que Discord todavía conserva.
  for (const invite of invites.values()) {
    const inviterId = invite.inviter?.id;
    if (!inviterId) continue;

    const uses = invite.uses ?? 0;
    discordTotals[inviterId] = (discordTotals[inviterId] || 0) + uses;
  }

  for (const [inviterId, discordTotal] of Object.entries(discordTotals)) {
    const savedTotal = data.users[inviterId] || 0;

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

module.exports = { install, getInvites, refreshGuildInvites };
