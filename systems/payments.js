const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { verificarAcceso } = require('../utils/commandAccess');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'pagos') {
        if (!await verificarAcceso(interaction)) return;
        const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('MÉTODOS DE PAGO').setDescription(
          'Aceptamos los siguientes métodos de pago:.\n\n<:remitly:1547413850683609178> **Remitly**\n Pagos internacionales de forma rápida y segura.\n\n<:oxxo:1547413887400288256> **Depósito en OXXO**\n Realiza tu pago en cualquier sucursal OXXO.\n\n<:transfe:1547413933290160148> **Transferencia bancaria**\n Transferencias nacionales desde cualquier banco.'
        ).setFooter({ text: 'Abre ticket para comenzar tu pedido' }).setTimestamp();
