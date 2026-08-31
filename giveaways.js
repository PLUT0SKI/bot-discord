const {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');

const GIVEAWAYS_FILE = './giveaways.json';
let giveaways = {};

if (fs.existsSync(GIVEAWAYS_FILE)) {
  try {
    giveaways = JSON.parse(fs.readFileSync(GIVEAWAYS_FILE, 'utf8'));
  } catch (error) {
    console.error('ERROR AL CARGAR giveaways.json:', error);
    giveaways = {};
  }
}

function guardarSorteos() {
  try {
    fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(giveaways, null, 2));
  } catch (error) {
    console.error('ERROR AL GUARDAR giveaways.json:', error);
  }
}

function duracionAMs(texto) {
  const match = /^([0-9]+)\s*(s|m|h|d|w)$/i.exec(texto.trim());
  if (!match) return null;

  const cantidad = Number(match[1]);
  const unidad = match[2].toLowerCase();
  const valores = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const duracion = cantidad * valores[unidad];

  if (!Number.isSafeInteger(duracion) || duracion < 5000) return null;
  return duracion;
}

function crearEmbedSorteo(sorteo, terminado = false, ganadorIds = []) {
  return new EmbedBuilder()
    .setColor(terminado ? '#2b2d31' : '#5865F2')
    .setTitle(terminado ? '🎉 SORTEO FINALIZADO' : '🎉 SORTEO')
    .setDescription(
      `🎁 **Premio:** ${sorteo.premio}\n` +
      `🏆 **Ganadores:** ${sorteo.ganadores}\n` +
      `👥 **Participantes:** ${sorteo.participantes.length}\n\n` +
      (terminado
        ? ganadorIds.length > 0
          ? `🏆 **Ganador${ganadorIds.length === 1 ? '' : 'es'}:** ${ganadorIds.map(id => `<@${id}>`).join(', ')}`
          : '❌ No hubo suficientes participantes para elegir ganadores.'
        : `⏰ **Termina:** <t:${Math.floor(sorteo.fin / 1000)}:R>\n\n¡Pulsa el botón para participar!`)
    )
    .setFooter({ text: `ID del sorteo: ${sorteo.id}` });
}

function crearBotonParticipar(sorteo) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join_${sorteo.id}`)
      .setLabel('Participar')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary)
  );
}

async function finalizarSorteo(client, sorteoId) {
  const sorteo = giveaways[sorteoId];
  if (!sorteo || sorteo.finalizado) return;

  sorteo.finalizado = true;
  const participantes = [...new Set(sorteo.participantes)];
  const ganadores = [];
  const cantidadGanadores = Math.min(sorteo.ganadores, participantes.length);
  const disponibles = [...participantes];

  while (ganadores.length < cantidadGanadores) {
    const indice = Math.floor(Math.random() * disponibles.length);
    ganadores.push(disponibles.splice(indice, 1)[0]);
  }

  try {
    const canal = await client.channels.fetch(sorteo.canalId);
    const mensaje = await canal.messages.fetch(sorteo.mensajeId);

    await mensaje.edit({
      embeds: [crearEmbedSorteo(sorteo, true, ganadores)],
      components: []
    });

    if (ganadores.length > 0) {
      await canal.send(`🎉 ¡Felicidades ${ganadores.map(id => `<@${id}>`).join(', ')} ganaste **${sorteo.premio}** abre un <#1357832842561978505> para reclamar tu **${sorteo.premio}**.`);
    } else {
      await canal.send(`❌ El sorteo de **${sorteo.premio}** terminó sin suficientes participantes.`);
    }
  } catch (error) {
    console.error(`ERROR AL FINALIZAR EL SORTEO ${sorteoId}:`, error);
  }

  guardarSorteos();
}

function programarSorteo(client, sorteo) {
  const restante = sorteo.fin - Date.now();

  if (restante <= 0) {
    finalizarSorteo(client, sorteo.id);
    return;
  }

  setTimeout(() => finalizarSorteo(client, sorteo.id), restante);
}

function iniciarSistemaSorteos(client) {
  client.on('ready', () => {
    for (const sorteo of Object.values(giveaways)) {
      if (!sorteo.finalizado) programarSorteo(client, sorteo);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'sorteo') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
          return interaction.reply({ content: '❌ No tienes permisos para crear sorteos.', ephemeral: true });
        }

        const premio = interaction.options.getString('premio');
        const duracionTexto = interaction.options.getString('duracion');
        const ganadores = interaction.options.getInteger('ganadores');
        const canal = interaction.options.getChannel('canal') || interaction.channel;
        const duracion = duracionAMs(duracionTexto);

        if (!duracion) {
          return interaction.reply({
            content: '❌ Duración inválida. Usa formatos como `30m`, `2h`, `1d` o `1w`.',
            ephemeral: true
          });
        }

        if (!canal || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(canal.type)) {
          return interaction.reply({ content: '❌ El canal debe ser un canal de texto o anuncios.', ephemeral: true });
        }

        const sorteoId = `${Date.now()}_${interaction.user.id}`;
        const sorteo = {
          id: sorteoId,
          guildId: interaction.guild.id,
          canalId: canal.id,
          mensajeId: null,
          creadorId: interaction.user.id,
          premio,
          ganadores,
          participantes: [],
          fin: Date.now() + duracion,
          finalizado: false
        };

        const mensaje = await canal.send({
          embeds: [crearEmbedSorteo(sorteo)],
          components: [crearBotonParticipar(sorteo)]
        });

        sorteo.mensajeId = mensaje.id;
        giveaways[sorteoId] = sorteo;
        guardarSorteos();
        programarSorteo(client, sorteo);

        return interaction.reply({ content: `✅ Sorteo creado correctamente en ${canal}.`, ephemeral: true });
      }

      if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_join_')) return;

      const sorteoId = interaction.customId.replace('giveaway_join_', '');
      const sorteo = giveaways[sorteoId];

      if (!sorteo || sorteo.finalizado) {
        return interaction.reply({ content: '❌ Este sorteo ya terminó.', ephemeral: true });
      }

      if (sorteo.participantes.includes(interaction.user.id)) {
        sorteo.participantes = sorteo.participantes.filter(id => id !== interaction.user.id);
        guardarSorteos();

        await interaction.message.edit({
          embeds: [crearEmbedSorteo(sorteo)],
          components: [crearBotonParticipar(sorteo)]
        });

        return interaction.reply({ content: '↩️ Saliste del sorteo.', ephemeral: true });
      }

      sorteo.participantes.push(interaction.user.id);
      guardarSorteos();

      await interaction.message.edit({
        embeds: [crearEmbedSorteo(sorteo)],
        components: [crearBotonParticipar(sorteo)]
      });

      return interaction.reply({ content: '🎉 ¡Ya estás participando!', ephemeral: true });
    } catch (error) {
      console.error('ERROR EN EL SISTEMA DE SORTEOS:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocurrió un error con el sorteo.', ephemeral: true }).catch(() => {});
      }
    }
  });
}

const loginOriginal = Client.prototype.login;
Client.prototype.login = function (...args) {
  if (!this.__giveawaySystemStarted) {
    this.__giveawaySystemStarted = true;
    iniciarSistemaSorteos(this);
  }
  return loginOriginal.apply(this, args);
};
