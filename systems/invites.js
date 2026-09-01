const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'invites.json');
const INVITE_CHANNEL_ID = '1543837870106869831';
const INVITES_ROLE_ID = '1357832740149399635';

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

function reconstruirInvitaciones(guild, invites) {
  const guildData = obtenerGuild(guild.id);
  const totales = {};

  for (const invite of invites.values()) {
    if (!invite.inviter || !invite.uses) continue;
    totales[invite.inviter.id] = (totales[invite.inviter.id] || 0) + invite.uses;
  }

  // Discord conserva el contador de usos de las invitaciones. Al reiniciar,
  // reconstruimos los totales desde Discord en lugar de depender de la memoria
  // del proceso o de un archivo que pueda desaparecer al recrearse el contenedor.
  for (const [userId, total] of Object.entries(totales)) {
    const userData = obtenerInvites(guildData, userId);
    userData.invites = total;
  }

  guardarDatos();
}

module.exports = (client) => {
  const inviteCache = new Map();

  client.once('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();

        reconstruirInvitaciones(guild, invites);

        inviteCache.set(
          guild.id,
          new Map(invites.map(invite => [invite.code, invite.uses ?? 0]))
        );

        console.log(`✅ Invitaciones sincronizadas en ${guild.name}.`);
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

      if (!usedInvite || !usedInvite.inviter) return;

      const inviter = usedInvite.inviter;
      const guildData = obtenerGuild(member.guild.id);
      const inviterData = obtenerInvites(guildData, inviter.id);

      // Usamos el contador real de Discord. Esto evita que un reinicio provoque
      // que el bot empiece otra vez desde cero.
      const totalInvites = [...invites.values()]
        .filter(invite => invite.inviter?.id === inviter.id)
        .reduce((total, invite) => total + (invite.uses ?? 0), 0);

      inviterData.invites = totalInvites;
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

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'invites') return;

    try {
      if (!interaction.member || !interaction.member.roles.cache.has(INVITES_ROLE_ID)) {
        await interaction.reply({
          content: '❌ No tienes permiso para usar este comando.',
          ephemeral: true
        });
        return;
      }

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