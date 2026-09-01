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

const SUGGESTION_COLOR = '#5865F2';

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

        const embed = new EmbedBuilder()
          .setTitle('💡 Nueva sugerencia')
          .setDescription(suggestion)
          .addFields({
            name: '👤 Autor',
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: false
          })
          .setColor(SUGGESTION_COLOR)
          .setFooter({ text: `ID del usuario: ${interaction.user.id}` })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('suggestion_upvote')
            .setLabel('0')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setLabel('0')
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ content: '✅ Tu sugerencia fue enviada correctamente.', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
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
