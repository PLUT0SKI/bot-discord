const { EmbedBuilder, PermissionsBitField, ChannelType, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { verificarAcceso } = require('../utils/commandAccess');

const LOGS_FILE = './logsConfig.json';
let logsConfig = {};
if (fs.existsSync(LOGS_FILE)) {
  try { logsConfig = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')); console.log('CONFIGURACIÓN DE LOGS CARGADA.'); }
  catch (error) { console.error('ERROR AL CARGAR logsConfig.json:', error); }
}
function guardarLogsConfig() {
  try { fs.writeFileSync(LOGS_FILE, JSON.stringify(logsConfig, null, 2)); }
  catch (error) { console.error('ERROR AL GUARDAR CONFIGURACIÓN DE LOGS:', error); }
}

const spamUsers = new Map();
const mensajesEliminadosPorBot = new Set();
const mensajesEliminadosPorClear = new Set();
const SPAM_LIMIT = 5;
const SPAM_TIME = 5000;
const MUTE_TIME = 60000;
const LINK_REGEX = /https?:\/\/[^\s<]+/gi;

function esGifPermitido(url) {
  try {
    const u = url.toLowerCase();
    return /\.gif(?:\?[^\s]*)?$/i.test(u) || u.includes('tenor.com') || u.includes('giphy.com');
  } catch { return false; }
}
function obtenerLinksNoPermitidos(contenido) {
  if (!contenido) return [];
  const links = contenido.match(LINK_REGEX);
  return links ? links.filter(link => !esGifPermitido(link)) : [];
}

async function enviarLog(guild, embed) {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const configActual = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) || {};
      logsConfig = configActual;
    }
  } catch (error) {
    console.error('ERROR AL RECARGAR CONFIGURACIÓN DE LOGS:', error);
  }

  const id = logsConfig[guild.id];
  if (!id) return;
  const canal = guild.channels.cache.get(id);
  if (!canal) return;
  await canal.send({ embeds: [embed] }).catch(() => {});
}

function crearLogModeracion({ titulo, descripcion, color, usuario, moderador, extra = [] }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(descripcion)
    .addFields(
      { name: '👤 Usuario', value: `<@${usuario.id}> \`${usuario.tag}\``, inline: false },
      { name: '🆔 ID', value: `\`${usuario.id}\``, inline: true },
      { name: '🛡️ Moderador', value: moderador ? `<@${moderador.id}> \`${moderador.tag}\`` : 'No identificado', inline: true },
      ...extra,
      { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setThumbnail(usuario.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'Sistema de moderación' })
    .setTimestamp();
  return embed;
}

async function obtenerModerador(guild, tipo, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: tipo, limit: 6 });
    const entrada = logs.entries.find(entry =>
      entry.target?.id === targetId && Date.now() - entry.createdTimestamp < 10000
    );
    if (!entrada) return null;
    return entrada.executor || null;
  } catch { return null; }
}

async function obtenerDatosTimeout(guild, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 10 });
    const entrada = logs.entries.find(entry =>
      entry.target?.id === targetId &&
      Date.now() - entry.createdTimestamp < 10000 &&
      entry.changes?.some(change => change.key === 'communication_disabled_until')
    );
    if (!entrada) return null;
    return {
      moderador: entrada.executor || null,
      cambio: entrada.changes?.find(change => change.key === 'communication_disabled_until') || null
    };
  } catch { return null; }
}

function formatearDuracion(ms) {
  if (!ms || ms <= 0) return 'Sin duración';
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''}`;
  if (horas > 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
  if (minutos > 0) return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
  return `${segundos} segundo${segundos !== 1 ? 's' : ''}`;
}

async function enviarLogSpam(guild, member, cantidad) {
  const embed = crearLogModeracion({
    titulo: '🚨 Spam detectado',
    descripcion: `Se detectó actividad de spam de <@${member.id}>.`,
    color: '#ff9900',
    usuario: member.user,
    moderador: null,
    extra: [
      { name: '💬 Mensajes detectados', value: `\`${cantidad}\``, inline: true },
      { name: '🔇 Acción', value: 'Silencio automático', inline: true }
    ]
  });
  await enviarLog(guild, embed);
}

