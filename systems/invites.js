const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'invites.json');
const INVITE_CHANNEL_ID = '1543837870106869831';

function cargarDatos() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { guilds: {} };
    const datos = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return datos && typeof datos === 'object' ? datos : { guilds: {} };
  } catch (error) {
    console.error('❌ Error leyendo invites.json:', error);
    return { guilds: {} };
  }
}

const datos = cargarDatos();
if (!datos.guilds || typeof datos.guilds !== 'object') datos.guilds = {};

function guardarDatos() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2));
  } catch (error) {
    console.error('❌ Error guardando invites.json:', error);
  }
}

function obtenerGuild(guildId) {
  if (!datos.guilds[guildId]) {
    datos.guilds[guildId] = { users: {}, invitedBy: {} };
  }

  return datos.guilds[guildId];
}

function obtenerInvites(guildData, userId) {
  if (!guildData.users[userId]) {
    guildData.users[userId] = {
      invites: 0,
      joined: 0,
      left: 0
    };
  }

  return guildData.users[userId];
}

module.exports = (client) => {
  // Guardamos una copia de los usos actuales de las invitaciones para poder
  // detectar cuál aumentó cuando entra un nuevo miembro.
  const inviteCache = new Map();

  client.once('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        inviteCache.set(
          guild.id,
          new Map(invites.map(invite => [invite.code, invite.uses ?? 0]))
        );
      } catch (error) {
        console.error(`❌ No se pudieron cargar las invitaciones de ${guild.name}:`, error.message);
      }
    }
  });

  client.on('inviteCreate', invite => {
    const cache = inviteCache.get(invite.guild.id) ?? new Map();
    cache.set(invite.code, invite.uses ?? 0);
    inviteCache.set(invite.guild.id, cache);
  });

  client.on('inviteDelete', invite => {
    const cache = inviteCache.get(invite.guild.id);
    if (cache) cache.delete(invite.code);
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const invites = await member.guild.invites.fetch();
      const previousInvites = inviteCache.get(member.guild.id) ?? new Map();

      let usedInvite = null;

      for (const invite of invites.values()) {
        const previousUses = previousInvites.get(invite.code) ?? 0;
        const currentUses = invite.uses ?? 0;

        if (currentUses > previousUses) {
          usedInvite = invite;
          break;
        }
      }

      inviteCache.set(
        member.guild.id,
        new Map(invites.map(invite => [invite.code, invite.uses ?? 0]))
      );

      // Si Discord no permite determinar el invitador, no inventamos un usuario.
      if (!usedInvite || !usedInvite.inviter) return;

      const inviter = usedInvite.inviter;
      const guildData = obtenerGuild(member.guild.id);
      const inviterData = obtenerInvites(guildData, inviter.id);

      inviterData.invites += 1;
      inviterData.joined += 1;
      guildData.invitedBy[member.id] = inviter.id;
      guardarDatos();

      const channel = member.guild.channels.cache.get(INVITE_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) return;

      await channel.send(
        `**__${member.user}__ fue invitado por __${inviter}__ que tiene __${inviterData.invites}__ invitaciones.**`
      );
    } catch (error) {
      console.error('❌ Error procesando una invitación:', error);
    }
  });

  client.on('guildMemberRemove', member => {
    try {
      const guildData = datos.guilds[member.guild.id];
      if (!guildData) return;

      const inviterId = guildData.invitedBy[member.id];
      if (!inviterId) return;

      const inviterData = guildData.users[inviterId];
      if (inviterData) {
        inviterData.invites = Math.max(0, inviterData.invites - 1);
        inviterData.left += 1;
      }

      delete guildData.invitedBy[member.id];
      guardarDatos();
    } catch (error) {
      console.error('❌ Error actualizando invitaciones al salir un miembro:', error);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'invites') return;

    try {
      const guildData = obtenerGuild(interaction.guildId);
      const user = interaction.options.getUser('usuario') ?? interaction.user;
      const userData = obtenerInvites(guildData, user.id);

      const embed = new EmbedBuilder()
        .setTitle('📨 Invitaciones')
        .setDescription(`${user} tiene **${userData.invites}** invitaciones.`)
        .setColor('#5865F2')
        .setFooter({ text: 'Sistema de invitaciones' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('❌ Error ejecutando /invites:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Ocurrió un error al consultar las invitaciones.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Ocurrió un error al consultar las invitaciones.', ephemeral: true });
      }
    }
  });
};