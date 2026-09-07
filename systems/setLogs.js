const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const { verificarAcceso } = require('../utils/commandAccess');

const LOGS_FILE = './logsConfig.json';

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'setlogs') return;

    try {
      if (!(await verificarAcceso(interaction))) return;

      if (!interaction.guild) {
        return await interaction.reply({
          content: '❌ Este comando solo puede usarse dentro de un servidor.',
          ephemeral: true
        });
      }

      const canal = interaction.options.getChannel('canal');

      if (!canal || canal.type !== ChannelType.GuildText) {
        return await interaction.reply({
          content: '❌ Debes seleccionar un canal de texto válido.',
          ephemeral: true
        });
      }

      const botMember = interaction.guild.members.me;
      const permisos = canal.permissionsFor(botMember);

      if (!permisos?.has(PermissionsBitField.Flags.ViewChannel) ||
          !permisos.has(PermissionsBitField.Flags.SendMessages) ||
          !permisos.has(PermissionsBitField.Flags.EmbedLinks)) {
        return await interaction.reply({
          content: '❌ No puedo enviar logs a ese canal. Necesito **Ver canal**, **Enviar mensajes** y **Insertar enlaces**.',
          ephemeral: true
        });
      }

      let logsConfig = {};

      if (fs.existsSync(LOGS_FILE)) {
        try {
          logsConfig = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) || {};
        } catch {
          logsConfig = {};
        }
      }

      logsConfig[interaction.guild.id] = canal.id;
      fs.writeFileSync(LOGS_FILE, JSON.stringify(logsConfig, null, 2));

      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('⚙️ Sistema de logs configurado')
        .setDescription('El canal de logs fue configurado correctamente.')
        .addFields({ name: '📋 Canal', value: `<#${canal.id}>` })
        .setFooter({ text: 'Sistema de logs' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('ERROR EN /setlogs:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Ocurrió un error al configurar los logs.',
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error al configurar los logs.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  });
};
