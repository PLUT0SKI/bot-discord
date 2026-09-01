const { PermissionsBitField, ChannelType } = require('discord.js');

module.exports = client => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'clear') return;
    try {
      if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ No tienes permiso para usar este comando.', ephemeral: true });
      const canal = interaction.channel;
      if (!canal || canal.type !== ChannelType.GuildText) return interaction.reply({ content: '❌ Este comando solo funciona en canales de texto.', ephemeral: true });
      const bot = interaction.guild.members.me;
      if (!bot || !canal.permissionsFor(bot)?.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Necesito el permiso **Gestionar mensajes** para poder vaciar este canal.', ephemeral: true });
      await interaction.reply({ content: '🧹 **Vaciando el canal...**', ephemeral: true });
      let total = 0, errores = 0;
      while (true) {
        const mensajes = await canal.messages.fetch({ limit: 100 }).catch(() => null);
        if (!mensajes?.size) break;
        const recientes = mensajes.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        const antiguos = mensajes.filter(m => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);
        if (recientes.size) {
          try { total += (await canal.bulkDelete(recientes, true)).size; }
          catch { for (const m of recientes.values()) { try { await m.delete(); total++; } catch { errores++; } } }
        }
        for (const m of antiguos.values()) { try { await m.delete(); total++; } catch { errores++; } }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      await interaction.editReply({ content: `✅ **Canal vaciado correctamente.**\n\n🗑️ Mensajes eliminados: **${total}**${errores ? `\n⚠️ No se pudieron eliminar: **${errores}**` : ''}` });
    } catch (error) { console.error('ERROR EN /CLEAR:', error); }
  });
};
