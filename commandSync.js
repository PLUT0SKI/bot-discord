const { Client } = require('discord.js');
const { syncCommands } = require('./deploy-commands.js');

const loginOriginal = Client.prototype.login;

Client.prototype.login = async function (...args) {
  try {
    await syncCommands();
  } catch (error) {
    console.error('❌ No se pudieron comprobar/actualizar los comandos automáticamente.');
    console.error(error);
    console.error('⚠️ El bot continuará iniciándose.');
  }

  return loginOriginal.apply(this, args);
};