async function enviarLogLink(guild, member, links) {
  const embed = crearLogModeracion({
    titulo: '🔗 Enlace bloqueado',
    descripcion: `Se eliminó un mensaje con un enlace no permitido de <@${member.id}>.`,
    color: '#ff4444',
    usuario: member.user,
    moderador: null,
    extra: [
      { name: '🔗 Enlace(s)', value: links.slice(0, 3).map(link => `\`${link}\``).join('\n').slice(0, 1024) || 'No disponible', inline: false },
      { name: '🛡️ Acción', value: 'Mensaje eliminado', inline: true }
    ]
  });
  await enviarLog(guild, embed);
}

module.exports = (client) => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'setlogs') return;
    try {
      if (!(await verificarAcceso(interaction))) return;
      if (!interaction.guild) {
        return await interaction.reply({ content: '❌ Este comando solo puede usarse dentro de un servidor.', ephemeral: true });
      }
      const canal = interaction.options.getChannel('canal');
      if (!canal || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(canal.type)) {
        return await interaction.reply({ content: '❌ Debes seleccionar un canal de texto válido.', ephemeral: true });
      }
      logsConfig[interaction.guild.id] = canal.id;
      guardarLogsConfig();
      return await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#00cc66').setTitle('✅ Logs configurados').setDescription(`El canal de logs ahora es <#${canal.id}>.`).setFooter({ text: 'Sistema de logs' }).setTimestamp()],
        ephemeral: true
      });
    } catch (error) {
      console.error('ERROR EN /setlogs:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Ocurrió un error al configurar los logs.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Ocurrió un error al configurar los logs.', ephemeral: true }).catch(() => {});
      }
    }
  });

  client.on('messageDelete', async message => {
    if (!message.guild || message.partial) return;
    if (mensajesEliminadosPorBot.has(message.id)) {
      mensajesEliminadosPorBot.delete(message.id);
      return;
    }
    if (mensajesEliminadosPorClear.has(message.id)) {
      mensajesEliminadosPorClear.delete(message.id);
      return;
    }
    const embed = new EmbedBuilder()
      .setColor('#ff4444')
      .setTitle('🗑️ Mensaje eliminado')
      .setDescription(`Se eliminó un mensaje en <#${message.channel.id}>.`)
      .addFields(
        { name: '👤 Usuario', value: `${message.author ? `<@${message.author.id}> \`${message.author.tag}\`` : 'Desconocido'}`, inline: true },
        { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
        { name: '💬 Contenido', value: message.content?.slice(0, 1024) || 'Sin contenido de texto', inline: false }
      )
      .setFooter({ text: 'Sistema de moderación' })
      .setTimestamp();
    await enviarLog(message.guild, embed);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('✏️ Mensaje editado')
      .setDescription(`Se editó un mensaje en <#${newMessage.channel.id}>.`)
      .addFields(
        { name: '👤 Usuario', value: `${newMessage.author ? `<@${newMessage.author.id}> \`${newMessage.author.tag}\`` : 'Desconocido'}`, inline: false },
        { name: '📍 Canal', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: '📝 Antes', value: oldMessage.content?.slice(0, 1024) || 'Sin contenido', inline: false },
        { name: '📝 Después', value: newMessage.content?.slice(0, 1024) || 'Sin contenido', inline: false }
      )
      .setFooter({ text: 'Sistema de moderación' })
      .setTimestamp();
    await enviarLog(newMessage.guild, embed);
  });

  client.on('guildMemberRemove', async member => {
    const moderador = await obtenerModerador(member.guild, AuditLogEvent.MemberKick, member.id);
    if (!moderador) return;
    const embed = crearLogModeracion({
      titulo: '👢 Usuario expulsado',
      descripcion: `<@${member.id}> fue expulsado del servidor.`,
      color: '#ff8800',
      usuario: member.user,
      moderador
    });
    await enviarLog(member.guild, embed);
  });

  client.on('guildBanAdd', async ban => {
    const moderador = await obtenerModerador(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    const embed = crearLogModeracion({
      titulo: '🔨 Usuario baneado',
      descripcion: `<@${ban.user.id}> fue baneado del servidor.`,
      color: '#ff0000',
      usuario: ban.user,
      moderador
    });
    await enviarLog(ban.guild, embed);
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
      const datos = await obtenerDatosTimeout(newMember.guild, newMember.id);
      const embed = crearLogModeracion({
        titulo: '🔇 Usuario silenciado',
        descripcion: `<@${newMember.id}> recibió un timeout.`,
        color: '#8e44ad',
        usuario: newMember.user,
        moderador: datos?.moderador || null,
        extra: [{ name: '⏱️ Duración', value: formatearDuracion(newMember.communicationDisabledUntilTimestamp - Date.now()), inline: true }]
      });
      await enviarLog(newMember.guild, embed);
    } else if (oldMember.communicationDisabledUntilTimestamp && !newMember.communicationDisabledUntilTimestamp) {
      const datos = await obtenerDatosTimeout(newMember.guild, newMember.id);
      const embed = crearLogModeracion({
        titulo: '🔊 Silencio retirado',
        descripcion: `Se retiró el timeout a <@${newMember.id}>.`,
        color: '#2ecc71',
        usuario: newMember.user,
        moderador: datos?.moderador || null
      });
      await enviarLog(newMember.guild, embed);
    }

    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());
    const agregados = [...newRoles].filter(id => !oldRoles.has(id));
    const quitados = [...oldRoles].filter(id => !newRoles.has(id));

    for (const roleId of agregados) {
      if (roleId === newMember.guild.id) continue;
      const role = newMember.guild.roles.cache.get(roleId);
      if (!role) continue;
      const moderador = await obtenerModerador(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      const embed = crearLogModeracion({
        titulo: '➕ Rol agregado',
        descripcion: `Se agregó un rol a <@${newMember.id}>.`,
        color: '#00cc66',
        usuario: newMember.user,
        moderador,
        extra: [{ name: '🏷️ Rol', value: `<@&${role.id}> \`${role.name}\``, inline: true }]
      });
      await enviarLog(newMember.guild, embed);
    }

    for (const roleId of quitados) {
      if (roleId === newMember.guild.id) continue;
      const role = oldMember.guild.roles.cache.get(roleId);
      if (!role) continue;
      const moderador = await obtenerModerador(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      const embed = crearLogModeracion({
        titulo: '➖ Rol eliminado',
        descripcion: `Se quitó un rol a <@${newMember.id}>.`,
        color: '#ff4444',
        usuario: newMember.user,
        moderador,
        extra: [{ name: '🏷️ Rol', value: `<@&${role.id}> \`${role.name}\``, inline: true }]
      });
      await enviarLog(newMember.guild, embed);
    }
  });

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.member) return;

    const linksNoPermitidos = obtenerLinksNoPermitidos(message.content);
    if (linksNoPermitidos.length) {
      try {
        mensajesEliminadosPorBot.add(message.id);
        await message.delete();
      } catch {}
      await enviarLogLink(message.guild, message.member, linksNoPermitidos);
      return;
    }

    const ahora = Date.now();
    let datos = spamUsers.get(message.member.id);
    if (!datos || ahora - datos.ultimo > SPAM_TIME) {
      datos = { mensajes: [], ultimo: ahora, silenciado: false };
      spamUsers.set(message.member.id, datos);
    }
    datos.mensajes.push(ahora);
    datos.mensajes = datos.mensajes.filter(t => ahora - t <= SPAM_TIME);
    datos.ultimo = ahora;

    if (datos.mensajes.length >= SPAM_LIMIT && !datos.silenciado) {
      datos.silenciado = true;
      try {
        if (message.member.moderatable) {
          await message.member.timeout(MUTE_TIME, 'Spam automático');
        }
      } catch {}
      await enviarLogSpam(message.guild, message.member, datos.mensajes.length);
      setTimeout(() => {
        const u = spamUsers.get(message.member.id);
        if (u) {
          u.silenciado = false;
          u.mensajes = [];
        }
      }, MUTE_TIME);
    }
  });
};
