const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const PRECIO_ROBUX = 200;
const PRECIO_TRANSFERENCIA = 100;
const PRECIO_DEPOSITO = 100;
const MULTIPLICADOR_CAMISA = 1;
const MULTIPLICADOR_PANTALON = 1;
const MULTIPLICADOR_CONJUNTO = 1.7;

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'pagos') {
        const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('MÉTODOS DE PAGO').setDescription(
          'Selecciona el método de pago que quieras utilizar.\n\n🪙 **Robux**\n🏦 **Transferencia**\n💵 **Depósito**'
        ).setFooter({ text: 'El precio se mostrará al completar tu pedido' }).setTimestamp();
        const menu = new StringSelectMenuBuilder().setCustomId('pagos_menu').setPlaceholder('Selecciona un método de pago').addOptions(
          { label: 'Robux', value: 'robux', emoji: '🪙' },
          { label: 'Transferencia', value: 'transferencia', emoji: '🏦' },
          { label: 'Depósito', value: 'deposito', emoji: '💵' }
        );
        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
        return interaction.reply({ content: '✅ Panel de métodos de pago enviado.', ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'pagos_menu') {
        const metodo = interaction.values[0];
        if (!['robux', 'transferencia', 'deposito'].includes(metodo)) return interaction.reply({ content: '❌ Método de pago no válido.', ephemeral: true });
        const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('¿QUÉ QUIERES COMPRAR?').setDescription(
          'Selecciona el producto que deseas comprar.\n\n👕 **Camisa**\n🩳 **Pantalón/Short**\n👔 **Conjunto completo**'
        ).setFooter({ text: 'El precio se mostrará al finalizar tu pedido' }).setTimestamp();
        const menu = new StringSelectMenuBuilder().setCustomId(`producto_menu_${metodo}`).setPlaceholder('¿Qué quieres comprar?').addOptions(
          { label: 'Camisa', value: 'camisa', emoji: '👕' },
          { label: 'Pantalón/Short', value: 'pantalon', emoji: '🩳' },
          { label: 'Conjunto completo', value: 'conjunto', emoji: '👔' }
        );
        return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('producto_menu_')) {
        const metodo = interaction.customId.replace('producto_menu_', '');
        const producto = interaction.values[0];
        if (!['robux', 'transferencia', 'deposito'].includes(metodo)) return interaction.reply({ content: '❌ Método de pago inválido.', ephemeral: true });
        if (!['camisa', 'pantalon', 'conjunto'].includes(producto)) return interaction.reply({ content: '❌ Producto inválido.', ephemeral: true });
        const input = new TextInputBuilder().setCustomId('cantidad_producto').setLabel('¿Cuántos quieres comprar?').setPlaceholder('Ejemplo: 5').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(4);
        const modal = new ModalBuilder().setCustomId(`pedido_cantidad_${metodo}_${producto}`).setTitle('Cantidad').addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (!interaction.isModalSubmit() || !interaction.customId.startsWith('pedido_cantidad_')) return;
      const [metodo, producto] = interaction.customId.replace('pedido_cantidad_', '').split('_');
      const cantidad = Number(interaction.fields.getTextInputValue('cantidad_producto'));
      if (!Number.isInteger(cantidad) || cantidad <= 0) return interaction.reply({ content: '**❌ Introduce una cantidad válida. Por ejemplo: __5__**', ephemeral: true });
      if (cantidad > 1000) return interaction.reply({ content: '**❌ La cantidad máxima por pedido es de __1000__.**', ephemeral: true });

      const metodos = {
        robux: ['Robux', PRECIO_ROBUX, 'Robux'],
        transferencia: ['Transferencia', PRECIO_TRANSFERENCIA, 'MXN'],
        deposito: ['Depósito', PRECIO_DEPOSITO, 'MXN']
      };
      const productos = {
        camisa: ['Camisa', MULTIPLICADOR_CAMISA],
        pantalon: ['Pantalón/Short', MULTIPLICADOR_PANTALON],
        conjunto: ['Conjunto completo', MULTIPLICADOR_CONJUNTO]
      };
      if (!metodos[metodo] || !productos[producto]) return interaction.reply({ content: '❌ Datos del pedido no válidos.', ephemeral: true });
      const [nombreMetodo, precioBase, moneda] = metodos[metodo];
      const [nombreProducto, multiplicador] = productos[producto];
      const precioPorUnidad = precioBase * multiplicador;
      const total = cantidad * precioPorUnidad;
      const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('🧾 RESUMEN DE TU PEDIDO').setDescription('Aquí están los detalles completos de tu pedido:').addFields(
        { name: '💳 Método de pago', value: `\`${nombreMetodo}\``, inline: true },
        { name: '🛍️ Producto', value: `\`${nombreProducto}\``, inline: true },
        { name: '📦 Cantidad', value: `\`${cantidad}\``, inline: true },
        { name: '💰 Precio por unidad', value: `**${precioPorUnidad} ${moneda}**`, inline: true },
        { name: '💵 TOTAL', value: `**${total} ${moneda}**`, inline: false },
        { name: '\u200B', value: '🛒 Para comprar abre un <#1357832842561978505>', inline: false }
      ).setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) { console.error('ERROR EN EL SISTEMA DE PAGOS:', error); }
  });
};
