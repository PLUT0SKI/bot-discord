const fs = require('fs');

const REACTION_FILE = './reactionRoles.json';
let reactionRoles = {};

if (fs.existsSync(REACTION_FILE)) {
  try {
    reactionRoles = JSON.parse(fs.readFileSync(REACTION_FILE, 'utf8'));
    console.log('CONFIGURACIONES DE REACCIONES CARGADAS.');
  } catch (error) {
    console.error('ERROR AL CARGAR reactionRoles.json:', error);
    reactionRoles = {};
  }
}

function guardarReactionRoles() {
  try {
    fs.writeFileSync(REACTION_FILE, JSON.stringify(reactionRoles, null, 2));
  } catch (error) {
    console.error('ERROR AL GUARDAR REACTION ROLES:', error);
  }
}

function getEmojiKey(reaction) {
  return reaction.emoji.id ? `custom:${reaction.emoji.id}` : `unicode:${reaction.emoji.name}`;
}

module.exports = (client) => {
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();

      const config = reactionRoles[`${reaction.message.id}:${getEmojiKey(reaction)}`];
      if (!config) return;

      const guild = reaction.message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(config.roleId);
      if (!role) return;

      const botMember = guild.members.me;
      if (!botMember || role.position >= botMember.roles.highest.position) return;

      await member.roles.add(role);
      console.log(`ROL ENTREGADO: ${role.name} -> ${user.tag}`);
    } catch (error) {
      console.error('ERROR AL DAR ROL:', error);
    }
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();

      const config = reactionRoles[`${reaction.message.id}:${getEmojiKey(reaction)}`];
      if (!config) return;

      const guild = reaction.message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(config.roleId);
      if (!role) return;

      await member.roles.remove(role);
      console.log(`ROL QUITADO: ${role.name} -> ${user.tag}`);
    } catch (error) {
      console.error('ERROR AL QUITAR ROL:', error);
    }
  });

  return {
    getConfig: () => reactionRoles,
    save: guardarReactionRoles
  };
};
