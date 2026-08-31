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
  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Muestra el panel de tickets')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('pagos')
    .setDescription('Muestra el panel de métodos de pago')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('addreaction')
    .setDescription('Configura una reacción para dar un rol')
    .addStringOption(option =>
      option
        .setName('mensaje')
        .setDescription('ID del mensaje al que quieres agregar la reacción')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Emoji que deben reaccionar')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('Rol que recibirá el usuario')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Configura el canal donde se enviarán los logs')
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde se enviarán los logs')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina todos los mensajes del canal')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Abre el creador de embeds')
    .toJSON(),
];

if (!DISCORD_TOKEN) {
  console.error('❌ NO SE ENCONTRO DISCORD_TOKEN.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🗑️ Eliminando comandos globales...');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );

    console.log('✅ Comandos globales eliminados.');
    console.log('🗑️ Eliminando comandos anteriores del servidor...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );

    console.log('✅ Comandos anteriores eliminados.');
    console.log('🔄 Registrando comandos nuevos...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
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
    console.log('======================================');
  } catch (error) {
    console.error('');
    console.error('❌ ERROR AL REGISTRAR COMANDOS:');
    console.error(error);
  }
})();
