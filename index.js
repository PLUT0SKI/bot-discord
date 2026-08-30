```js
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =======================
// ⚙️ CONFIGURACIÓN
// =======================

const TICKET_CATEGORY_ID = '1357832792699834548';

// =======================
// 🤖 BOT ENCENDIDO
// =======================

client.once('ready', () => {
  console.log(`✅ Bot encendido como ${client.user.tag}`);
});

// =======================
// 🎉 BIENVENIDA
// =======================

client.on('guildMemberAdd', async member => {
  try {
    const canal = member.guild.channels.cache.find(
      c => c.name === 'bienvenida' && c.isTextBased()
    );

    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('¡Bienvenido/a!')
      .setDescription(
        `Hola ${member}, es un placer tenerte aquí.\n\n` +
        `Pásate por los canales y disfruta 🔥`
      )
      .setThumbnail(
        member.user.displayAvatarURL({
          dynamic: true,
          size: 256
        })
      );

    await canal.send({
      content: `👋 ¡Hola ${member}!`,
      embeds: [embed]
    });

  } catch (error) {
    console.error('❌ Error en bienvenida:', error);
  }
});

// =======================
// 🎟️ INTERACCIONES
// =======================

client.on('interactionCreate', async interaction => {
  try {

    // =======================
    // 🎟️ COMANDO /TICKETS
    // =======================

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName !== 'tickets') return;

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Centro de Atención')
        .setDescription(
          '**Comprar**\n' +
          '🛍️ Ticket para compras\n\n' +

          '**Dudas/Soporte**\n' +
          '➕ Problemas o dudas\n\n' +

          '**Alianzas**\n' +
          '🤝 Colaboraciones\n\n' +

          '⚠️ Solo un ticket a la vez'
        );

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Selecciona una opción')
        .addOptions([
          {
            label: 'Comprar',
            value: 'comprar',
            emoji: '🛍️'
          },
          {
            label: 'Soporte',
            value: 'soporte',
            emoji: '➕'
          },
          {
            label: 'Alianzas',
            value: 'alianza',
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
    // 📂 CREAR TICKET
    // =======================

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId !== 'ticket_menu') return;

      const tipo = interaction.values[0];
      const guild = interaction.guild;
      const user = interaction.user;

      if (!guild) {
        await interaction.reply({
          content: '❌ Esta acción solo puede utilizarse dentro de un servidor.',
          ephemeral: true
        });
        return;
      }

      // =======================
      // 🔎 COMPROBAR SI YA TIENE TICKET
      // =======================

      const ticketExistente = guild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText &&
        channel.topic?.includes(`TICKET_USER:${user.id}`)
      );

      if (ticketExistente) {
        await interaction.reply({
          content: `⚠️ Ya tienes un ticket abierto: ${ticketExistente}`,
          ephemeral: true
        });
        return;
      }

      // =======================
      // 📂 COMPROBAR CATEGORÍA
      // =======================

      const categoria = guild.channels.cache.get(TICKET_CATEGORY_ID);

      if (!categoria) {
        await interaction.reply({
          content: '❌ No se encontró la categoría de tickets.',
          ephemeral: true
        });

        console.error(
          `❌ Categoría no encontrada: ${TICKET_CATEGORY_ID}`
        );

        return;
      }

      // =======================
      // 🧹 LIMPIAR NOMBRE
      // =======================

      const username = user.username
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .slice(0, 20);

      const channelName = `ticket-${tipo}-${username}`;

      // =======================
      // 📂 CREAR CANAL
      // =======================

      const canal = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,

        topic: `TICKET_USER:${user.id} | TIPO:${tipo}`,

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
      // 🎫 MENSAJE DEL TICKET
      // =======================

      const ticketEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🎫 Ticket creado')
        .setDescription(
          `Hola ${user}, gracias por contactar con nosotros.\n\n` +
          `**Tipo:** ${tipo}\n\n` +
          `Explica tu problema o solicitud y espera a que un miembro del equipo te atienda.\n\n` +
          `⚠️ No abras otro ticket mientras este permanezca abierto.`
        )
        .setTimestamp();

      await canal.send({
        content: `👋 Bienvenido ${user}`,
        embeds: [ticketEmbed]
      });

      await interaction.reply({
        content: `✅ Tu ticket fue creado correctamente: ${canal}`,
        ephemeral: true
      });

      console.log(
        `🎫 Ticket creado: ${canal.name} | Usuario: ${user.tag}`
      );
    }

  } catch (error) {
    console.error('❌ Error en interactionCreate:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocurrió un error al realizar esta acción.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =======================
// ❌ ERRORES
// =======================

client.on('error', error => {
  console.error('❌ Error del cliente Discord:', error);
});

// =======================
// 🔑 LOGIN RAILWAY
// =======================

client.login(process.env.DISCORD_TOKEN);
