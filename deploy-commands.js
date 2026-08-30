const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Muestra el panel de tickets')
    .toJSON()
];

const rest = new REST({ version: '10' })
  .setToken(DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands('15436446689677780462'),
      { body: commands }
    );

    console.log('Comandos registrados 🔥');
  } catch (error) {
    console.error(error);
  }
})();