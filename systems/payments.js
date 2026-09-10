const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== 'pagos') return;

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('💳 MÉTODOS DE PAGO')
        .setDescription(
          'Selecciona el método de pago que prefieras para realizar tu compra.\n' +
          'Todos los pagos son procesados de forma segura.\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +

          '<:remitly:1547413850683609178> **REMITLY**\n' +
          '> Pagos internacionales de forma rápida y segura.\n' +
          '> Ideal para pagos realizados desde otro país.\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +

          '<:oxxo:1547413887400288256> **DEPÓSITO EN OXXO**\n' +
          '> Realiza tu pago en efectivo desde cualquier sucursal OXXO.\n' +
          '> Disponible para pagos dentro de México.\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +

          '<:transfe:1547413933290160148> **TRANSFERENCIA BANCARIA**\n' +
          '> Realiza una transferencia directamente desde tu banco.\n' +
          '> Disponible para pagos nacionales.\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .addFields({
          name: '<:buy:1547419630472011807> ¿QUIERES REALIZAR UN PAGO?',
          value:
            '> Abre un **ticket** y nuestro equipo te proporcionará los datos necesarios para completar tu pago.'
        })
        .setFooter({
          text: 'Zutaniza • Tu tienda de confianza'
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('Error en sistema de pagos:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ocurrió un error al mostrar los métodos de pago.',
          ephemeral: true
        });
      }
    }
  });
};
