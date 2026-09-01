const fs = require('fs');

const REACTION_FILE = './reactionRoles.json';
let reactionRoles = {};

function cargarReactionRoles() {
  try {
    if (fs.existsSync(REACTION_FILE)) {
      reactionRoles = JSON.parse(fs.readFileSync(REACTION_FILE, 'utf8'));
    } else {
      reactionRoles = {};
    }
  } catch (error) {
    console.error('ERROR AL CARGAR reactionRoles.json:', error);
    reactionRoles = {};
  }
}

cargarReactionRoles();

function guardarReactionRoles() {
  try {
    fs.writeFileSync(REACTION_FILE, JSON.stringify(reactionRoles, null, 2));
  } catch (error) {
    console.error('ERROR AL GUARDAR REACTION ROLES:', error);
  }
}

function getEmojiKey(reaction) {
  return reaction.emoji.id
    ? `custom:${reaction.emoji.id}`
    : `unicode:${reaction.emoji.name}`;
}

module.exports = client => {
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();

      // Recargar la configuración para detectar reacciones creadas
      // mediante /addreaction mientras el bot ya estaba encendido.
      cargarReactionRoles();

      const config = reactionRoles[`${reaction.message.id}:${getEmojiKey(reaction)}`];
      if (!config || !reaction.message.guild) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(config.roleId);
      const botMember = reaction.message.guild.members.me;

      if (!role || !botMember) return;
      if (role.managed || role.position >= botMember.roles.highest.position) {
        console.error(`NO SE PUEDE ENTREGAR EL ROL ${role.name}: revisa la jerarquía de roles del bot.`);
        return;
      }

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

      cargarReactionRoles();

      const config = reactionRoles[`${reaction.message.id}:${getEmojiKey(reaction)}`];
      if (!config || !reaction.message.guild) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(config.roleId);
      if (!role || role.managed) return;

      await member.roles.remove(role);
      console.log(`ROL QUITADO: ${role.name} -> ${user.tag}`);
    } catch (error) {
      console.error('ERROR AL QUITAR ROL:', error);
    }
  });
};
