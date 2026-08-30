const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const CLIENT_ID = '1543644668967780462';
const GUILD_ID = '1216948563834175488';

const commands = [

  // =======================
  // /TICKETS
  // =======================

  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Muestra el panel de tickets')
    .toJSON(),

  // =======================
  // /EMBED
  // =======================

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crea un embed personalizado')

    .addStringOption(option =>
      option
        .setName('titulo')
        .setDescription('Titulo del embed')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('descripcion')
        .setDescription('Descripcion del embed')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Color hexadecimal, ejemplo: #ff0000')
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('imagen')
        .setDescription('URL de la imagen grande')
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('thumbnail')
        .setDescription('URL de la imagen pequeña')
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('footer')
        .setDescription('Texto del pie del embed')
        .setRequired(false)
    )

    .toJSON()
];

const rest = new REST({ version: '10' })
  .setToken(DISCORD_TOKEN);

(async () => {
  try {

    console.log('🔄 Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log('✅ Comandos registrados correctamente.');
    console.log('✅ /tickets');
    console.log('✅ /embed');

  } catch (error) {

    console.error('❌ ERROR AL REGISTRAR COMANDOS:');
    console.error(error);

  }
})();
