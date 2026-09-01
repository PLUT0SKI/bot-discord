const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
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
  const id = logsConfig[guild.id];
  if (!id) return;
  const canal = guild.channels.cache.get(id);
  if (!canal) return;
  await canal.send({ embeds: [embed] }).catch(() => {});
}
async function enviarLogSpam(member, cantidad, canal) {
  const embed = new EmbedBuilder().setColor('#ff0000').setTitle('🚨 Spam detectado')
    .setDescription('Un usuario fue silenciado automáticamente por enviar demasiados mensajes en poco tiempo.')
    .addFields(
      { name: '👤 Usuario', value: `<@${member.id}> \`${member.user.tag}\``, inline: false },
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
      { name: '👤 Usuario', value: `<@${member.id}> \`${member.user.tag}\``, inline: false },
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
          { name: '👤 Usuario', value: `<@${message.author.id}> \`${message.author.tag}\``, inline: false },
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
          { name: '👤 Usuario', value: `<@${newMessage.author.id}> \`${newMessage.author.tag}\``, inline: false },
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

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'setlogs') return;
    try {
      if (!await verificarAcceso(interaction)) return;
      const canal = interaction.options.getChannel('canal');
      if (!canal || canal.type !== ChannelType.GuildText) return interaction.reply({ content: '❌ Selecciona un canal de texto.', ephemeral: true });
      const permisos = canal.permissionsFor(interaction.guild.members.me);
      if (!permisos?.has(PermissionsBitField.Flags.ViewChannel) || !permisos.has(PermissionsBitField.Flags.SendMessages) || !permisos.has(PermissionsBitField.Flags.EmbedLinks)) return interaction.reply({ content: '❌ No puedo enviar logs a ese canal. Necesito **Ver canal**, **Enviar mensajes** y **Insertar enlaces**.', ephemeral: true });
      logsConfig[interaction.guild.id] = canal.id;
      guardarLogsConfig();
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('#00ff88').setTitle('⚙️ Sistema de logs configurado').setDescription('El canal de logs fue configurado correctamente.').addFields({ name: '📋 Canal', value: `<#${canal.id}>` }).setTimestamp()], ephemeral: true });
    } catch (error) { console.error('ERROR EN /SETLOGS:', error); }
  });

  setInterval(() => {
    if (mensajesEliminadosPorBot.size > 1000) mensajesEliminadosPorBot.clear();
    if (mensajesEliminadosPorClear.size > 5000) mensajesEliminadosPorClear.clear();
  }, 60000);

  return {
    marcarEliminadoPorClear: (id) => mensajesEliminadosPorClear.add(id),
    marcarEliminadoPorBot: (id) => mensajesEliminadosPorBot.add(id)
  };
};
