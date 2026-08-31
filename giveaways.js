const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');

const GIVEAWAYS_FILE = './giveaways.json';
let giveaways = {};
const giveawayForms = new Map();

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
  return new EmbedBuilder()
    .setColor(terminado ? '#2b2d31' : '#5865F2')
    .setTitle(terminado ? '🎉 SORTEO FINALIZADO' : '🎉 SORTEO')
    .setDescription(`🎁 **Premio:** ${sorteo.premio}\n🏆 **Ganadores:** ${sorteo.ganadores}\n👥 **Participantes:** ${sorteo.participantes.length}\n\n${terminado ? (ganadorIds.length ? `🏆 **Ganador${ganadorIds.length === 1 ? '' : 'es'}:** ${ganadorIds.map(id => `<@${id}>`).join(', ')}` : '❌ No hubo suficientes participantes para elegir ganadores.') : `⏰ **Termina:** <t:${Math.floor(sorteo.fin / 1000)}:R>\n\n¡Pulsa el botón para participar!`}`)
    .setFooter({ text: `ID del sorteo: ${sorteo.id}` });
}

function crearBotonParticipar(sorteo) {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_${sorteo.id}`).setLabel('Participar').setEmoji('🎉').setStyle(ButtonStyle.Primary));
}

function crearPanelSorteo(form) {
  const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🎉 CREAR SORTEO').setDescription(
    'Configura todos los datos del sorteo utilizando los botones de abajo.\n\n' +
    `🎁 **Premio:** ${form.premio || '`Sin configurar`'}\n` +
    `⏱️ **Duración:** ${form.duracion || '`Sin configurar`'}\n` +
    `🏆 **Ganadores:** ${form.ganadores || '`Sin configurar`'}\n` +
    `📢 **Canal:** ${form.canalId ? `<#${form.canalId}>` : '`Sin configurar`'}`
  );

  const datos = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('giveaway_form_premio').setLabel('Premio').setEmoji('🎁').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('giveaway_form_duracion').setLabel('Duración').setEmoji('⏱️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('giveaway_form_ganadores').setLabel('Ganadores').setEmoji('🏆').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('giveaway_form_canal').setLabel('Canal').setEmoji('📢').setStyle(ButtonStyle.Secondary)
  );
  const acciones = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('giveaway_form_preview').setLabel('Vista previa').setEmoji('👀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('giveaway_form_create').setLabel('Crear sorteo').setEmoji('🚀').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('giveaway_form_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );
  return { embeds: [embed], components: [datos, acciones] };
}

function crearModal(id, titulo, label, placeholder) {
  return new ModalBuilder().setCustomId(id).setTitle(titulo).addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('valor').setLabel(label).setPlaceholder(placeholder).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
  ));
}

async function finalizarSorteo(client, id) {
  const sorteo = giveaways[id];
  if (!sorteo || sorteo.finalizado) return;
  sorteo.finalizado = true;
  const participantes = [...new Set(sorteo.participantes)];
  const ganadores = [];
  const disponibles = [...participantes];
  const cantidad = Math.min(sorteo.ganadores, disponibles.length);
  while (ganadores.length < cantidad) ganadores.push(disponibles.splice(Math.floor(Math.random() * disponibles.length), 1)[0]);

  try {
    const canal = await client.channels.fetch(sorteo.canalId);
    const mensaje = await canal.messages.fetch(sorteo.mensajeId);
    await mensaje.edit({ embeds: [crearEmbedSorteo(sorteo, true, ganadores)], components: [] });
    if (ganadores.length) await canal.send(`🎉 ¡Felicidades ${ganadores.map(id => `<@${id}>`).join(', ')}! Ganaste **${sorteo.premio}**. Abre un <#1357832842561978505> para reclamar tu **${sorteo.premio}**.`);
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
      const key = `${interaction.guild?.id}:${interaction.user?.id}`;
      const form = giveawayForms.get(key);

      if (interaction.isChatInputCommand() && interaction.commandName === 'sorteo') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ No tienes permisos para crear sorteos.', ephemeral: true });
        giveawayForms.set(key, { premio: '', duracion: '', ganadores: null, canalId: interaction.channelId });
        return interaction.reply({ ...crearPanelSorteo(giveawayForms.get(key)), ephemeral: true });
      }

      if (interaction.isModalSubmit() && form) {
        const valor = interaction.fields.getTextInputValue('valor').trim();
        if (interaction.customId === 'giveaway_modal_premio') form.premio = valor;
        else if (interaction.customId === 'giveaway_modal_duracion') {
          if (!duracionAMs(valor)) return interaction.reply({ content: '❌ Duración inválida. Usa `30m`, `2h`, `1d` o `1w`.', ephemeral: true });
          form.duracion = valor;
        } else if (interaction.customId === 'giveaway_modal_ganadores') {
          const cantidad = Number(valor);
          if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) return interaction.reply({ content: '❌ El número de ganadores debe estar entre 1 y 50.', ephemeral: true });
          form.ganadores = cantidad;
        }
        return interaction.reply({ ...crearPanelSorteo(form), ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'giveaway_select_canal' && form) {
        form.canalId = interaction.values[0];
        return interaction.update({ ...crearPanelSorteo(form) });
      }

      if (interaction.isButton() && form && interaction.customId.startsWith('giveaway_form_')) {
        if (interaction.customId === 'giveaway_form_cancel') {
          giveawayForms.delete(key);
          return interaction.update({ content: '❌ Creación del sorteo cancelada.', embeds: [], components: [] });
        }
        if (interaction.customId === 'giveaway_form_premio') return interaction.showModal(crearModal('giveaway_modal_premio', 'Premio del sorteo', 'Premio', 'Ejemplo: 1000 Robux'));
        if (interaction.customId === 'giveaway_form_duracion') return interaction.showModal(crearModal('giveaway_modal_duracion', 'Duración del sorteo', 'Duración', 'Ejemplo: 30m, 2h, 1d o 1w'));
        if (interaction.customId === 'giveaway_form_ganadores') return interaction.showModal(crearModal('giveaway_modal_ganadores', 'Ganadores', 'Número de ganadores', 'Ejemplo: 1'));
        if (interaction.customId === 'giveaway_form_canal') {
          const opciones = interaction.guild.channels.cache.filter(c => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(c.type)).map(c => ({ label: c.name.slice(0, 100), value: c.id })).slice(0, 25);
          const menu = new StringSelectMenuBuilder().setCustomId('giveaway_select_canal').setPlaceholder('Selecciona el canal').addOptions(opciones);
          return interaction.update({ content: '📢 Selecciona el canal donde se publicará el sorteo:', embeds: [], components: [new ActionRowBuilder().addComponents(menu)] });
        }
        if (interaction.customId === 'giveaway_form_preview') {
          const duracion = duracionAMs(form.duracion);
          if (!form.premio || !duracion || !Number.isInteger(form.ganadores) || !form.canalId) return interaction.reply({ content: '❌ Completa todos los campos antes de ver la vista previa.', ephemeral: true });
          const preview = { ...form, participantes: [], fin: Date.now() + duracion, id: 'VISTA PREVIA' };
          return interaction.reply({ embeds: [crearEmbedSorteo(preview)], ephemeral: true });
        }
        if (interaction.customId === 'giveaway_form_create') {
          const duracion = duracionAMs(form.duracion);
          if (!form.premio || !duracion || !Number.isInteger(form.ganadores) || form.ganadores < 1 || !form.canalId) return interaction.reply({ content: '❌ Completa correctamente todos los campos antes de crear el sorteo.', ephemeral: true });
          const canal = interaction.guild.channels.cache.get(form.canalId);
          if (!canal || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(canal.type)) return interaction.reply({ content: '❌ El canal seleccionado ya no es válido.', ephemeral: true });
          const id = `${Date.now()}_${interaction.user.id}`;
          const sorteo = { id, guildId: interaction.guild.id, canalId: canal.id, mensajeId: null, creadorId: interaction.user.id, premio: form.premio, ganadores: form.ganadores, participantes: [], fin: Date.now() + duracion, finalizado: false };
          const mensaje = await canal.send({ embeds: [crearEmbedSorteo(sorteo)], components: [crearBotonParticipar(sorteo)] });
          sorteo.mensajeId = mensaje.id;
          giveaways[id] = sorteo;
          guardarSorteos();
          programarSorteo(client, sorteo);
          giveawayForms.delete(key);
          return interaction.update({ content: `✅ Sorteo creado correctamente en ${canal}.`, embeds: [], components: [] });
        }
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

const loginOriginal = require('discord.js').Client.prototype.login;
require('discord.js').Client.prototype.login = function (...args) {
  if (!this.__giveawaySystemStarted) {
    this.__giveawaySystemStarted = true;
    iniciarSistemaSorteos(this);
  }
  return loginOriginal.apply(this, args);
};
