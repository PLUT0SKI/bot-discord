const fs = require('fs');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { verificarAcceso } = require('../utils/commandAccess');

const SUGGESTION_FILE = './suggestions.json';
const SUGGESTION_COLOR = '#5865F2';
let suggestions = {};

function cargarSugerencias() {
  try {
    if (fs.existsSync(SUGGESTION_FILE)) {
      suggestions = JSON.parse(fs.readFileSync(SUGGESTION_FILE, 'utf8'));
    } else {
      suggestions = {};
    }
  } catch (error) {
    console.error('ERROR AL CARGAR suggestions.json:', error);
    suggestions = {};
  }
}

function guardarSugerencias() {
  try {
    fs.writeFileSync(SUGGESTION_FILE, JSON.stringify(suggestions, null, 2));
  } catch (error) {
    console.error('ERROR AL GUARDAR SUGERENCIAS:', error);
  }
}

function crearEmbed(sugerencia) {
  const estados = {
    pendiente: '🟡 Pendiente',
    aceptada: '🟢 Aceptada',
    rechazada: '🔴 Rechazada'
  };

  return new EmbedBuilder()
    .setTitle('💡 Nueva sugerencia')
    .setDescription(sugerencia.text)
    .addFields(
      { name: '👤 Autor', value: `<@${sugerencia.authorId}>`, inline: true },
      { name: '📊 Votos', value: `👍 ${sugerencia.upvotes.length}  •  👎 ${sugerencia.downvotes.length}`, inline: true },
      { name: '📌 Estado', value: estados[sugerencia.status] || estados.pendiente, inline: true }
    )
    .setColor(SUGGESTION_COLOR)
    .setFooter({ text: `Sugerencia #${sugerencia.id}` })
    .setTimestamp(new Date(sugerencia.createdAt));
}

function crearBotones(sugerencia) {
  const activa = sugerencia.status === 'pendiente';

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion_upvote:${sugerencia.id}`)
        .setLabel(String(sugerencia.upvotes.length))
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!activa),
      new ButtonBuilder()
        .setCustomId(`suggestion_downvote:${sugerencia.id}`)
        .setLabel(String(sugerencia.downvotes.length))
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!activa),
      new ButtonBuilder()
        .setCustomId(`suggestion_accept:${sugerencia.id}`)
        .setLabel('Aceptar')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!activa),
      new ButtonBuilder()
        .setCustomId(`suggestion_reject:${sugerencia.id}`)
        .setLabel('Rechazar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!activa)
    )
  ];
}

cargarSugerencias();

module.exports = client => {
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'sugerencias') {
        if (!(await verificarAcceso(interaction))) return;

        const embed = new EmbedBuilder()
          .setTitle('💡 Sugerencias')
          .setDescription('¿Tienes una idea para mejorar el servidor?\n\nPulsa el botón de abajo para enviar tu sugerencia.')
          .setColor(SUGGESTION_COLOR)
          .setFooter({ text: 'Sistema de sugerencias' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('suggestion_create')
            .setLabel('Enviar sugerencia')
            .setEmoji('💡')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (interaction.isButton() && interaction.customId === 'suggestion_create') {
        const modal = new ModalBuilder()
          .setCustomId('suggestion_modal')
          .setTitle('Nueva sugerencia');

        const input = new TextInputBuilder()
          .setCustomId('suggestion_text')
          .setLabel('¿Cuál es tu sugerencia?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Escribe aquí tu idea...')
          .setMinLength(5)
          .setMaxLength(1000)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === 'suggestion_modal') {
        const suggestion = interaction.fields.getTextInputValue('suggestion_text').trim();
        const id = String(Date.now());

        suggestions[id] = {
          id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          messageId: null,
          authorId: interaction.user.id,
          text: suggestion,
          upvotes: [],
          downvotes: [],
          status: 'pendiente',
          createdAt: new Date().toISOString()
        };

        const message = await interaction.channel.send({
          embeds: [crearEmbed(suggestions[id])],
          components: crearBotones(suggestions[id])
        });

        suggestions[id].messageId = message.id;
        guardarSugerencias();

        await interaction.reply({ content: '✅ Tu sugerencia fue enviada correctamente.', ephemeral: true });
        return;
      }

      if (!interaction.isButton()) return;

      const [action, id] = interaction.customId.split(':');
      if (!id || !action.startsWith('suggestion_')) return;

      const suggestion = suggestions[id];
      if (!suggestion) {
        await interaction.reply({ content: '❌ Esta sugerencia ya no existe.', ephemeral: true });
        return;
      }

      if (action === 'suggestion_upvote' || action === 'suggestion_downvote') {
        if (suggestion.status !== 'pendiente') {
          await interaction.reply({ content: '❌ Esta sugerencia ya fue revisada.', ephemeral: true });
          return;
        }

        const userId = interaction.user.id;
        suggestion.upvotes = suggestion.upvotes.filter(id => id !== userId);
        suggestion.downvotes = suggestion.downvotes.filter(id => id !== userId);

        const votos = action === 'suggestion_upvote' ? suggestion.upvotes : suggestion.downvotes;
        votos.push(userId);
        guardarSugerencias();

        await interaction.update({
          embeds: [crearEmbed(suggestion)],
          components: crearBotones(suggestion)
        });
        return;
      }

      if (action === 'suggestion_accept' || action === 'suggestion_reject') {
        if (!(await verificarAcceso(interaction))) return;

        if (suggestion.status !== 'pendiente') {
          await interaction.reply({ content: '❌ Esta sugerencia ya fue revisada.', ephemeral: true });
          return;
        }

        suggestion.status = action === 'suggestion_accept' ? 'aceptada' : 'rechazada';
        guardarSugerencias();

        await interaction.update({
          embeds: [crearEmbed(suggestion)],
          components: crearBotones(suggestion)
        });
      }
    } catch (error) {
      console.error('ERROR EN SISTEMA DE SUGERENCIAS:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Ocurrió un error al procesar la sugerencia.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Ocurrió un error al procesar la sugerencia.', ephemeral: true }).catch(() => {});
      }
    }
  });
};
