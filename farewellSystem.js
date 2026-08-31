const { Client, EmbedBuilder, PermissionsBitField } = require('discord.js');

const GOODBYE_CHANNEL_ID = '1543780307688497223';

function install(client) {
  if (client.__farewellSystemInstalled) return;
  client.__farewellSystemInstalled = true;

  client.on('guildMemberRemove', async (member) => {
    try {
      if (!member.guild) return;
      if (member.user?.bot) return;

      const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);

      if (!channel || !channel.isTextBased()) {
        console.error(`❌ No encontré el canal de despedidas ${GOODBYE_CHANNEL_ID} en ${member.guild.name}.`);
        return;
      }

      const me = member.guild.members.me;
      if (me) {
        const permissions = channel.permissionsFor(me);
        if (!permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
            !permissions?.has(PermissionsBitField.Flags.SendMessages)) {
          console.error(`❌ El bot no tiene permisos para enviar mensajes en el canal de despedidas ${GOODBYE_CHANNEL_ID}.`);
          return;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('👋 ¡Hasta pronto!')
        .setDescription(`**${member.user.username}** ha salido de la comunidad.\n\nEsperamos volver a verte pronto. ❤️`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: member.guild.name })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      console.log(`👋 Despedida enviada para ${member.user.tag} en ${member.guild.name}.`);
    } catch (error) {
      console.error('❌ ERROR EN SISTEMA DE DESPEDIDAS:', error);
    }
  });
}

const previousLogin = Client.prototype.login;

Client.prototype.login = function (...args) {
  if (!this.__farewellSystemInstalled) {
    install(this);
  }

  return previousLogin.apply(this, args);
};

module.exports = { install };
