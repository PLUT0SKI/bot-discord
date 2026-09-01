const { EmbedBuilder } = require('discord.js');
const { verificarAcceso } = require('../utils/commandAccess');

const COMANDOS = [
  {
    categoria: '🎫 Tickets',
    comandos: [['`/tickets`', 'Muestra el panel para abrir un ticket.']]
  },
  {
    categoria: '💳 Pagos',
    comandos: [['`/pagos`', 'Muestra los métodos de pago disponibles.']]
  },
  {
    categoria: '🎉 Sorteos',
    comandos: [
      ['`/sorteo`', 'Abre el formulario para crear un sorteo.'],
      ['`/reroll`', 'Elige un nuevo ganador de un sorteo finalizado.']
    ]
  },
  {
    categoria: '📨 Invitaciones',
    comandos: [['`/invites`', 'Consulta cuántas invitaciones tiene un usuario.']]
  },
  {
    categoria: '🛠️ Administración',
    comandos: [
      ['`/clear`', 'Elimina mensajes del canal.'],
      ['`/embed`', 'Abre el creador de embeds personalizados.'],
      ['`/addreaction`', 'Configura una reacción para asignar un rol.'],
      ['`/setlogs`', 'Configura el canal donde se enviarán los logs.']
    ]
  },
  {
    categoria: '📋 Información',
    comandos: [['`/comandos`', 'Muestra esta lista de comandos.']]
  }
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'comandos') return;
    if (!(await verificarAcceso(interaction))) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 Comandos disponibles')
      .setDescription('Aquí tienes los comandos disponibles y una descripción corta de lo que hacen.')
      .setColor('#5865F2')
      .setFooter({ text: 'Sistema de comandos' })
      .setTimestamp();

    for (const grupo of COMANDOS) {
      const texto = grupo.comandos
        .map(([comando, descripcion]) => `${comando} — ${descripcion}`)
        .join('\n\n');

      embed.addFields({ name: grupo.categoria, value: texto });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
};