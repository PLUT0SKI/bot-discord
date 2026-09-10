const { EmbedBuilder } = require('discord.js');

const ROLES_AUTORIZADOS = [
  '1357832734596141249',
  '1379927998500966610',
  '1543794671195529246'
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== 'pagos') return;

      if (!interaction.guild) return;

      const miembro = await interaction.guild.members.fetch(interaction.user.id);

      const tienePermiso = ROLES_AUTORIZADOS.some(roleId =>
        miembro.roles.cache.has(roleId)
      );

      if (!tienePermiso) {
        return await interaction.reply({
          content: '❌ No tienes permiso para usar este comando.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('MÉTODOS DE PAGO')
        .setDescription(
          'Aceptamos los siguientes métodos de pago:\n\n' +
          '<:remitly:1547413850683609178> **Remitly**\n' +
          'Pagos internacionales de forma rápida y segura.\n\n' +

          '<:oxxo:1547413887400288256> **Depósito en OXXO**\n' +
          'Realiza tu pago en cualquier sucursal OXXO.\n\n' +

          '<:transfe:1547413933290160148> **Transferencia bancaria**\n' +
          'Transferencias nacionales desde cualquier banco.\n\n'
        )
        .setFooter({
          text: 'Abre ticket para comenzar tu pedido'
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
