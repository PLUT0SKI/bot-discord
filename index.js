const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  Partials,
  AuditLogEvent
} = require('discord.js');

const fs = require('fs');

// ==========================================
// CLIENTE
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// ==========================================
// CONFIGURACIÓN
// ==========================================

const TICKET_CATEGORY_ID = '1357832792699834548';
const WELCOME_CHANNEL_ID = '1357832795547893861';

const REACTION_FILE = './reactionRoles.json';
const LOGS_FILE = './logsConfig.json';

// ==========================================
// CARGAR LOGS
// ==========================================

let logsConfig = {};

if (fs.existsSync(LOGS_FILE)) {
  try {
    logsConfig = JSON.parse(
      fs.readFileSync(LOGS_FILE, 'utf8')
    );

    console.log('CONFIGURACIÓN DE LOGS CARGADA.');
  } catch (error) {
    console.error(
      'ERROR AL CARGAR logsConfig.json:',
      error
    );

    logsConfig = {};
  }
}

function guardarLogs() {
  try {
    fs.writeFileSync(
      LOGS_FILE,
      JSON.stringify(logsConfig, null, 2)
    );
  } catch (error) {
    console.error(
      'ERROR AL GUARDAR LOGS:',
      error
    );
  }
}

// ==========================================
// CARGAR REACTION ROLES
// ==========================================

let reactionRoles = {};

if (fs.existsSync(REACTION_FILE)) {
  try {
    reactionRoles = JSON.parse(
      fs.readFileSync(REACTION_FILE, 'utf8')
    );

    console.log(
      'CONFIGURACIONES DE REACCIONES CARGADAS.'
    );

  } catch (error) {

    console.error(
      'ERROR AL CARGAR reactionRoles.json:',
      error
    );

    reactionRoles = {};
  }
}

function guardarReactionRoles() {
  try {

    fs.writeFileSync(
      REACTION_FILE,
      JSON.stringify(reactionRoles, null, 2)
    );

  } catch (error) {

    console.error(
      'ERROR AL GUARDAR REACTION ROLES:',
      error
    );
  }
}

// ==========================================
// FUNCIÓN GENERAL DE LOGS
// ==========================================

async function enviarLog(guild, embed) {

  try {

    if (!guild) return;

    const channelId =
      logsConfig[guild.id];

    if (!channelId) return;

    const canal =
      guild.channels.cache.get(channelId);

    if (!canal) return;

    await canal.send({
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      'ERROR AL ENVIAR LOG:',
      error
    );

  }
}

// ==========================================
// FORMATO GENERAL DE EMBED
// ==========================================

function crearLog({
  titulo,
  descripcion,
  color = '#2b2d31',
  usuario = null,
  moderador = null,
  canal = null,
  campos = []
}) {

  const embed =
    new EmbedBuilder()
      .setColor(color)
      .setTitle(titulo)
      .setDescription(
        descripcion || 'Sin información.'
      )
      .setTimestamp();

  // Avatar arriba a la derecha

  if (usuario) {

    embed.setThumbnail(
      usuario.displayAvatarURL({
        size: 256,
        extension: 'png'
      })
    );

  }

  // Usuario

  if (usuario) {

    embed.addFields({
      name: '👤 Usuario',
      value:
        `<@${usuario.id}>\n` +
        `\`${usuario.tag || usuario.username}\`\n` +
        `ID: \`${usuario.id}\``,
      inline: true
    });

  }

  // Moderador

  if (moderador) {

    embed.addFields({
      name: '🛡️ Moderador',
      value:
        `<@${moderador.id}>\n` +
        `\`${moderador.tag || moderador.username}\`\n` +
        `ID: \`${moderador.id}\``,
      inline: true
    });

  }

  // Canal

  if (canal) {

    embed.addFields({
      name: '📍 Canal',
      value: `<#${canal.id}>`,
      inline: true
    });

  }

  if (campos.length > 0) {

    embed.addFields(campos);

  }

  return embed;
}

// ==========================================
// BOT ENCENDIDO
// ==========================================

client.once('ready', () => {

  console.log(
    'BOT ENCENDIDO COMO ' +
    client.user.tag
  );

});

// ==========================================
// BIENVENIDA
// ==========================================

client.on(
  'guildMemberAdd',
  async (member) => {

    try {

      const canal =
        member.guild.channels.cache.get(
          WELCOME_CHANNEL_ID
        );

      if (!canal) {

        console.error(
          'CANAL DE BIENVENIDA NO ENCONTRADO.'
        );

        return;
      }

      const embed =
        new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('Bienvenido/a')
          .setDescription(
            `Hola <@${member.id}>, es un placer tenerte aqui.\n\n` +
            'Pasate por los canales y disfruta.'
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              size: 256
            })
          );

      await canal.send({
        content:
          `Hola <@${member.id}>!`,
        embeds: [embed]
      });

      await enviarLog(
        member.guild,

        crearLog({
          titulo:
            '📥 Usuario entró al servidor',

          descripcion:
            'Un usuario acaba de entrar al servidor.',

          color:
            '#57F287',

          usuario:
            member.user,

          campos: [
            {
              name: '📅 Cuenta creada',
              value:
                `<t:${Math.floor(
                  member.user.createdTimestamp / 1000
                )}:R>`
            }
          ]
        })
      );

    } catch (error) {

      console.error(
        'ERROR EN BIENVENIDA:',
        error
      );

    }

  }
);

