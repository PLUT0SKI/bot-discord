const { EmbedBuilder } = require('discord.js');

const CARACTERES = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LONGITUD_NOMBRE = 3;

function generarNombre() {
  let nombre = '';

  for (let i = 0; i < LONGITUD_NOMBRE; i++) {
    nombre += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }

  return nombre;
}

function nombreEstaEnElServidor(guild, nombre) {
  return guild.members.cache.some(
    member => member.user.username.toLowerCase() === nombre.toLowerCase()
  );
}

function generarCandidatos(guild, cantidad = 10) {
  const candidatos = new Set();
  let intentos = 0;

  while (candidatos.size < cantidad && intentos < 200) {
    const nombre = generarNombre();

    if (!nombreEstaEnElServidor(guild, nombre)) {
      candidatos.add(nombre);
    }

    intentos++;
  }

  return [...candidatos];
}

module.exports = (client) => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'name') return;

    try {
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ Este comando solo puede usarse dentro de un servidor.',
          ephemeral: true
        });
        return;
      }

      const candidatos = generarCandidatos(interaction.guild);

      if (!candidatos.length) {
        await interaction.reply({
          content: '❌ No pude generar candidatos en este momento. Inténtalo de nuevo.',
          ephemeral: true
        });
        return;
      }

      const lista = candidatos
        .map(nombre => `> \`${nombre}\` 🟢`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🔎 Nombres de usuario de 3 caracteres')
        .setDescription(
          `${lista}\n\n` +
          '🟢 **No encontrado en este servidor.**\n' +
          '⚠️ Esto **no confirma disponibilidad global** en Discord; solo significa que el nombre no aparece entre los miembros de este servidor.'
        )
        .setColor('#5865F2')
        .setFooter({ text: 'Sistema de nombres' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('❌ Error ejecutando /name:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Ocurrió un error al generar los nombres.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error al generar los nombres.',
          ephemeral: true
        });
      }
    }
  });
};
