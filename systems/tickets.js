const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

const TICKET_CATEGORY_ID = '1357832792699834548';
const TICKET_STAFF_ROLE_ID = '1543794671195529246';

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'tickets') {
        const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('TICKETS').setDescription(
          '**🛒 Comprar**\nAbre un ticket privado para realizar tu compra. Nuestro equipo te ayudará durante todo el proceso.\n\n' +
          '**🛠️ Dudas / Soporte**\n¿Tienes alguna duda, problema o necesitas ayuda? Abre un ticket y estaremos encantados de ayudarte.\n\n' +
          '**🤝 Alianzas**\n¿Tienes una propuesta de alianza o colaboración? Cuéntanos todos los detalles mediante un ticket.\n\n' +
          '> ⚠️ Recuerda que solo puedes tener __**un ticket abierto a la vez**__.');
        const menu = new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('Selecciona una opcion').addOptions(
          { label: 'Comprar', value: 'Comprar', emoji: '🛒' },
          { label: 'Soporte', value: 'Soporte', emoji: '🛠️' },
          { label: 'Alianzas', value: 'Alianza', emoji: '🤝' }
        );
        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
        return interaction.reply({ content: '✅ Panel de tickets enviado.', ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const tipo = interaction.values[0];
        const guild = interaction.guild;
        const user = interaction.user;
        if (!guild) return interaction.reply({ content: 'Esta accion solo puede utilizarse dentro de un servidor.', ephemeral: true });

        const existente = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.parentId === TICKET_CATEGORY_ID && channel.topic?.startsWith(`TICKET_USER:${user.id} |`));
        if (existente) return interaction.reply({ content: `Ya tienes un ticket abierto: <#${existente.id}>`, ephemeral: true });

        const categoria = guild.channels.cache.get(TICKET_CATEGORY_ID);
        if (!categoria) return interaction.reply({ content: 'No se encontro la categoria de tickets.', ephemeral: true });

        const username = user.username.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 20);
        const canal = await guild.channels.create({
          name: `${tipo}-${username}`,
          type: ChannelType.GuildText,
          parent: TICKET_CATEGORY_ID,
          topic: `TICKET_USER:${user.id} | TIPO:${tipo}`,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
            { id: TICKET_STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] }
          ]
        });

        const ticketEmbed = new EmbedBuilder().setColor('#2b2d31').setTitle('Ticket creado').setDescription(
          `Hola <@${user.id}>, gracias por contactar con nosotros.\n\n**Tipo:** ${tipo}\n\nExplica tu problema o solicitud y espera a que un miembro del equipo te atienda.`
        ).setTimestamp();
        const cerrar = new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger);
        await canal.send({ content: `<@&${TICKET_STAFF_ROLE_ID}> | Bienvenido <@${user.id}>`, embeds: [ticketEmbed], components: [new ActionRowBuilder().addComponents(cerrar)] });
        await interaction.reply({ content: `Tu ticket fue creado correctamente: <#${canal.id}>`, ephemeral: true });
        console.log(`TICKET CREADO: ${canal.name} | USUARIO: ${user.tag}`);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'cerrar_ticket') {
          const confirmar = new ButtonBuilder().setCustomId('confirmar_cierre').setLabel('Si, cerrar').setEmoji('✅').setStyle(ButtonStyle.Success);
          const cancelar = new ButtonBuilder().setCustomId('cancelar_cierre').setLabel('No, cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger);
          return interaction.reply({ content: '⚠️ ¿Estas seguro de que quieres cerrar este ticket?', components: [new ActionRowBuilder().addComponents(confirmar, cancelar)], ephemeral: true });
        }
        if (interaction.customId === 'cancelar_cierre') return interaction.update({ content: '❌ Cierre cancelado.', components: [] });
        if (interaction.customId === 'confirmar_cierre') {
          await interaction.update({ content: '🔒 Cerrando ticket...', components: [] });
          setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
        }
      }
    } catch (error) {
      console.error('ERROR EN EL SISTEMA DE TICKETS:', error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Ocurrió un error con el sistema de tickets.', ephemeral: true }).catch(() => {});
    }
  });
};