// ==========================================
// REACTION ROLE - AGREGAR
// ==========================================

client.on(
  'messageReactionAdd',
  async (reaction, user) => {

    try {

      if (user.bot) return;

      if (reaction.partial) {
        await reaction.fetch();
      }

      const messageId =
        reaction.message.id;

      const emojiKey =
        reaction.emoji.id
          ? 'custom:' + reaction.emoji.id
          : 'unicode:' + reaction.emoji.name;

      const config =
        reactionRoles[
          messageId + ':' + emojiKey
        ];

      if (!config) return;

      const guild =
        reaction.message.guild;

      if (!guild) return;

      const member =
        await guild.members.fetch(
          user.id
        );

      const role =
        guild.roles.cache.get(
          config.roleId
        );

      if (!role) return;

      const botMember =
        guild.members.me;

      if (!botMember) return;

      if (
        role.position >=
        botMember.roles.highest.position
      ) {

        console.error(
          'EL BOT NO PUEDE DAR EL ROL: ' +
          role.name
        );

        return;
      }

      await member.roles.add(role);

      console.log(
        'ROL ENTREGADO: ' +
        role.name +
        ' -> ' +
        user.tag
      );

      await enviarLog(
        guild,

        crearLog({
          titulo:
            '➕ Rol agregado',

          descripcion:
            'Un usuario obtuvo un rol mediante reacción.',

          color:
            '#57F287',

          usuario:
            user,

          canal:
            reaction.message.channel,

          campos: [
            {
              name: '🎭 Rol',
              value:
                `<@&${role.id}>\n\`${role.name}\``
            },

            {
              name: '😀 Reacción',
              value:
                reaction.emoji.toString()
            },

            {
              name: '📋 Mensaje',
              value:
                `[Ver mensaje](${reaction.message.url})`
            }
          ]
        })
      );

    } catch (error) {

      console.error(
        'ERROR AL DAR ROL:',
        error
      );

    }

  }
);

// ==========================================
// REACTION ROLE - QUITAR
// ==========================================

client.on(
  'messageReactionRemove',
  async (reaction, user) => {

    try {

      if (user.bot) return;

      if (reaction.partial) {
        await reaction.fetch();
      }

      const messageId =
        reaction.message.id;

      const emojiKey =
        reaction.emoji.id
          ? 'custom:' + reaction.emoji.id
          : 'unicode:' + reaction.emoji.name;

      const config =
        reactionRoles[
          messageId + ':' + emojiKey
        ];

      if (!config) return;

      const guild =
        reaction.message.guild;

      if (!guild) return;

      const member =
        await guild.members.fetch(
          user.id
        );

      const role =
        guild.roles.cache.get(
          config.roleId
        );

      if (!role) return;

      await member.roles.remove(role);

      console.log(
        'ROL QUITADO: ' +
        role.name +
        ' -> ' +
        user.tag
      );

      await enviarLog(
        guild,

        crearLog({
          titulo:
            '➖ Rol quitado',

          descripcion:
            'Un usuario perdió un rol mediante reacción.',

          color:
            '#ED4245',

          usuario:
            user,

          canal:
            reaction.message.channel,

          campos: [
            {
              name: '🎭 Rol',
              value:
                `<@&${role.id}>\n\`${role.name}\``
            },

            {
              name: '😀 Reacción',
              value:
                reaction.emoji.toString()
            }
          ]
        })
      );

    } catch (error) {

      console.error(
        'ERROR AL QUITAR ROL:',
        error
      );

    }

  }
);

