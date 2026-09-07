const COMANDOS_ROLE_ID = '1357832740149399635';

const ALLOWED_ROLE_IDS = new Set([
  '1357832734596141249',
  '1379927998500966610',
  '1543794671195529246'
]);

function tieneAcceso(interaction) {
  if (!interaction.inGuild()) return false;

  const roles = interaction.member?.roles?.cache;
  if (!roles) return false;

  // Este rol solo puede usar /comandos y /invites.
  if (roles.has(COMANDOS_ROLE_ID)) {
    return interaction.commandName === 'comandos' || interaction.commandName === 'invites';
  }

  // Todos los demás comandos requieren uno de los roles autorizados.
  return interaction.commandName !== 'comandos' && interaction.commandName !== 'invites'
    ? [...roles.keys()].some(roleId => ALLOWED_ROLE_IDS.has(roleId))
    : false;
}

async function verificarAcceso(interaction) {
  if (tieneAcceso(interaction)) return true;
  await interaction.reply({
    content: '❌ No tienes permiso para usar este comando.',
    ephemeral: true
  });
  return false;
}

module.exports = { COMANDOS_ROLE_ID, ALLOWED_ROLE_IDS, tieneAcceso, verificarAcceso };
