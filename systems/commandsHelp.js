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
      ['`/sorteo`', 'Abre el formulario para crear un sorteo.', '🛡️ Gestionar servidor'],
      ['`/reroll`', 'Elige un nuevo ganador de un sorteo finalizado.', '🛡️ Gestionar servidor']
    ]
  },
  {
    categoria: '🛠️ Administración',
    comandos: [
      ['`/clear`', 'Elimina mensajes del canal.', '🛡️ Gestionar mensajes'],
      ['`/embed`', 'Abre el creador de embeds personalizados.', '🛡️ Gestionar mensajes'],
      ['`/addreaction`', 'Configura una reacción para asignar un rol.'],
      ['`/setlogs`', 'Configura el canal donde se enviarán los logs.']
    ]
  },
  {
    categoria: '📋 Información',
    comandos: [['`/comandos`', 'Muestra esta lista de comandos y sus permisos.']]
  }
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'comandos') return;
    if (!(await verificarAcceso(interaction))) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 Comandos disponibles')
      .setDescription('Aquí tienes los comandos disponibles, una descripción corta y los permisos necesarios para utilizarlos.')
      .setColor('#5865F2')
      .setFooter({ text: 'Sistema de comandos' })
      .setTimestamp();

    for (const grupo of COMANDOS) {
      const texto = grupo.comandos
        .map(([comando, descripcion, permiso]) => permiso ? `${comando} — ${descripcion}\n${permiso}` : `${comando} — ${descripcion}`)
        .join('\n\n');

      embed.addFields({ name: grupo.categoria, value: texto });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
};