// ==========================================
// ANTI-SPAM
// ==========================================

const spamMap = new Map();
const repeatedMap = new Map();
const linkMap = new Map();

const SPAM_LIMIT = 6;
const SPAM_TIME = 5000;

const REPEAT_LIMIT = 4;
const REPEAT_TIME = 10000;

const LINK_LIMIT = 4;
const LINK_TIME = 8000;

function obtenerLinks(texto) {

  const regex =
    /https?:\/\/[^\s]+|www\.[^\s]+/gi;

  return texto.match(regex) || [];

}

// ==========================================
// SILENCIAR
// ==========================================

async function silenciarUsuario(
  member,
  motivo,
  mensaje,
  tipo
) {

  try {

    if (!member) return;

    if (!member.moderatable) {

      console.log(
        'NO PUDE SILENCIAR A ' +
        member.user.tag
      );

      return;
    }

    await member.timeout(
      10 * 60 * 1000,
      motivo
    );

    const titulo =
      tipo === 'links'
        ? '🔗 Muchos links detectados'
        : tipo === 'repetidos'
          ? '📢 Mensajes repetidos'
          : '🚫 Spam detectado';

    await enviarLog(

      member.guild,

      crearLog({

        titulo:

          titulo,

        descripcion:
          `El sistema automático detectó una conducta considerada spam y aplicó un timeout de **10 minutos**.`,

        color:
          '#ED4245',

        usuario:
          member.user,

        canal:
          mensaje.channel,

        campos: [

          {
            name:
              '📌 Motivo',

            value:
              motivo
          },

          {
            name:
              '⚙️ Acción',

            value:
              'Timeout de 10 minutos'
          },

          {
            name:
              '💬 Mensaje',

            value:
              mensaje.content
                ? mensaje.content.slice(0, 1000)
                : 'Sin contenido'
          }

        ]

      })

    );

  } catch (error) {

    console.error(
      'ERROR AL SILENCIAR:',
      error
    );

  }

}

// ==========================================
// MENSAJES - ANTI SPAM
// ==========================================

client.on(
  'messageCreate',
  async (message) => {

    try {

      if (!message.guild) return;

      if (message.author.bot) return;

      const member =
        message.member;

      if (!member) return;

      const ahora =
        Date.now();

      // ====================================
      // SPAM
      // ====================================

      const userId =
        message.author.id;

      const mensajes =
        spamMap.get(userId) || [];

      const recientes =
        mensajes.filter(
          time =>
            ahora - time <
            SPAM_TIME
        );

      recientes.push(ahora);

      spamMap.set(
        userId,
        recientes
      );

      if (
        recientes.length >=
        SPAM_LIMIT
      ) {

        await message.delete()
          .catch(() => {});

        spamMap.delete(
          userId
        );

        await silenciarUsuario(
          member,
          'Envío excesivo de mensajes',
          message,
          'spam'
        );

        return;
      }

      // ====================================
      // REPETIDOS
      // ====================================

      const contenido =
        message.content
          .trim()
          .toLowerCase();

      if (contenido.length > 0) {

        const datos =
          repeatedMap.get(userId) || {
            content: '',
            count: 0,
            time: ahora
          };

        if (
          datos.content === contenido &&
          ahora - datos.time <
          REPEAT_TIME
        ) {

          datos.count++;

        } else {

          datos.content =
            contenido;

          datos.count =
            1;

          datos.time =
            ahora;

        }

        repeatedMap.set(
          userId,
          datos
        );

        if (
          datos.count >=
          REPEAT_LIMIT
        ) {

          await message.delete()
            .catch(() => {});

          repeatedMap.delete(
            userId
          );

          await silenciarUsuario(
            member,
            'Envío repetido del mismo mensaje',
            message,
            'repetidos'
          );

          return;
        }
      }

      // ====================================
      // LINKS
      // ====================================

      const links =
        obtenerLinks(
          message.content
        );

      if (links.length > 0) {

        const datosLinks =
          linkMap.get(userId) || [];

        const recientesLinks =
          datosLinks.filter(
            time =>
              ahora - time <
              LINK_TIME
          );

        for (
          let i = 0;
          i < links.length;
          i++
        ) {

          recientesLinks.push(
            ahora
          );

        }

        linkMap.set(
          userId,
          recientesLinks
        );

        if (
          recientesLinks.length >=
          LINK_LIMIT
        ) {

          await message.delete()
            .catch(() => {});

          linkMap.delete(
            userId
          );

          await silenciarUsuario(
            member,
            'Envío excesivo de enlaces',
            message,
            'links'
          );

          return;
        }
      }

    } catch (error) {

      console.error(
        'ERROR EN ANTI-SPAM:',
        error
      );

    }

  }
);

