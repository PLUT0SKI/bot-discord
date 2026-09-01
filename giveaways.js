const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

const GIVEAWAYS_FILE = './giveaways.json';
let giveaways = {};

if (fs.existsSync(GIVEAWAYS_FILE)) {
  try { giveaways = JSON.parse(fs.readFileSync(GIVEAWAYS_FILE, 'utf8')); }
  catch (error) { console.error('ERROR AL CARGAR giveaways.json:', error); giveaways = {}; }
}

function guardarSorteos() {
  try { fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(giveaways, null, 2)); }
  catch (error) { console.error('ERROR AL GUARDAR giveaways.json:', error); }
}

function duracionAMs(texto) {
  const match = /^([0-9]+)\s*(s|m|h|d|w)$/i.exec(String(texto).trim());
  if (!match) return null;
  const duracion = Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[match[2].toLowerCase()];
  return Number.isSafeInteger(duracion) && duracion >= 5000 ? duracion : null;
}

function crearEmbedSorteo(sorteo, terminado = false, ganadorIds = []) {
  const embed = new EmbedBuilder()
    .setColor(terminado ? '#2b2d31' : '#5865F2')
    .setTitle(terminado ? '🎊 SORTEO FINALIZADO' : '🎉 SORTEO')
    .setFooter({ text: `ID del sorteo: ${sorteo.id}` });

  if (terminado) {
    const terminoEn = Number(sorteo.terminoEn) || Date.now();
    embed.setDescription('El sorteo ah finalizado muchas gracias por participar.');
    embed.addFields(
      { name: '🎁 Premio:', value: `**\`${sorteo.premio}\`**`, inline: true },
      { name: '🏆 Ganadores:', value: ganadorIds.length ? ganadorIds.map(id => `<@${id}>`).join(', ') : '`Ninguno`', inline: true },
      { name: '👥 Participantes:', value: `**\`${sorteo.participantes.length}\`**`, inline: true },
      { name: '⏰ Terminó:', value: `<t:${Math.floor(terminoEn / 1000)}:R>`, inline: false }
    );
    embed.addFields({ name: '\u200b', value: '**¡No olvides participar en los próximos sorteos!**', inline: false });
    return embed;
  }

  const restante = sorteo.fin - Date.now();
  const aviso = restante <= 10 * 60 * 1000 ? '⚠️ **¡El sorteo terminara pronto!**' : '';

  embed.setDescription('Pulsa el botón **🎉 Participar** para entrar al sorteo.');
  embed.addFields(
    { name: '🎁 Premio:', value: `**\`${sorteo.premio}\`**\n\u200b`, inline: true },
    { name: '🏆 Ganadores:', value: `**\`${sorteo.ganadores}\`**\n\u200b`, inline: true },
    { name: '👥 Participantes:', value: `**\`${sorteo.participantes.length}\`**\n\u200b`, inline: true }
  );

  if (sorteo.requisito) {
    embed.addFields({ name: '📋 Requisito:', value: `${sorteo.requisito}\n\u200b`, inline: false });
  }

  embed.addFields({ name: '⏰ Termina:', value: `<t:${Math.floor(sorteo.fin / 1000)}:R>`, inline: false });

  if (aviso) {
    embed.addFields({ name: '\u200b', value: aviso, inline: false });
  }

  return embed;
}

