const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TICKET_CATEGORY_ID = '1357832792699834548';
const WELCOME_CHANNEL_ID = '1357832795547893861';

client.once('ready', () => {
  console.log('BOT ENCENDIDO COMO ' + client.user.tag);
});

// =======================
// BIENVENIDA
// =======================

client.on('guildMemberAdd', async (member) => {
  try {
    const canal = member.guild.channels.cache.get(
  WELCOME_CHANNEL_ID
);

    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('Bienvenido/a')
      .setDescription(
        'Hola ' + member + ', es un placer tenerte aqui.\n\n' +
        'Pasate por los canales y disfruta.'
      )
      .setThumbnail(
        member.user.displayAvatarURL({
          size: 256
        })
      );

    await canal.send({
      content: 'Hola ' + member + '!',
      embeds: [embed]
    });

  } catch (error) {
    console.error('ERROR EN BIENVENIDA:', error);
  }
});

// =======================
// INTERACCIONES
// =======================

client.on('interactionCreate', async (interaction) => {
  try {

    // =======================
    // COMANDO /TICKETS
    // =======================

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName !== 'tickets') return;

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Centro de Atencion')
        .setDescription(
          '**Comprar**\n' +
          'Ticket para compras.\n\n' +

          '**Dudas/Soporte**\n' +
          'Problemas o dudas.\n\n' +

          '**Alianzas**\n' +
          'Colaboraciones.\n\n' +

          'Solo puedes tener un ticket abierto a la vez.'
        );

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Selecciona una opcion')
        .addOptions([
          {
            label: 'Comprar',
            value: 'Comprar',
            emoji: '🛍️'
          },
          {
            label: 'Soporte',
            value: 'Soporte',
            emoji: '➕'
          },
          {
            label: 'Alianzas',
            value: 'Alianza',
            emoji: '🤝'
          }
        ]);

      const row = new ActionRowBuilder()
        .addComponents(menu);

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });

      return;
    }

    // =======================
    // BOTONES
    // =======================

    if (interaction.isButton()) {

      // BOTON CERRAR
      if (interaction.customId === 'cerrar_ticket') {

        const confirmar = new ButtonBuilder()
          .setCustomId('confirmar_cierre')
          .setLabel('Si, cerrar')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success);

        const cancelar = new ButtonBuilder()
          .setCustomId('cancelar_cierre')
          .setLabel('Cancelar')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger);

        const rowConfirmacion = new ActionRowBuilder()
          .addComponents(confirmar, cancelar);

        await interaction.reply({
          content: '⚠️ ¿Estas seguro de que quieres cerrar este ticket?',
          components: [rowConfirmacion],
          ephemeral: true
        });

        return;
      }

      // CANCELAR CIERRE
      if (interaction.customId === 'cancelar_cierre') {

        await interaction.update({
          content: '❌ Cierre cancelado.',
          components: []
        });

        return;
      }

      // CONFIRMAR CIERRE
      if (interaction.customId === 'confirmar_cierre') {

        await interaction.update({
          content: '🔒 Cerrando ticket...',
          components: []
        });

        setTimeout(async () => {
          await interaction.channel.delete().catch(() => {});
        }, 2000);

        return;
      }
    }

    // =======================
    // CREAR TICKET
    // =======================

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId !== 'ticket_menu') return;

      const tipo = interaction.values[0];
      const guild = interaction.guild;
      const user = interaction.user;

      if (!guild) {
        await interaction.reply({
          content: 'Esta accion solo puede utilizarse dentro de un servidor.',
          ephemeral: true
        });
        return;
      }

      // =======================
      // COMPROBAR TICKET EXISTENTE
      // =======================

const ticketExistente = guild.channels.cache.find(
  (channel) =>
    channel.type === ChannelType.GuildText &&
    channel.parentId === TICKET_CATEGORY_ID &&
    channel.topic &&
    channel.topic.startsWith('TICKET_USER:' + user.id + ' |')
);

if (ticketExistente) {
  await interaction.reply({
    content: 'Ya tienes un ticket abierto: <#' + ticketExistente.id + '>',
    ephemeral: true
  });
  return;
}

      // =======================
      // COMPROBAR CATEGORIA
      // =======================

      const categoria = guild.channels.cache.get(
        TICKET_CATEGORY_ID
      );

      if (!categoria) {
        await interaction.reply({
          content: 'No se encontro la categoria de tickets.',
          ephemeral: true
        });

        console.error(
          'CATEGORIA NO ENCONTRADA: ' + TICKET_CATEGORY_ID
        );

        return;
      }

      // =======================
      // NOMBRE DEL CANAL
      // =======================

      const username = user.username
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .slice(0, 20);

      const channelName =
        tipo + '-' + username;

      // =======================
      // CREAR CANAL
      // =======================

      const canal = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,

        topic:
          'TICKET_USER:' +
          user.id +
          ' | TIPO:' +
          tipo,

        permissionOverwrites: [
          {
            id: guild.id,
            deny: [
              PermissionsBitField.Flags.ViewChannel
            ]
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      // =======================
      // MENSAJE DEL TICKET
      // =======================

      const ticketEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Ticket creado')
        .setDescription(
          'Hola <@' + user.id + '>, gracias por contactar con nosotros.\n\n' +
          '**Tipo:** ' + tipo + '\n\n' +
          'Explica tu problema o solicitud y espera a que un miembro del equipo te atienda.'
        )
        .setTimestamp();

      // BOTON CERRAR
      const cerrarBoton = new ButtonBuilder()
        .setCustomId('cerrar_ticket')
        .setLabel('Cerrar ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const rowCerrar = new ActionRowBuilder()
        .addComponents(cerrarBoton);

      await canal.send({
        content: 'Bienvenido <@' + user.id + '>',
        embeds: [ticketEmbed],
        components: [rowCerrar]
      });

      await interaction.reply({
        content:
          'Tu ticket fue creado correctamente: <#' + canal.id + '>',
        ephemeral: true
      });

      console.log(
        'TICKET CREADO: ' +
        canal.name +
        ' | USUARIO: ' +
        user.tag
      );

      return;
    }

  } catch (error) {

    console.error(
      'ERROR EN INTERACTIONCREATE:',
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          'Ocurrio un error al realizar esta accion.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =======================
// ERRORES DEL CLIENTE
// =======================

client.on('error', (error) => {
  console.error(
    'ERROR DEL CLIENTE DE DISCORD:',
    error
  );
});

// =======================
// LOGIN
// =======================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    'NO SE ENCONTRO DISCORD_TOKEN EN RAILWAY.'
  );
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
