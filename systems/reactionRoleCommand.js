const fs = require('fs');
const REACTION_FILE = './reactionRoles.json';

module.exports = client => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'addreaction') return;
    try {
      let configs = {};
      if (fs.existsSync(REACTION_FILE)) configs = JSON.parse(fs.readFileSync(REACTION_FILE, 'utf8'));
      const mensajeId = interaction.options.getString('mensaje');
      const emojiInput = interaction.options.getString('emoji');
      const rol = interaction.options.getRole('rol');
      const canal = interaction.channel;
      if (!canal || !rol) return interaction.reply({ content: '❌ Datos inválidos.', ephemeral: true });
      let mensaje;
      try { mensaje = await canal.messages.fetch(mensajeId); } catch { return interaction.reply({ content: '❌ No encontré ese mensaje en este canal.', ephemeral: true }); }
      const custom = emojiInput.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
      const reactionEmoji = custom ? custom[2] : emojiInput;
      const emojiKey = custom ? `custom:${custom[2]}` : `unicode:${emojiInput}`;
      try { await mensaje.react(reactionEmoji); } catch { return interaction.reply({ content: '❌ No pude agregar esa reacción.', ephemeral: true }); }
      configs[`${mensajeId}:${emojiKey}`] = { roleId: rol.id, guildId: interaction.guild.id, channelId: canal.id, messageId: mensajeId, emoji: emojiInput };
      fs.writeFileSync(REACTION_FILE, JSON.stringify(configs, null, 2));
      return interaction.reply({ content: `✅ **Reacción configurada correctamente.**\n\n👤 **Rol:** <@&${rol.id}>\n😀 **Emoji:** ${emojiInput}\n💬 **Mensaje:** ${mensaje.url}`, ephemeral: true });
    } catch (error) { console.error('ERROR EN /ADDREACTION:', error); }
  });
};