// ==========================================
// MENSAJE ELIMINADO
// ==========================================

client.on(
  'messageDelete',
  async (message) => {

    try {

      if (!message.guild) return;

      if (message.author?.bot) return;

      const embed =
        crearLog({

          titulo:
            '🗑️ Mensaje eliminado',

          descripcion:
            'Se eliminó un mensaje del servidor.',

          color:
            '#ED4245',

          usuario:
            message.author,

          canal:
            message.channel,

          campos: [

            {
              name:
                '💬 Contenido',

              value:
                message.content
                  ? message.content.slice(0, 1000)
                  : 'Sin contenido disponible.'
            },

            {
              name:
                '🆔 ID del mensaje',

              value:
                `\`${message.id}\``
            }

          ]

        });

      await enviarLog(
        message.guild,
        embed
      );

    } catch (error) {

      console.error(
        'ERROR EN MESSAGE DELETE:',
        error
      );

    }

  }
);

// ==========================================
// MENSAJE EDITADO
// ==========================================

client.on(
  'messageUpdate',
  async (oldMessage, newMessage) => {

    try {

      if (!newMessage.guild) return;

      if (newMessage.author?.bot) return;

      const anterior =
        oldMessage.content || '';

      const nuevo =
        newMessage.content || '';

      if (anterior === nuevo) return;

      const embed =
        crearLog({

          titulo:
            '✏️ Mensaje editado',

          descripcion:
            'Un mensaje fue editado.',

          color:
            '#FEE75C',

          usuario:
            newMessage.author,

          canal:
            newMessage.channel,

          campos: [

            {
              name:
                '📝 Antes',

              value:
                anterior
                  ? anterior.slice(0, 1000)
                  : 'Sin contenido'
            },

            {
              name:
                '📝 Después',

              value:
                nuevo
                  ? nuevo.slice(0, 1000)
                  : 'Sin contenido'
            },

            {
              name:
                '🔗 Mensaje',

              value:
                `[Ver mensaje](${newMessage.url})`
            }

          ]

        });

      await enviarLog(
        newMessage.guild,
        embed
      );

    } catch (error) {

      console.error(
        'ERROR EN MESSAGE UPDATE:',
        error
      );

    }

  }
);

// ==========================================
// ROLES AGREGADOS / QUITADOS
// ==========================================

