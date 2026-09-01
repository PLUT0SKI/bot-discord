const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1543644668967780462';
const GUILD_ID = '1216948563834175488';

const commands = [
  new SlashCommandBuilder().setName('tickets').setDescription('Muestra el panel de tickets').toJSON(),
  new SlashCommandBuilder().setName('pagos').setDescription('Muestra el panel de métodos de pago').toJSON(),
  new SlashCommandBuilder()
    .setName('addreaction').setDescription('Configura una reacción para dar un rol')
    .addStringOption(option => option.setName('mensaje').setDescription('ID del mensaje al que quieres agregar la reacción').setRequired(true))
    .addStringOption(option => option.setName('emoji').setDescription('Emoji que deben reaccionar').setRequired(true))
    .addRoleOption(option => option.setName('rol').setDescription('Rol que recibirá el usuario').setRequired(true)).toJSON(),
  new SlashCommandBuilder()
    .setName('setlogs').setDescription('Configura el canal donde se enviarán los logs')
    .addChannelOption(option => option.setName('canal').setDescription('Canal donde se enviarán los logs').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName('clear').setDescription('Elimina todos los mensajes del canal').toJSON(),
  new SlashCommandBuilder().setName('embed').setDescription('Abre el creador de embeds').toJSON(),
  new SlashCommandBuilder().setName('sorteo').setDescription('Abre el formulario para crear un sorteo').toJSON(),
  new SlashCommandBuilder()
    .setName('reroll')
    .setDescription('Elige un nuevo ganador de un sorteo finalizado')
    .addStringOption(option => option.setName('id').setDescription('ID del sorteo').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder().setName('sugerencias').setDescription('Muestra el panel para enviar sugerencias').toJSON(),
  new SlashCommandBuilder().setName('comandos').setDescription('Muestra todos los comandos disponibles, su función y quién puede usarlos').toJSON()
];

function normalizarComando(command) {
  return {
    type: command.type ?? 1,
    name: command.name,
    description: command.description ?? '',
    options: command.options ?? [],
    default_member_permissions: command.default_member_permissions ?? null,
    dm_permission: command.dm_permission ?? true,
    nsfw: command.nsfw ?? false
  };
}

function comandosSonIguales(actuales) {
  const esperados = commands.map(normalizarComando);
  const existentes = actuales
    .filter(command => command.type === 1)
    .map(normalizarComando);

  if (existentes.length !== esperados.length) return false;

  const ordenar = lista => lista.sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(ordenar(existentes)) === JSON.stringify(ordenar(esperados));
}

async function syncCommands() {
  if (!DISCORD_TOKEN) {
    throw new Error('NO SE ENCONTRO DISCORD_TOKEN.');
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  console.log('🔎 Comprobando comandos de Discord...');

  const actuales = await rest.get(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  );

  if (comandosSonIguales(actuales)) {
    console.log('✅ Los comandos ya están actualizados. No se modificó nada.');
    return false;
  }

  console.log('🔄 Cambios detectados. Actualizando comandos...');

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('✅ Comandos actualizados correctamente.');
  return true;
}

module.exports = { syncCommands, commands };

if (require.main === module) {
  syncCommands()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('');
      console.error('❌ ERROR AL REGISTRAR COMANDOS:');
      console.error(error);
      process.exit(1);
    });
}