function crearBotonParticipar(sorteo) {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_${sorteo.id}`).setLabel('Participar').setEmoji('🎉').setStyle(ButtonStyle.Primary));
}

function crearModalSorteo() {
  return new ModalBuilder().setCustomId('giveaway_create_modal').setTitle('🎉 Crear sorteo').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('premio').setLabel('Premio').setPlaceholder('Ejemplo: 1000 Robux').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duracion').setLabel('Duración').setPlaceholder('Ejemplo: 30m, 2h, 1d o 1w').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ganadores').setLabel('Número de ganadores').setPlaceholder('Ejemplo: 1').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('requisito').setLabel('Requisito (opcional)').setPlaceholder('Déjalo vacío si no hay requisito').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500))
  );
}

function obtenerSorteo(id) { return giveaways[id] || null; }

async function editarMensajeSorteo(client, sorteo, embed, components = []) {
  const canal = await client.channels.fetch(sorteo.canalId);
  const mensaje = await canal.messages.fetch(sorteo.mensajeId);
  await mensaje.edit({ embeds: [embed], components });
  return canal;
}

async function finalizarSorteo(client, id) {
  const sorteo = obtenerSorteo(id);
  if (!sorteo || sorteo.finalizado) return null;
  const terminoEn = Date.now();
  sorteo.finalizado = true;
  sorteo.terminoEn = terminoEn;
  const disponibles = [...new Set(sorteo.participantes)];
  const ganadores = [];
  const cantidad = Math.min(sorteo.ganadores, disponibles.length);
  while (ganadores.length < cantidad) ganadores.push(disponibles.splice(Math.floor(Math.random() * disponibles.length), 1)[0]);
  sorteo.ultimoGanadores = ganadores;
  try {
    const canal = await editarMensajeSorteo(client, sorteo, crearEmbedSorteo(sorteo, true, ganadores));
    if (ganadores.length) await canal.send(`🎉 ¡Felicidades ${ganadores.map(id => `<@${id}>`).join(', ')}! Ganaste **${sorteo.premio}**. Abre un <#1357832842561978505> para reclamar tu premio.`);
    else await canal.send(`❌ El sorteo de **${sorteo.premio}** terminó sin suficientes participantes.`);
  } catch (error) { console.error(`ERROR AL FINALIZAR EL SORTEO ${id}:`, error); }
  guardarSorteos();
  return ganadores;
}

async function rerollSorteo(client, id, interaction) {
  const sorteo = obtenerSorteo(id);
  if (!sorteo) return interaction.reply({ content: '❌ No encontré un sorteo con ese ID.', ephemeral: true });
  if (!sorteo.finalizado) return interaction.reply({ content: '❌ Ese sorteo todavía está activo.', ephemeral: true });
  if (!sorteo.participantes.length) return interaction.reply({ content: '❌ Ese sorteo no tuvo participantes.', ephemeral: true });
  const ganadorAnterior = sorteo.ultimoGanadores || [];
  const candidatos = sorteo.participantes.filter(idParticipante => !ganadorAnterior.includes(idParticipante));
  const disponibles = candidatos.length ? candidatos : [...sorteo.participantes];
  const ganadores = [];
  const cantidad = Math.min(sorteo.ganadores, disponibles.length);
  while (ganadores.length < cantidad) ganadores.push(disponibles.splice(Math.floor(Math.random() * disponibles.length), 1)[0]);
  sorteo.ultimoGanadores = ganadores;
  sorteo.reRolls = (sorteo.reRolls || 0) + 1;
  try {
    const canal = await client.channels.fetch(sorteo.canalId);
    const mensaje = await canal.messages.fetch(sorteo.mensajeId);
    await mensaje.edit({ embeds: [crearEmbedSorteo(sorteo, true, ganadores)], components: [] });
    await canal.send(`🔄 **Re-roll del sorteo:** ${ganadores.map(id => `<@${id}>`).join(', ')} ${ganadores.length === 1 ? 'ha sido elegido' : 'han sido elegidos'} como nuevo${ganadores.length === 1 ? '' : 's'} ganador${ganadores.length === 1 ? '' : 'es'} de **${sorteo.premio}**.`);
  } catch (error) { console.error(`ERROR AL HACER REROLL DEL SORTEO ${id}:`, error); return interaction.reply({ content: '❌ No pude actualizar el sorteo.', ephemeral: true }); }
  guardarSorteos();
  return interaction.reply({ content: '✅ Re-roll realizado correctamente.', ephemeral: true });
}

