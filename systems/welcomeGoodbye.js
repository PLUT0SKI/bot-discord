const { EmbedBuilder } = require('discord.js');

const WELCOME_CHANNEL_ID = '1543780167900471316';
const GOODBYE_CHANNEL_ID = '1543780307688497223';

module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    try {
      const canal = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!canal) return;

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Bienvenido/a')
        .setDescription(`Hola <@${member.id}>, es un placer tenerte aqui.\n\nPasate por los canales y disfruta.`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }));

      await canal.send({ content: `Hola <@${member.id}>!`, embeds: [embed] });
    } catch (error) {
      console.error('ERROR EN BIENVENIDA:', error);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const canal = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
      if (!canal) return;

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Hasta pronto')
        .setDescription(`Adios <@${member.id}>, ha salido de la comunidad.\n\nEsperamos volver a verte pronto.`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }));

      await canal.send({ content: `Adios <@${member.id}>!`, embeds: [embed] });
    } catch (error) {
      console.error('ERROR EN DESPEDIDA:', error);
    }
  });
};