client.on(
  'guildMemberUpdate',
  async (oldMember, newMember) => {

    try {

      const rolesAgregados =
        newMember.roles.cache.filter(
          role =>
            !oldMember.roles.cache.has(
              role.id
            )
        );

      const rolesQuitados =
        oldMember.roles.cache.filter(
          role =>
            !newMember.roles.cache.has(
              role.id
            )
        );

      // ====================================
      // AGREGADOS
      // ====================================

      for (
        const [, role] of rolesAgregados
      ) {

        if (
          role.id ===
          newMember.guild.id
        ) continue;

        let moderador = null;

        try {

          const audit =
            await newMember.guild.fetchAuditLogs({
              type:
                AuditLogEvent.MemberRoleUpdate,
              limit: 5
            });

          const entrada =
            audit.entries.find(
              entry =>
                entry.target?.id ===
                newMember.id &&
                Date.now() -
                  entry.createdTimestamp <
                10000
            );

          if (entrada) {
            moderador =
              entrada.executor;
          }

        } catch {}

        await enviarLog(

          newMember.guild,

          crearLog({

            titulo:
              '➕ Rol agregado',

            descripcion:
              'Se agregó un rol a un usuario.',

            color:
              '#57F287',

            usuario:
              newMember.user,

            moderador:
              moderador,

            campos: [

              {
                name:
                  '🎭 Rol',

                value:
                  `<@&${role.id}>\n\`${role.name}\``
              }

            ]

          })

        );

      }

      // ====================================
      // QUITADOS
      // ====================================

      for (
        const [, role] of rolesQuitados
      ) {

        if (
          role.id ===
          newMember.guild.id
        ) continue;

        let moderador = null;

        try {

          const audit =
            await newMember.guild.fetchAuditLogs({
              type:
                AuditLogEvent.MemberRoleUpdate,
              limit: 5
            });

          const entrada =
            audit.entries.find(
              entry =>
                entry.target?.id ===
                newMember.id &&
                Date.now() -
                  entry.createdTimestamp <
                10000
            );

          if (entrada) {
            moderador =
              entrada.executor;
          }

        } catch {}

        await enviarLog(

          newMember.guild,

          crearLog({

            titulo:
              '➖ Rol quitado',

            descripcion:
              'Se quitó un rol a un usuario.',

            color:
              '#ED4245',

            usuario:
              newMember.user,

            moderador:
              moderador,

            campos: [

              {
                name:
                  '🎭 Rol',

                value:
                  `<@&${role.id}>\n\`${role.name}\``
              }

            ]

          })

        );

      }

    } catch (error) {

      console.error(
        'ERROR EN LOGS DE ROLES:',
        error
      );

    }

  }
);

// ==========================================
// TIMEOUT MANUAL
// ==========================================

client.on(
  'guildMemberUpdate',
  async (oldMember, newMember) => {

    try {

      const oldTimeout =
        oldMember.communicationDisabledUntilTimestamp;

      const newTimeout =
        newMember.communicationDisabledUntilTimestamp;

      if (
        oldTimeout ===
        newTimeout
      ) return;

      if (!newTimeout) {

        await enviarLog(

          newMember.guild,

          crearLog({

            titulo:
              '🔓 Timeout retirado',

            descripcion:
              'Se retiró el timeout de un usuario.',

            color:
              '#57F287',

            usuario:
              newMember.user

          })

        );

        return;
      }

      let moderador = null;
      let razon = 'No especificada';

      try {

        const audit =
          await newMember.guild.fetchAuditLogs({
            type:
              AuditLogEvent.MemberUpdate,
            limit: 5
          });

        const entrada =
          audit.entries.find(
            entry =>
              entry.target?.id ===
              newMember.id &&
              Date.now() -
                entry.createdTimestamp <
              10000
          );

        if (entrada) {

          moderador =
            entrada.executor;

          razon =
            entrada.reason ||
            'No especificada';
        }

      } catch {}

      await enviarLog(

        newMember.guild,

        crearLog({

          titulo:
            '🔨 Usuario sancionado',

          descripcion:
            'Se aplicó un timeout a un usuario.',

          color:
            '#ED4245',

          usuario:
            newMember.user,

          moderador:
            moderador,

          campos: [

            {
              name:
                '⏱️ Duración',

              value:
                `<t:${Math.floor(
                  newTimeout / 1000
                )}:R>`
            },

            {
              name:
                '📌 Motivo',

              value:
                razon
            }

          ]

        })

      );

    } catch (error) {

      console.error(
        'ERROR EN LOG DE TIMEOUT:',
        error
      );

    }

  }
);

// ==========================================
// BAN
// ==========================================

