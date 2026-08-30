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
    .setDescription(`Hola ${member}, es un placer tenerte aquí.\n\nPásate por los canales y disfruta 🔥`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://i.imgur.com/tuimagen.png'); // tu banner

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

      const row = new ActionRowBuilder().addComponents(menu);

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

      const tipo = interaction.values[0];

      const canal = await interaction.guild.channels.create({
        name: `${tipo}-${interaction.user.username}`,
        type: 0,
        parent: '1357832792699834548',
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      canal.send(`🎫 Ticket creado para ${interaction.user}`);

      interaction.reply({
        content: '✅ Tu ticket fue creado',
        ephemeral: true
      });
    }
  }

});

client.login(process.env.DISCORD_TOKEN);
