const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Muestra el panel de tickets')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken('MTU0MzY0NDY2ODk2Nzc4MDQ2Mg.Gu53cG.1KJasPuxk6qTMY4iNEFm7V9Lt7BABfSQG-trDo');

(async () => {
  await rest.put(
    Routes.applicationCommands('1543644668967780462'),
    { body: commands }
  );

  console.log('Comandos registrados 🔥');
})();