function programarSorteo(client, sorteo) {
  const restante = sorteo.fin - Date.now();
  if (restante <= 0) return finalizarSorteo(client, sorteo.id);
  setTimeout(() => finalizarSorteo(client, sorteo.id), restante);
}

function iniciarSistemaSorteos(client) {
  client.on('ready', () => Object.values(giveaways).forEach(s => { if (!s.finalizado) programarSorteo(client, s); }));
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'sorteo') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ No tienes permisos para crear sorteos.', ephemeral: true });
        return interaction.showModal(crearModalSorteo());
      }
      if (interaction.isChatInputCommand() && interaction.commandName === 'reroll') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ No tienes permisos para hacer re-rolls.', ephemeral: true });
        return rerollSorteo(client, interaction.options.getString('id'), interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId === 'giveaway_create_modal') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ No tienes permisos para crear sorteos.', ephemeral: true });
        const premio = interaction.fields.getTextInputValue('premio').trim();
        const duracionTexto = interaction.fields.getTextInputValue('duracion').trim();
        const ganadores = Number(interaction.fields.getTextInputValue('ganadores').trim());
        const requisito = interaction.fields.getTextInputValue('requisito').trim();
        const duracion = duracionAMs(duracionTexto);
        if (!duracion) return interaction.reply({ content: '❌ Duración inválida. Usa `30m`, `2h`, `1d` o `1w`.', ephemeral: true });
        if (!Number.isInteger(ganadores) || ganadores < 1 || ganadores > 50) return interaction.reply({ content: '❌ El número de ganadores debe estar entre 1 y 50.', ephemeral: true });
        const canal = interaction.channel;
        if (!canal || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(canal.type)) return interaction.reply({ content: '❌ Este comando debe utilizarse en un canal de texto.', ephemeral: true });
        const inicio = Date.now();
        const id = `${inicio}_${interaction.user.id}`;
        const sorteo = { id, guildId: interaction.guild.id, canalId: canal.id, mensajeId: null, creadorId: interaction.user.id, premio, requisito, ganadores, participantes: [], inicio, fin: inicio + duracion, finalizado: false, ultimoGanadores: [] };
        const mensaje = await canal.send({ embeds: [crearEmbedSorteo(sorteo)], components: [crearBotonParticipar(sorteo)] });
        sorteo.mensajeId = mensaje.id;
        giveaways[id] = sorteo;
        guardarSorteos();
        programarSorteo(client, sorteo);
        return interaction.reply({ content: '✅ Sorteo creado correctamente.', ephemeral: true });
      }
      if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_join_')) return;
      const id = interaction.customId.replace('giveaway_join_', '');
      const sorteo = obtenerSorteo(id);
      if (!sorteo || sorteo.finalizado) return interaction.reply({ content: '❌ Este sorteo ya terminó.', ephemeral: true });
      if (sorteo.participantes.includes(interaction.user.id)) {
        sorteo.participantes = sorteo.participantes.filter(userId => userId !== interaction.user.id);
        guardarSorteos();
        await interaction.message.edit({ embeds: [crearEmbedSorteo(sorteo)], components: [crearBotonParticipar(sorteo)] });
        return interaction.reply({ content: '↩️ Saliste del sorteo.', ephemeral: true });
      }
      sorteo.participantes.push(interaction.user.id);
      guardarSorteos();
      await interaction.message.edit({ embeds: [crearEmbedSorteo(sorteo)], components: [crearBotonParticipar(sorteo)] });
      return interaction.reply({ content: '🎉 ¡Ya estás participando!', ephemeral: true });
    } catch (error) {
      console.error('ERROR EN EL SISTEMA DE SORTEOS:', error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Ocurrió un error con el sorteo.', ephemeral: true }).catch(() => {});
    }
  });
}

const { Client } = require('discord.js');
const loginOriginal = Client.prototype.login;
Client.prototype.login = function (...args) {
  if (!this.__giveawaySystemStarted) {
    this.__giveawaySystemStarted = true;
    iniciarSistemaSorteos(this);
  }
  return loginOriginal.apply(this, args);
};
