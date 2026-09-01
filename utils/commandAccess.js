const ALLOWED_ROLE_IDS = new Set([
  '1357832734596141249',
  '1379927998500966610',
  '1543794671195529246'
]);

function tieneAcceso(interaction) {
  return Boolean(
    interaction.inGuild() &&
    interaction.member?.roles?.cache?.some(role => ALLOWED_ROLE_IDS.has(role.id))
  );
}

async function verificarAcceso(interaction) {
  if (tieneAcceso(interaction)) return true;
  await interaction.reply({
    content: '❌ No tienes permiso para usar este comando.',
    ephemeral: true
  });
  return false;
}

module.exports = { ALLOWED_ROLE_IDS, tieneAcceso, verificarAcceso };