client.on(
  'guildBanAdd',
  async (ban) => {

    try {

      let moderador = null;
      let razon = 'No especificada';

      try {

        const audit =
          await ban.guild.fetchAuditLogs({
            type:
              AuditLogEvent.MemberBanAdd,
            limit: 5
          });

        const entrada =
          audit.entries.find(
            entry =>
              entry.target?.id ===
              ban.user.id &&
              Date.now() -
                entry.createdTimestamp <
              10000
          );

        if (entrada) {

          moderador =
            entrada.executor;

          razon =
            entrada.reason ||
            'No especificada';
        }

      } catch {}

      await enviarLog(

        ban.guild,

        crearLog({

          titulo:
            '🔨 Usuario baneado',

          descripcion:
            'Un usuario fue baneado del servidor.',

          color:
            '#ED4245',

          usuario:
            ban.user,

          moderador:
            moderador,

          campos: [

            {
              name:
                '📌 Motivo',

              value:
                razon
            }

          ]

        })

      );

    } catch (error) {

      console.error(
        'ERROR EN LOG DE BAN:',
        error
      );

    }

  }
);

// ==========================================
// INTERACCIONES
// ==========================================

client.on(
  'interactionCreate',
  async (interaction) => {

    try {

      // ====================================
      // SLASH COMMANDS
      // ====================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ==================================
        // /SETLOGS
        // ==================================

        if (
          interaction.commandName ===
          'setlogs'
        ) {

          if (
            !interaction.member.permissions.has(
              PermissionsBitField.Flags.ManageGuild
            )
          ) {

            await interaction.reply({
              content:
                '❌ Necesitas el permiso **Administrar servidor**.',
              ephemeral: true
            });

            return;
          }

          const canal =
            interaction.options.getChannel(
              'canal'
            );

          if (
            !canal ||
            canal.type !==
            ChannelType.GuildText
          ) {

            await interaction.reply({
              content:
                '❌ Debes seleccionar un canal de texto.',
              ephemeral: true
            });

            return;
          }

          logsConfig[
            interaction.guild.id
          ] =
            canal.id;

          guardarLogs();

          await interaction.reply({

            content:
              `✅ Canal de logs configurado correctamente.\n\n📋 Los logs se enviarán en ${canal}.`,

            ephemeral:
              true

          });

          await enviarLog(

            interaction.guild,

            crearLog({

              titulo:
                '⚙️ Sistema de logs configurado',

              descripcion:
                'Se configuró el canal donde se enviarán los registros.',

              color:
                '#5865F2',

              moderador:
                interaction.user,

              campos: [

                {
                  name:
                    '📋 Canal',

                  value:
                    `${canal}`
                }

              ]

            })

          );

          return;
        }

        // ==================================
        // /ADDREACTION
        // ==================================

        if (
          interaction.commandName ===
          'addreaction'
        ) {

          const mensajeId =
            interaction.options.getString(
              'mensaje'
            );

          const emojiInput =
            interaction.options.getString(
              'emoji'
            );

          const rol =
            interaction.options.getRole(
              'rol'
            );

          const canal =
            interaction.channel;

          if (!canal) {

            await interaction.reply({
              content:
                '❌ No se pudo encontrar el canal.',
              ephemeral: true
            });

            return;
          }

          let mensaje;

          try {

            mensaje =
              await canal.messages.fetch(
                mensajeId
              );

          } catch {

            await interaction.reply({
              content:
                '❌ No encontré ese mensaje en este canal.',
              ephemeral: true
            });

            return;
          }

          const customEmoji =
            emojiInput.match(
              /^<a?:([a-zA-Z0-9_]+):(\d+)>$/
            );

          let reactionEmoji;
          let emojiKey;
          let emojiMostrar;

          if (customEmoji) {

            reactionEmoji =
              customEmoji[2];

            emojiKey =
              'custom:' +
              customEmoji[2];

            emojiMostrar =
              emojiInput;

          } else {

            reactionEmoji =
              emojiInput;

            emojiKey =
              'unicode:' +
              emojiInput;

            emojiMostrar =
              emojiInput;
          }

          try {

            await mensaje.react(
              reactionEmoji
            );

          } catch {

            await interaction.reply({
              content:
                '❌ No pude agregar esa reacción.',
              ephemeral: true
            });

            return;
          }

          reactionRoles[
            mensajeId +
            ':' +
            emojiKey
          ] = {

            roleId:
              rol.id,

            guildId:
              interaction.guild.id,

            channelId:
              canal.id,

            messageId:
              mensajeId,

            emoji:
              emojiMostrar

          };

          guardarReactionRoles();

          await interaction.reply({

            content:
              `✅ **Reacción configurada correctamente.**\n\n👤 **Rol:** <@&${rol.id}>\n😀 **Emoji:** ${emojiMostrar}\n💬 **Mensaje:** ${mensaje.url}`,

            ephemeral:
              true

          });

          return;
        }

        // ==================================
        // /TICKETS
        // ==================================

        if (
          interaction.commandName ===
          'tickets'
        ) {

          const embed =
            new EmbedBuilder()
              .setColor('#2b2d31')
              .setTitle('TICKETS')
              .setDescription(

                '**🛒 Comprar**\n' +
                'Abre un ticket privado para realizar tu compra. Nuestro equipo te ayudará durante todo el proceso.\n\n' +

                '**🛠️ Dudas / Soporte**\n' +
                '¿Tienes alguna duda, problema o necesitas ayuda? Abre un ticket y estaremos encantados de ayudarte.\n\n' +

                '**🤝 Alianzas**\n' +
                '¿Tienes una propuesta de alianza o colaboración? Cuéntanos todos los detalles mediante un ticket.\n\n' +

                '> ⚠️ Recuerda que solo puedes tener __**un ticket abierto a la vez**__.'

              );

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                'ticket_menu'
              )
              .setPlaceholder(
                'Selecciona una opcion'
              )
              .addOptions([

                {
                  label:
                    'Comprar',

                  value:
                    'Comprar',

                  emoji:
                    '🛒'
                },

                {
                  label:
                    'Soporte',

                  value:
                    'Soporte',

                  emoji:
                    '🛠️'
                },

                {
                  label:
                    'Alianzas',

                  value:
                    'Alianza',

                  emoji:
                    '🤝'
                }

              ]);

          const row =
            new ActionRowBuilder()
              .addComponents(
                menu
              );

          await interaction.channel.send({

            embeds:
              [embed],

            components:
              [row]

          });

          await interaction.reply({

            content:
              '✅ Panel de tickets enviado.',

            ephemeral:
              true

          });

          return;
        }
      }

      // ====================================
      // BOTONES
      // ====================================

      if (
        interaction.isButton()
      ) {

        // ==================================
        // CERRAR TICKET
        // ==================================

        if (
          interaction.customId ===
          'cerrar_ticket'
        ) {

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                'confirmar_cierre'
              )
              .setLabel(
                'Si, cerrar'
              )
              .setEmoji(
                '✅'
              )
              .setStyle(
                ButtonStyle.Success
              );

          const cancelar =
            new ButtonBuilder()
              .setCustomId(
                'cancelar_cierre'
              )
              .setLabel(
                'No, cancelar'
              )
              .setEmoji(
                '❌'
              )
              .setStyle(
                ButtonStyle.Danger
              );

          const rowConfirmacion =
            new ActionRowBuilder()
              .addComponents(
                confirmar,
                cancelar
              );

          await interaction.reply({

            content:
              '⚠️ ¿Estas seguro de que quieres cerrar este ticket?',

            components:
              [rowConfirmacion],

            ephemeral:
              true

          });

          return;
        }

        // ==================================
        // CANCELAR
        // ==================================

        if (
          interaction.customId ===
          'cancelar_cierre'
        ) {

          await interaction.update({

            content:
              '❌ Cierre cancelado.',

            components:
              []

          });

          return;
        }

        // ==================================
        // CONFIRMAR CIERRE
        // ==================================

        if (
          interaction.customId ===
          'confirmar_cierre'
        ) {

          const canal =
            interaction.channel;

          const guild =
            interaction.guild;

          const nombreCanal =
            canal?.name || 'Desconocido';

          await interaction.update({

            content:
              '🔒 Cerrando ticket...',

            components:
              []

          });

          if (guild) {

            await enviarLog(

              guild,

              crearLog({

                titulo:
                  '🎫 Ticket cerrado',

                descripcion:
                  'Un ticket fue cerrado.',

                color:
                  '#ED4245',

                moderador:
                  interaction.user,

                campos: [

                  {
                    name:
                      '📋 Canal',

                    value:
                      `\`${nombreCanal}\``
                  }

                ]

              })

            );

          }

          setTimeout(
            async () => {

              await canal
                ?.delete()
                .catch(() => {});

            },
            2000
          );

          return;
        }
      }

      // ====================================
      // CREAR TICKET
      // ====================================

      if (
        interaction.isStringSelectMenu()
      ) {

        if (
          interaction.customId !==
          'ticket_menu'
        ) return;

        const tipo =
          interaction.values[0];

        const guild =
          interaction.guild;

        const user =
          interaction.user;

        if (!guild) {

          await interaction.reply({

            content:
              'Esta accion solo puede utilizarse dentro de un servidor.',

            ephemeral:
              true

          });

          return;
        }

        const ticketExistente =
          guild.channels.cache.find(

            channel =>

              channel.type ===
              ChannelType.GuildText &&

              channel.parentId ===
              TICKET_CATEGORY_ID &&

              channel.topic &&

              channel.topic.startsWith(
                'TICKET_USER:' +
                user.id +
                ' |'
              )

          );

        if (ticketExistente) {

          await interaction.reply({

            content:
              `Ya tienes un ticket abierto: <#${ticketExistente.id}>`,

            ephemeral:
              true

          });

          return;
        }

        const categoria =
          guild.channels.cache.get(
            TICKET_CATEGORY_ID
          );

        if (!categoria) {

          await interaction.reply({

            content:
              'No se encontro la categoria de tickets.',

            ephemeral:
              true

          });

          return;
        }

        const username =
          user.username
            .toLowerCase()
            .replace(
              /[^a-z0-9-_]/g,
              ''
            )
            .slice(
              0,
              20
            );

        const channelName =
          tipo +
          '-' +
          username;

        const canal =
          await guild.channels.create({

            name:
              channelName,

            type:
              ChannelType.GuildText,

            parent:
              TICKET_CATEGORY_ID,

            topic:
              'TICKET_USER:' +
              user.id +
              ' | TIPO:' +
              tipo,

            permissionOverwrites: [

              {
                id:
                  guild.id,

                deny: [
                  PermissionsBitField.Flags.ViewChannel
                ]
              },

              {
                id:
                  user.id,

                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.EmbedLinks
                ]
              },

              {
                id:
                  client.user.id,

                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.ManageChannels
                ]
              }

            ]

          });

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(
              '#2b2d31'
            )
            .setTitle(
              'Ticket creado'
            )
            .setDescription(

              `Hola <@${user.id}>, gracias por contactar con nosotros.\n\n` +

              `**Tipo:** ${tipo}\n\n` +

              'Explica tu problema o solicitud y espera a que un miembro del equipo te atienda.'

            )
            .setTimestamp();

        const cerrarBoton =
          new ButtonBuilder()
            .setCustomId(
              'cerrar_ticket'
            )
            .setLabel(
              'Cerrar ticket'
            )
            .setEmoji(
              '🔒'
            )
            .setStyle(
              ButtonStyle.Danger
            );

        const rowCerrar =
          new ActionRowBuilder()
            .addComponents(
              cerrarBoton
            );

        await canal.send({

          content:
            `Bienvenido <@${user.id}>`,

          embeds:
            [ticketEmbed],

          components:
            [rowCerrar]

        });

        await interaction.reply({

          content:
            `Tu ticket fue creado correctamente: <#${canal.id}>`,

          ephemeral:
            true

        });

        await enviarLog(

          guild,

          crearLog({

            titulo:
              '🎫 Ticket creado',

            descripcion:
              'Se creó un nuevo ticket.',

            color:
              '#5865F2',

            usuario:
              user,

            campos: [

              {
                name:
                  '📋 Tipo',

                value:
                  tipo
              },

              {
                name:
                  '📍 Canal',

                value:
                  `${canal}`
              }

            ]

          })

        );

        return;
      }

    } catch (error) {

      console.error(
        'ERROR EN INTERACTIONCREATE:',
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({

          content:
            'Ocurrio un error al realizar esta accion.',

          ephemeral:
            true

        }).catch(() => {});

      }

    }

  }
);

// ==========================================
// ERROR DEL CLIENTE
// ==========================================

client.on(
  'error',
  error => {

    console.error(
      'ERROR DEL CLIENTE DE DISCORD:',
      error
    );

  }
);

// ==========================================
// LOGIN
// ==========================================

if (
  !process.env.DISCORD_TOKEN
) {

  console.error(
    'NO SE ENCONTRO DISCORD_TOKEN EN RAILWAY.'
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
