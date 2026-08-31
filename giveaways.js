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
    .setTitle(terminado ? '🎉 SORTEO FINALIZADO' : '🎉 SORTEO')
    .setFooter({ text: `ID del sorteo: ${sorteo.id}` });

  if (terminado) {
    embed.setDescription(
      `🎁 **${sorteo.premio}**\n\n` +
      `🏆 **Ganador${ganadorIds.length === 1 ? '' : 'es'}:** ${ganadorIds.length ? ganadorIds.map(id => `<@${id}>`).join(', ') : 'Ninguno'}\n` +
      `👥 **Participantes:** ${sorteo.participantes.length}`
    );
  } else {
    embed.setDescription(
      `🎁 **${sorteo.premio}**\n\n` +
      `🏆 **${sorteo.ganadores}** ganador${sorteo.ganadores === 1 ? '' : 'es'}     ` +
      `👥 **${sorteo.participantes.length}** participante${sorteo.participantes.length === 1 ? '' : 's'}\n\n` +
      `⏰ **Termina:** <t:${Math.floor(sorteo.fin / 1000)}:R>\n\n` +
      `¡Pulsa el botón **🎉 Participar** para entrar!`
    );
  }

  return embed;
}

function crearBotonParticipar(sorteo) {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_${sorteo.id}`).setLabel('Participar').setEmoji('🎉').setStyle(ButtonStyle.Primary));
}

function crearModalSorteo() {
  return new ModalBuilder()
    .setCustomId('giveaway_create_modal')
    .setTitle('🎉 Crear sorteo')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('premio').setLabel('Premio').setPlaceholder('Ejemplo: 1000 Robux').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duracion').setLabel('Duración').setPlaceholder('Ejemplo: 30m, 2h, 1d o 1w').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ganadores').setLabel('Número de ganadores').setPlaceholder('Ejemplo: 1').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2))
    );
}

async function finalizarSorteo(client, id) {
  const sorteo = giveaways[id];
  if (!sorteo || sorteo.finalizado) return;
  sorteo.finalizado = true;
  const disponibles = [...new Set(sorteo.participantes)];
  const ganadores = [];
  const cantidad = Math.min(sorteo.ganadores, disponibles.length);
  while (ganadores.length < cantidad) ganadores.push(disponibles.splice(Math.floor(Math.random() * disponibles.length), 1)[0]);

  try {
    const canal = await client.channels.fetch(sorteo.canalId);
    const mensaje = await canal.messages.fetch(sorteo.mensajeId);
    await mensaje.edit({ embeds: [crearEmbedSorteo(sorteo, true, ganadores)], components: [] });
    if (ganadores.length) await canal.send(`🎉 ¡Felicidades ${ganadores.map(id => `<@${id}>`).join(', ')}! Ganaste **${sorteo.premio}**.`);
    else await canal.send(`❌ El sorteo de **${sorteo.premio}** terminó sin suficientes participantes.`);
  } catch (error) { console.error(`ERROR AL FINALIZAR EL SORTEO ${id}:`, error); }
  guardarSorteos();
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

      if (interaction.isModalSubmit() && interaction.customId === 'giveaway_create_modal') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ No tienes permisos para crear sorteos.', ephemeral: true });
        const premio = interaction.fields.getTextInputValue('premio').trim();
        const duracionTexto = interaction.fields.getTextInputValue('duracion').trim();
        const ganadores = Number(interaction.fields.getTextInputValue('ganadores').trim());
        const duracion = duracionAMs(duracionTexto);
        if (!duracion) return interaction.reply({ content: '❌ Duración inválida. Usa `30m`, `2h`, `1d` o `1w`.', ephemeral: true });
        if (!Number.isInteger(ganadores) || ganadores < 1 || ganadores > 50) return interaction.reply({ content: '❌ El número de ganadores debe estar entre 1 y 50.', ephemeral: true });
        const canal = interaction.channel;
        if (!canal || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(canal.type)) return interaction.reply({ content: '❌ Este comando debe utilizarse en un canal de texto.', ephemeral: true });
        const id = `${Date.now()}_${interaction.user.id}`;
        const sorteo = { id, guildId: interaction.guild.id, canalId: canal.id, mensajeId: null, creadorId: interaction.user.id, premio, ganadores, participantes: [], fin: Date.now() + duracion, finalizado: false };
        const mensaje = await canal.send({ embeds: [crearEmbedSorteo(sorteo)], components: [crearBotonParticipar(sorteo)] });
        sorteo.mensajeId = mensaje.id;
        giveaways[id] = sorteo;
        guardarSorteos();
        programarSorteo(client, sorteo);
        return interaction.reply({ content: '✅ Sorteo creado correctamente.', ephemeral: true });
      }

      if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_join_')) return;
      const id = interaction.customId.replace('giveaway_join_', '');
      const sorteo = giveaways[id];
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
