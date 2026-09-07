const { EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const fs = require('fs');

const LOGS_FILE = './logsConfig.json';
let logsConfig = {};
if (fs.existsSync(LOGS_FILE)) {
  try { logsConfig = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')); console.log('CONFIGURACIÓN DE LOGS CARGADA.'); }
  catch (error) { console.error('ERROR AL CARGAR logsConfig.json:', error); }
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
  const id = logsConfig[guild.id];
  if (!id) return;
  const canal = guild.channels.cache.get(id);
  if (!canal) return;
  await canal.send({ embeds: [embed] }).catch(error => console.error('ERROR AL ENVIAR LOG:', error));
}

function crearEmbedModeracion({ titulo, descripcion, color, usuario, moderador, motivo, extraNombre, extraValor, motivoInline = false }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(descripcion)
    .addFields(
      { name: '👤 Usuario', value: `<@${usuario.id}>`, inline: false },
      { name: '🆔 ID', value: `\`${usuario.id}\``, inline: true },
      { name: '👮 Moderador', value: moderador ? `<@${moderador.id}>` : 'No identificado', inline: true }
    );

  if (motivoInline) {
    embed.addFields({
      name: '📝 Motivo',
      value: `\`${(motivo || 'Sin motivo especificado').slice(0, 1020)}\``,
      inline: true
    });
  }

  if (extraNombre && extraValor) embed.addFields({ name: extraNombre, value: extraValor, inline: true });
  if (motivo && !motivoInline) embed.addFields({ name: '📝 Motivo', value: motivo.slice(0, 1024), inline: false });

  embed.addFields({ name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false })
    .setThumbnail(usuario.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'Sistema de seguridad' })
    .setTimestamp();

  return embed;
}

async function obtenerModerador(guild, tipo, targetId) {
  for (let intento = 0; intento < 5; intento++) {
    try {
      const logs = await guild.fetchAuditLogs({ type: tipo, limit: 10 });
      const entrada = logs.entries.find(entry =>
        entry.targetId === targetId &&
        Date.now() - entry.createdTimestamp < 15000
      );
      if (entrada) return entrada;
    } catch (error) {
      console.error(`ERROR AL OBTENER AUDIT LOG (INTENTO ${intento + 1}):`, error);
    }
    if (intento < 4) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

async function enviarLogSpam(member, cantidad, canal) {
  const embed = new EmbedBuilder().setColor('#ff0000').setTitle('🚨 Spam detectado')
    .setDescription('Un usuario fue silenciado automáticamente por enviar demasiados mensajes en poco tiempo.')
    .addFields(
      { name: '👤 Usuario', value: `<@${member.id}>`, inline: false },
      { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
      { name: '📨 Mensajes', value: `\`${cantidad}\``, inline: true },
      { name: '⏱️ Silenciado', value: '`60 segundos`', inline: true },
      { name: '📍 Canal', value: canal ? `<#${canal.id}>` : 'No disponible', inline: true },
      { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ).setThumbnail(member.user.displayAvatarURL({ size: 256 })).setFooter({ text: 'Sistema de seguridad' }).setTimestamp();
  await enviarLog(member.guild, embed);
}

async function enviarLogLink(member, link, canal) {
  const embed = new EmbedBuilder().setColor('#ff0000').setTitle('🚨 Link dudoso detectado')
    .setDescription('Un usuario envió un enlace no permitido. El mensaje fue eliminado automáticamente.')
    .addFields(
      { name: '👤 Usuario', value: `<@${member.id}>`, inline: false },
      { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
      { name: '📍 Canal', value: canal ? `<#${canal.id}>` : 'No disponible', inline: true },
      { name: '🔗 Link eliminado', value: `\`\`\`${link.slice(0, 1000)}\`\`\``, inline: false },
      { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ).setThumbnail(member.user.displayAvatarURL({ size: 256 })).setFooter({ text: 'Sistema de seguridad' }).setTimestamp();
  await enviarLog(member.guild, embed);
}

module.exports = (client) => {
  client.on('messageDelete', async (message) => {
    try {
      if (mensajesEliminadosPorBot.delete(message.id)) return;
      if (mensajesEliminadosPorClear.delete(message.id)) return;
      if (!message.guild || !message.author || message.author.bot) return;
      const contenido = message.content?.trim() || '*Sin contenido de texto*';
      const embed = new EmbedBuilder().setColor('#ff0000').setTitle('🗑️ Mensaje eliminado')
        .setDescription('Un mensaje fue eliminado de un canal.')
        .addFields(
          { name: '👤 Usuario', value: `<@${message.author.id}>`, inline: false },
          { name: '🆔 ID', value: `\`${message.author.id}\``, inline: true },
          { name: '📍 Canal', value: `<#${message.channel.id}>`, inline: true },
          { name: '💬 Mensaje', value: `\`\`\`${contenido.slice(0, 1000)}\`\`\``, inline: false },
          { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        ).setThumbnail(message.author.displayAvatarURL({ size: 256 })).setFooter({ text: 'Sistema de seguridad' }).setTimestamp();
      await enviarLog(message.guild, embed);
    } catch (error) { console.error('ERROR AL ENVIAR LOG DE MENSAJE ELIMINADO:', error); }
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (!newMessage.guild || !newMessage.author || newMessage.author.bot || oldMessage.partial || newMessage.partial || oldMessage.content === newMessage.content) return;
      const anterior = oldMessage.content?.trim() || '*Sin contenido*';
      const nuevo = newMessage.content?.trim() || '*Sin contenido*';
      const embed = new EmbedBuilder().setColor('#ffaa00').setTitle('✏️ Mensaje editado').setDescription('Un usuario editó un mensaje.')
        .addFields(
          { name: '👤 Usuario', value: `<@${newMessage.author.id}>`, inline: false },
          { name: '🆔 ID', value: `\`${newMessage.author.id}\``, inline: true },
          { name: '📍 Canal', value: `<#${newMessage.channel.id}>`, inline: true },
          { name: '📝 Antes', value: `\`\`\`${anterior.slice(0, 1000)}\`\`\``, inline: false },
          { name: '✏️ Después', value: `\`\`\`${nuevo.slice(0, 1000)}\`\`\``, inline: false },
          { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        ).setThumbnail(newMessage.author.displayAvatarURL({ size: 256 })).setFooter({ text: 'Sistema de seguridad' }).setTimestamp();
      await enviarLog(newMessage.guild, embed);
    } catch (error) { console.error('ERROR AL ENVIAR LOG DE MENSAJE EDITADO:', error); }
  });

  client.on('messageCreate', async (message) => {
    try {
      if (!message.guild || message.author.bot || !message.member) return;
      if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      const links = obtenerLinksNoPermitidos(message.content);
      if (links.length) {
        try {
          mensajesEliminadosPorBot.add(message.id);
          await message.delete();
          await enviarLogLink(message.member, links[0], message.channel);
        } catch (error) { mensajesEliminadosPorBot.delete(message.id); console.error('ERROR AL ELIMINAR LINK:', error); }
        return;
      }
      const now = Date.now();
      let data = spamUsers.get(message.author.id);
      if (!data) { data = { mensajes: [], silenciado: false }; spamUsers.set(message.author.id, data); }
      data.mensajes = data.mensajes.filter(x => now - x.timestamp <= SPAM_TIME);
      data.mensajes.push({ timestamp: now, message });
      if (data.mensajes.length >= SPAM_LIMIT && !data.silenciado) {
        data.silenciado = true;
        const spamMessages = [...data.mensajes];
        data.mensajes = [];
        try {
          if (message.member.moderatable) {
            await message.member.timeout(MUTE_TIME, 'Spam detectado automáticamente');
            for (const item of spamMessages) {
              try { if (item.message && !item.message.deleted) { mensajesEliminadosPorBot.add(item.message.id); await item.message.delete(); } }
              catch { mensajesEliminadosPorBot.delete(item.message?.id); }
            }
            await enviarLogSpam(message.member, spamMessages.length, message.channel);
            setTimeout(() => { const u = spamUsers.get(message.member.id); if (u) { u.silenciado = false; u.mensajes = []; } }, MUTE_TIME);
          } else data.silenciado = false;
        } catch (error) { data.silenciado = false; console.error('ERROR AL SILENCIAR USUARIO:', error); }
      }
    } catch (error) { console.error('ERROR EN DETECTOR DE SPAM/LINKS:', error); }
  });

  client.on('guildBanAdd', async (ban) => {
    try {
      const entrada = await obtenerModerador(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      const embed = crearEmbedModeracion({
        titulo: '🔨 Usuario baneado',
        descripcion: 'Un usuario fue baneado del servidor.',
        color: '#ff0000',
        usuario: ban.user,
        moderador: entrada?.executor,
        motivo: entrada?.reason || 'Sin motivo especificado',
        motivoInline: true
      });
      await enviarLog(ban.guild, embed);
    } catch (error) { console.error('ERROR AL ENVIAR LOG DE BANEO:', error); }
  });

  client.on('guildAuditLogEntryCreate', async (entrada, guild) => {
    try {
      if (entrada.action !== AuditLogEvent.MemberKick) return;
      if (!entrada.targetId) return;
      const usuario = entrada.target || await client.users.fetch(entrada.targetId).catch(() => null);
      if (!usuario) return;
      const embed = crearEmbedModeracion({
        titulo: '👢 Usuario expulsado',
        descripcion: 'Un usuario fue expulsado del servidor.',
        color: '#ff9900',
        usuario,
        moderador: entrada.executor,
        motivo: entrada.reason || 'Sin motivo especificado',
        motivoInline: true
      });
      await enviarLog(guild, embed);
    } catch (error) { console.error('ERROR AL ENVIAR LOG DE EXPULSIÓN:', error); }
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      const oldTimeout = oldMember.communicationDisabledUntilTimestamp || null;
      const newTimeout = newMember.communicationDisabledUntilTimestamp || null;

      if (oldTimeout !== newTimeout) {
        const ahora = Date.now();
        const fueSilenciado = newTimeout !== null && newTimeout > ahora;
        const fueDesilenciado = oldTimeout !== null && newTimeout === null;

        if (fueSilenciado || fueDesilenciado) {
          let entrada = null;
          try {
            entrada = await obtenerModerador(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
          } catch (error) {
            console.error('ERROR AL BUSCAR MODERADOR DEL TIMEOUT:', error);
          }

          const motivo = entrada?.reason || 'Sin motivo especificado';
          const embed = crearEmbedModeracion({
            titulo: fueSilenciado ? '🔇 Usuario silenciado' : '🔊 Silencio retirado',
            descripcion: fueSilenciado ? 'Un usuario fue silenciado en el servidor.' : 'El silencio de un usuario fue retirado.',
            color: fueSilenciado ? '#ffcc00' : '#00cc66',
            usuario: newMember.user,
            moderador: entrada?.executor,
            motivo,
            motivoInline: fueDesilenciado,
            extraNombre: fueSilenciado ? '⏱️ Duración' : null,
            extraValor: fueSilenciado ? `<t:${Math.floor(newTimeout / 1000)}:R>` : null
          });

          await enviarLog(newMember.guild, embed);
        }
      }

      const oldRoles = new Set(oldMember.roles.cache.keys());
      const newRoles = new Set(newMember.roles.cache.keys());
      const agregados = [...newRoles].filter(id => !oldRoles.has(id));
      const retirados = [...oldRoles].filter(id => !newRoles.has(id));

      for (const roleId of agregados) {
        if (roleId === newMember.guild.id) continue;
        const rol = newMember.guild.roles.cache.get(roleId);
        if (!rol) continue;
        const entrada = await obtenerModerador(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        const embed = crearEmbedModeracion({
          titulo: '➕ Rol agregado',
          descripcion: 'Se agregó un rol a un usuario.',
          color: '#00cc66',
          usuario: newMember.user,
          moderador: entrada?.executor,
          motivo: entrada?.reason || 'Sin motivo especificado',
          extraNombre: '🏷️ Rol',
          extraValor: `<@&${rol.id}>`
        });
        await enviarLog(newMember.guild, embed);
      }

      for (const roleId of retirados) {
        if (roleId === newMember.guild.id) continue;
        const rol = newMember.guild.roles.cache.get(roleId) || oldMember.guild.roles.cache.get(roleId);
        if (!rol) continue;
        const entrada = await obtenerModerador(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        const embed = crearEmbedModeracion({
          titulo: '➖ Rol retirado',
          descripcion: 'Se retiró un rol a un usuario.',
          color: '#ff9900',
          usuario: newMember.user,
          moderador: entrada?.executor,
          motivo: entrada?.reason || 'Sin motivo especificado',
          extraNombre: '🏷️ Rol',
          extraValor: `<@&${rol.id}>`
        });
        await enviarLog(newMember.guild, embed);
      }
    } catch (error) { console.error('ERROR AL PROCESAR LOG DE ACTUALIZACIÓN DE MIEMBRO:', error); }
  });
};
