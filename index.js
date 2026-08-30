const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log('Bot encendido 🔥');
});


// =======================
// 🎉 BIENVENIDA
// =======================
client.on('guildMemberAdd', async member => {

  const canal = member.guild.channels.cache.find(c => c.name === 'bienvenida');
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('¡Bienvenido/a!')
    .setDescription(
      `Hola ${member}, es un placer tenerte aquí.\n\n` +
      `Pásate por los canales y disfruta 🔥`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://i.imgur.com/tuimagen.png');

  canal.send({
    content: `👋 ¡Hola ${member}!`,
    embeds: [embed]
  });

});


// =======================
// 🎟️ PANEL DE TICKETS
// =======================
client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'tickets') {

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Centro de Atención')
        .setDescription(
          '**Comprar**\n🛍️ Ticket para compras\n\n' +
          '**Dudas/Soporte**\n➕ Problemas o dudas\n\n' +
          '**Alianzas**\n🤝 Colaboraciones\n\n' +
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
    }
  }


  // =======================
  // 📂 CREAR TICKET
  // =======================
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === 'ticket_menu') {

      // Respondemos inmediatamente para que Discord no marque
      // la interacción como "no respondió a tiempo".
      await interaction.deferReply({
        ephemeral: true
      });

      const tipo = interaction.values[0];

      try {

        const canal = await interaction.guild.channels.create({
          name: `${tipo}-${interaction.user.username}`,
          type: 0,

          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel
              ]
            },

            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });

        await canal.send(
          `🎫 Ticket creado para ${interaction.user}`
        );

        await interaction.editReply({
          content: `✅ Tu ticket fue creado: ${canal}`
        });

      } catch (error) {

        console.error('❌ Error al crear el ticket:', error);

        await interaction.editReply({
          content:
            '❌ No pude crear el ticket.\n\n' +
            'Revisa que el bot tenga el permiso **Administrar canales**.'
        });
      }
    }
  }

});


// =======================
// 🔑 LOGIN
// =======================
client.login(process.env.DISCORD_TOKEN);
