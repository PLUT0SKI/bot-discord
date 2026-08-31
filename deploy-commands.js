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
  new SlashCommandBuilder()
    .setName('cancelarsorteo')
    .setDescription('Cancela un sorteo activo')
    .addStringOption(option => option.setName('id').setDescription('ID del sorteo').setRequired(true))
    .toJSON()
];

if (!DISCORD_TOKEN) {
  console.error('❌ NO SE ENCONTRO DISCORD_TOKEN.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function ejecutarConTimeout(peticion, nombre) {
  try {
    console.log(`⏳ ${nombre}...`);
    const resultado = await Promise.race([
      peticion(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: Discord no respondió a tiempo en ${nombre}.`)), 20000)
      )
    ]);
    console.log(`✅ ${nombre} completado.`);
    return resultado;
  } catch (error) {
    console.error(`❌ ${nombre} falló.`);
    console.error(`Código: ${error.code ?? 'N/A'}`);
    console.error(`Mensaje: ${error.message ?? error}`);
    if (error.rawError) console.error('Respuesta de Discord:', error.rawError);
    throw error;
  }
}

(async () => {
  try {
    console.log('🗑️ Eliminando comandos globales...');
    await ejecutarConTimeout(
      () => rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] }),
      'Eliminación de comandos globales'
    );

    console.log('🗑️ Eliminando comandos anteriores del servidor...');
    await ejecutarConTimeout(
      () => rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] }),
      'Eliminación de comandos del servidor'
    );

    console.log('🔄 Registrando comandos nuevos...');
    await ejecutarConTimeout(
      () => rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }),
      'Registro de comandos nuevos'
    );

    console.log('');
    console.log('======================================');
    console.log('✅ COMANDOS REGISTRADOS CORRECTAMENTE');
    console.log('======================================');
    console.log('✅ /tickets');
    console.log('✅ /pagos');
    console.log('✅ /addreaction');
    console.log('✅ /setlogs');
    console.log('✅ /clear');
    console.log('✅ /embed');
    console.log('✅ /sorteo');
    console.log('✅ /reroll');
    console.log('✅ /cancelarsorteo');
    console.log('======================================');
  } catch (error) {
    console.error('');
    console.error('======================================');
    console.error('❌ NO SE PUDIERON REGISTRAR LOS COMANDOS');
    console.error('======================================');
    console.error(error);
    process.exitCode = 1;
  }
})();
