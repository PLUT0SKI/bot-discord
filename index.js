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

// =====================================================
// CLIENTE
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],

  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TICKET_CATEGORY_ID = '1357832792699834548';
const WELCOME_CHANNEL_ID = '1357832795547893861';

const REACTION_FILE = './reactionRoles.json';
const LOGS_FILE = './logs.json';

// =====================================================
// ARCHIVOS
// =====================================================

let reactionRoles = {};
let logsConfig = {};

if (fs.existsSync(REACTION_FILE)) {
  try {
    reactionRoles = JSON.parse(
      fs.readFileSync(REACTION_FILE, 'utf8')
    );

    console.log('CONFIGURACIONES DE REACCIONES CARGADAS.');
  } catch (error) {
    console.error('ERROR AL CARGAR reactionRoles.json:', error);
    reactionRoles = {};
  }
}

if (fs.existsSync(LOGS_FILE)) {
  try {
    logsConfig = JSON.parse(
      fs.readFileSync(LOGS_FILE, 'utf8')
    );

    console.log('CONFIGURACIÓN DE LOGS CARGADA.');
  } catch (error) {
    console.error('ERROR AL CARGAR logs.json:', error);
    logsConfig = {};
  }
}

function guardarReactionRoles() {
  try {
    fs.writeFileSync(
      REACTION_FILE,
      JSON.stringify(reactionRoles, null, 2)
    );
  } catch (error) {
    console.error('ERROR AL GUARDAR REACTION ROLES:', error);
  }
}

function guardarLogs() {
  try {
    fs.writeFileSync(
      LOGS_FILE,
      JSON.stringify(logsConfig, null, 2)
    );
  } catch (error) {
    console.error('ERROR AL GUARDAR LOGS:', error);
  }
}

// =====================================================
// ANTI-SPAM
// =====================================================

const spamData = new Map();

const SPAM_MESSAGE_LIMIT = 6;
const SPAM_TIME = 7000;

const REPEATED_MESSAGE_LIMIT = 3;

const LINK_LIMIT = 3;
const LINK_TIME = 10000;

const TIMEOUT_DURATION = 60 * 1000;

// =====================================================
// OBTENER CANAL DE LOGS
// =====================================================

function obtenerCanalLogs(guild) {
  const channelId = logsConfig[guild.id];

  if (!channelId) return null;

  return guild.channels.cache.get(channelId) || null;
}

// =====================================================
// ENVIAR LOG
// =====================================================

async function enviarLog(guild, embed) {
  try {
    const canal = obtenerCanalLogs(guild);

    if (!canal) return;

    await canal.send({
      embeds: [embed]
    });

  } catch (error) {
    console.error('ERROR AL ENVIAR LOG:', error);
  }
}

// =====================================================
// INFORMACIÓN DEL USUARIO
// =====================================================

function informacionUsuario(user) {
  return (
    '**Usuario:** ' +
    user.tag +
    '\n' +
    '**ID:** `' +
    user.id +
    '`'
  );
}

// =====================================================
// BOT ENCENDIDO
// =====================================================

client.once('ready', () => {
  console.log(
    'BOT ENCENDIDO COMO ' + client.user.tag
  );

  console.log(
    'SERVIDORES: ' + client.guilds.cache.size
  );
});

// =====================================================
// BIENVENIDA
// =====================================================

client.on('guildMemberAdd', async (member) => {
  try {

    const canal =
      member.guild.channels.cache.get(
        WELCOME_CHANNEL_ID
      );

    if (!canal) {
      console.error(
        'CANAL DE BIENVENIDA NO ENCONTRADO: ' +
        WELCOME_CHANNEL_ID
      );
    } else {

      const embed =
        new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('Bienvenido/a')
          .setDescription(
            'Hola <@' +
            member.id +
            '>, es un placer tenerte aqui.\n\n' +
            'Pasate por los canales y disfruta.'
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              size: 256
            })
          )
          .setTimestamp();

      await canal.send({
        content:
          'Hola <@' +
          member.id +
          '>!',

        embeds: [embed]
      });
    }

    // LOG ENTRADA

    const logEmbed =
      new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('👤 Usuario entró')
        .setDescription(
          informacionUsuario(member.user)
        )
        .addFields(
          {
            name: 'Cuenta creada',
            value:
              '<t:' +
              Math.floor(
                member.user.createdTimestamp / 1000
              ) +
              ':F>'
          }
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        )
        .setTimestamp();

    await enviarLog(
      member.guild,
      logEmbed
    );

  } catch (error) {
    console.error(
      'ERROR EN BIENVENIDA:',
      error
    );
  }
});

// =====================================================
// USUARIO SALE
// =====================================================

client.on('guildMemberRemove', async (member) => {
  try {

    const embed =
      new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('👋 Usuario salió')
        .setDescription(
          informacionUsuario(member.user)
        )
        .setTimestamp();

    await enviarLog(
      member.guild,
      embed
    );

  } catch (error) {
    console.error(
      'ERROR AL REGISTRAR SALIDA:',
      error
    );
  }
});

// =====================================================
// MESSAGE CREATE
// =====================================================

client.on('messageCreate', async (message) => {

  try {

    if (!message.guild) return;
    if (message.author.bot) return;

    const member = message.member;

    if (!member) return;

    // =================================================
    // DETECTAR LINKS
    // =================================================

    const links =
      message.content.match(
        /https?:\/\/[^\s]+|www\.[^\s]+/gi
      ) || [];

    // =================================================
    // DATOS DEL USUARIO
    // =================================================

    let data =
      spamData.get(message.author.id);

    if (!data) {

      data = {
        messages: [],
        links: [],
        lastMessage: '',
        repeated: 0,
        punished: false
      };

      spamData.set(
        message.author.id,
        data
      );
    }

    const ahora = Date.now();

    // =================================================
    // LIMPIAR MENSAJES ANTIGUOS
    // =================================================

    data.messages =
      data.messages.filter(
        timestamp =>
          ahora - timestamp < SPAM_TIME
      );

    data.links =
      data.links.filter(
        timestamp =>
          ahora - timestamp < LINK_TIME
      );

    data.messages.push(ahora);

    // =================================================
    // MENSAJES REPETIDOS
    // =================================================

    if (
      message.content.length > 0 &&
      message.content === data.lastMessage
    ) {

      data.repeated++;

    } else {

      data.repeated = 1;
    }

    data.lastMessage =
      message.content;

    // =================================================
    // DETECTAR SPAM
    // =================================================

    const demasiadoSpam =
      data.messages.length >=
      SPAM_MESSAGE_LIMIT;

    // =================================================
    // DETECTAR MUCHOS LINKS
    // =================================================

    if (links.length > 0) {

      for (let i = 0; i < links.length; i++) {
        data.links.push(ahora);
      }
    }

    const demasiadosLinks =
      data.links.length >=
      LINK_LIMIT;

    // =================================================
    // DETECTAR REPETIDOS
    // =================================================

    const mensajesRepetidos =
      data.repeated >=
      REPEATED_MESSAGE_LIMIT;

    // =================================================
    // SANCIÓN
    // =================================================

    if (
      (demasiadoSpam ||
       demasiadosLinks ||
       mensajesRepetidos) &&
      !data.punished
    ) {

      data.punished = true;

      let motivo = 'Spam';

      if (demasiadosLinks) {
        motivo = 'Envío excesivo de enlaces';
      } else if (mensajesRepetidos) {
        motivo = 'Mensajes repetidos';
      }

      // ===============================================
      // BORRAR MENSAJE
      // ===============================================

      await message.delete()
        .catch(() => {});

      // ===============================================
      // TIMEOUT
      // ===============================================

      if (
        member.moderatable &&
        member.permissions.has(
          PermissionsBitField.Flags.SendMessages
        ) ||
        member.moderatable
      ) {

        await member.timeout(
          TIMEOUT_DURATION,
          motivo
        ).catch(error => {
          console.error(
            'NO SE PUDO APLICAR TIMEOUT:',
            error
          );
        });
      }

      // ===============================================
      // LOG
      // ===============================================

      const embed =
        new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🚫 Sanción automática')
          .setDescription(
            informacionUsuario(
              message.author
            )
          )
          .addFields(
            {
              name: 'Motivo',
              value: motivo
            },
            {
              name: 'Canal',
              value:
                '<#' +
                message.channel.id +
                '>'
            },
            {
              name: 'Duración',
              value: '1 minuto'
            },
            {
              name: 'Tipo',
              value: 'Sistema anti-spam'
            }
          )
          .setThumbnail(
            message.author.displayAvatarURL({
              size: 256
            })
          )
          .setTimestamp();

      await enviarLog(
        message.guild,
        embed
      );

      // ===============================================
      // AVISO
      // ===============================================

      const aviso =
        await message.channel.send({
          content:
            '🚫 <@' +
            message.author.id +
            '> fue silenciado automáticamente por **' +
            motivo +
            '**.'
        }).catch(() => null);

      if (aviso) {

        setTimeout(() => {
          aviso.delete().catch(() => {});
        }, 5000);
      }

      // Reiniciar datos

      data.messages = [];
      data.links = [];
      data.repeated = 0;

      setTimeout(() => {

        const current =
          spamData.get(
            message.author.id
          );

        if (current) {
          current.punished = false;
        }

      }, TIMEOUT_DURATION + 2000);
    }

  } catch (error) {

    console.error(
      'ERROR EN SISTEMA ANTI-SPAM:',
      error
    );
  }
});

// =====================================================
// MESSAGE DELETE
// =====================================================

client.on('messageDelete', async (message) => {

  try {

    if (!message.guild) return;
    if (!message.author) return;
    if (message.author.bot) return;

    const contenido =
      message.content
        ? message.content.slice(0, 1000)
        : 'Contenido no disponible';

    const embed =
      new EmbedBuilder()
        .setColor('#ff3333')
        .setTitle('🗑️ Mensaje eliminado')
        .setDescription(
          informacionUsuario(
            message.author
          )
        )
        .addFields(
          {
            name: 'Canal',
            value:
              '<#' +
              message.channel.id +
              '>'
          },
          {
            name: 'Contenido',
            value:
              '```' +
              contenido +
              '```'
          }
        )
        .setThumbnail(
          message.author.displayAvatarURL({
            size: 256
          })
        )
        .setTimestamp();

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
});

// =====================================================
// MESSAGE UPDATE
// =====================================================

client.on(
  'messageUpdate',
  async (oldMessage, newMessage) => {

    try {

      if (!newMessage.guild) return;

      if (!oldMessage.author) return;
      if (oldMessage.author.bot) return;

      const anterior =
        oldMessage.content || 'No disponible';

      const nuevo =
        newMessage.content || 'No disponible';

      if (anterior === nuevo) return;

      const embed =
        new EmbedBuilder()
          .setColor('#ffaa00')
          .setTitle('✏️ Mensaje editado')
          .setDescription(
            informacionUsuario(
              oldMessage.author
            )
          )
          .addFields(
            {
              name: 'Canal',
              value:
                '<#' +
                newMessage.channel.id +
                '>'
            },
            {
              name: 'Antes',
              value:
                '```' +
                anterior.slice(0, 900) +
                '```'
            },
            {
              name: 'Después',
              value:
                '```' +
                nuevo.slice(0, 900) +
                '```'
            }
          )
          .setTimestamp();

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

// =====================================================
// ROLES AGREGADOS / QUITADOS
// =====================================================

client.on(
  'guildMemberUpdate',
  async (oldMember, newMember) => {

    try {

      const rolesAntes =
        oldMember.roles.cache;

      const rolesDespues =
        newMember.roles.cache;

      const agregados =
        rolesDespues.filter(
          role =>
            !rolesAntes.has(role.id)
        );

      const quitados =
        rolesAntes.filter(
          role =>
            !rolesDespues.has(role.id)
        );

      // =================================================
      // ROLES AGREGADOS
      // =================================================

      for (const role of agregados.values()) {

        let moderador = 'No identificado';

        try {

          const logs =
            await newMember.guild.fetchAuditLogs({
              type: AuditLogEvent.MemberRoleUpdate,
              limit: 5
            });

          const entrada =
            logs.entries.find(
              entry =>
                entry.target &&
                entry.target.id === newMember.id &&
                Date.now() - entry.createdTimestamp < 5000
            );

          if (entrada) {

            moderador =
              '<@' +
              entrada.executor.id +
              '>';
          }

        } catch (error) {}

        const embed =
          new EmbedBuilder()
            .setColor('#00cc66')
            .setTitle('➕ Rol agregado')
            .setDescription(
              informacionUsuario(
                newMember.user
              )
            )
            .addFields(
              {
                name: 'Rol',
                value:
                  '<@&' +
                  role.id +
                  '>'
              },
              {
                name: 'Realizado por',
                value:
                  moderador
              }
            )
            .setTimestamp();

        await enviarLog(
          newMember.guild,
          embed
        );
      }

      // =================================================
      // ROLES QUITADOS
      // =================================================

      for (const role of quitados.values()) {

        let moderador = 'No identificado';

        try {

          const logs =
            await newMember.guild.fetchAuditLogs({
              type: AuditLogEvent.MemberRoleUpdate,
              limit: 5
            });

          const entrada =
            logs.entries.find(
              entry =>
                entry.target &&
                entry.target.id === newMember.id &&
                Date.now() - entry.createdTimestamp < 5000
            );

          if (entrada) {

            moderador =
              '<@' +
              entrada.executor.id +
              '>';
          }

        } catch (error) {}

        const embed =
          new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('➖ Rol quitado')
            .setDescription(
              informacionUsuario(
                newMember.user
              )
            )
            .addFields(
              {
                name: 'Rol',
                value:
                  '<@&' +
                  role.id +
                  '>'
              },
              {
                name: 'Realizado por',
                value:
                  moderador
              }
            )
            .setTimestamp();

        await enviarLog(
          newMember.guild,
          embed
        );
      }

    } catch (error) {

      console.error(
        'ERROR EN LOG DE ROLES:',
        error
      );
    }
  }
);

// =====================================================
// LOGS DE MODERACIÓN
// =====================================================

client.on(
  'guildAuditLogEntryCreate',
  async (entry, guild) => {

    try {

      if (
        !entry ||
        !guild
      ) return;

      const executor =
        entry.executor;

      if (!executor) return;

      let titulo = null;
      let color = '#5865F2';
      let motivo =
        entry.reason || 'Sin motivo especificado';

      switch (entry.action) {

        case AuditLogEvent.MemberBanAdd:

          titulo = '🔨 Usuario baneado';
          color = '#ff0000';

          break;

        case AuditLogEvent.MemberBanRemove:

          titulo = '🔓 Usuario desbaneado';
          color = '#00cc66';

          break;

        case AuditLogEvent.MemberKick:

          titulo = '👢 Usuario expulsado';
          color = '#ff6600';

          break;

        case AuditLogEvent.MemberUpdate:

          if (
            entry.changes &&
            entry.changes.some(
              change =>
                change.key === 'communication_disabled_until'
            )
          ) {

            titulo = '🔇 Timeout aplicado';
            color = '#ffaa00';
          }

          break;

        default:
          break;
      }

      if (!titulo) return;

      let usuarioTexto =
        'Usuario desconocido';

      if (entry.target) {

        usuarioTexto =
          '<@' +
          entry.target.id +
          '>\n`' +
          entry.target.id +
          '`';
      }

      const embed =
        new EmbedBuilder()
          .setColor(color)
          .setTitle(titulo)
          .addFields(
            {
              name: 'Usuario afectado',
              value:
                usuarioTexto
            },
            {
              name: 'Moderador',
              value:
                '<@' +
                executor.id +
                '>'
            },
            {
              name: 'Motivo',
              value:
                motivo
            }
          )
          .setTimestamp();

      await enviarLog(
        guild,
        embed
      );

    } catch (error) {

      console.error(
        'ERROR EN LOG DE MODERACIÓN:',
        error
      );
    }
  }
);

// =====================================================
// REACTION ROLE - AGREGAR
// =====================================================

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
          messageId +
          ':' +
          emojiKey
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

    } catch (error) {

      console.error(
        'ERROR AL DAR ROL:',
        error
      );
    }
  }
);

// =====================================================
// REACTION ROLE - QUITAR
// =====================================================

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
          messageId +
          ':' +
          emojiKey
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

    } catch (error) {

      console.error(
        'ERROR AL QUITAR ROL:',
        error
      );
    }
  }
);

// =====================================================
// INTERACCIONES
// =====================================================

client.on(
  'interactionCreate',
  async (interaction) => {

    try {

      // =================================================
      // COMANDOS SLASH
      // =================================================

      if (
        interaction.isChatInputCommand()
      ) {

        // =================================================
        // /SETLOGS
        // =================================================

        if (
          interaction.commandName ===
          'setlogs'
        ) {

          const canal =
            interaction.options.getChannel(
              'canal'
            );

          if (
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
          ] = canal.id;

          guardarLogs();

          const embed =
            new EmbedBuilder()
              .setColor('#00cc66')
              .setTitle('🛡️ Sistema de logs configurado')
              .setDescription(
                'Este será el canal donde se enviarán los registros del sistema.'
              )
              .addFields(
                {
                  name: 'Canal',
                  value:
                    '<#' +
                    canal.id +
                    '>'
                }
              )
              .setTimestamp();

          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });

          await canal.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#00cc66')
                .setTitle('🛡️ Logs activados')
                .setDescription(
                  'El sistema de logs ha sido configurado correctamente.'
                )
                .setTimestamp()
            ]
          });

          return;
        }

        // =================================================
        // /ADDREACTION
        // =================================================

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

          } catch (error) {

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

          } catch (error) {

            console.error(
              'ERROR AL AGREGAR EMOJI:',
              error
            );

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
              '✅ **Reacción configurada correctamente.**\n\n' +
              '👤 **Rol:** <@&' +
              rol.id +
              '>\n' +
              '😀 **Emoji:** ' +
              emojiMostrar +
              '\n' +
              '💬 **Mensaje:** ' +
              mensaje.url,

            ephemeral: true
          });

          return;
        }

        // =================================================
        // /TICKETS
        // =================================================

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
                  label: 'Comprar',
                  value: 'Comprar',
                  emoji: '🛒'
                },

                {
                  label: 'Soporte',
                  value: 'Soporte',
                  emoji: '🛠️'
                },

                {
                  label: 'Alianzas',
                  value: 'Alianza',
                  emoji: '🤝'
                }

              ]);

          const row =
            new ActionRowBuilder()
              .addComponents(
                menu
              );

          await interaction.channel.send({
            embeds: [embed],
            components: [row]
          });

          await interaction.reply({
            content:
              '✅ Panel de tickets enviado.',
            ephemeral: true
          });

          return;
        }
      }

      // =================================================
      // BOTONES
      // =================================================

      if (interaction.isButton()) {

        // =================================================
        // CERRAR TICKET
        // =================================================

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

        // =================================================
        // CANCELAR
        // =================================================

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

        // =================================================
        // CONFIRMAR
        // =================================================

        if (
          interaction.customId ===
          'confirmar_cierre'
        ) {

          await interaction.update({
            content:
              '🔒 Cerrando ticket...',
            components:
              []
          });

          setTimeout(
            async () => {

              await interaction.channel
                .delete()
                .catch(() => {});

            },
            2000
          );

          return;
        }
      }

      // =================================================
      // CREAR TICKET
      // =================================================

      if (
        interaction.isStringSelectMenu()
      ) {

        if (
          interaction.customId !==
          'ticket_menu'
        ) {
          return;
        }

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
            ephemeral: true
          });

          return;
        }

        // =================================================
        // TICKET EXISTENTE
        // =================================================

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
              'Ya tienes un ticket abierto: <#' +
              ticketExistente.id +
              '>',

            ephemeral:
              true
          });

          return;
        }

        // =================================================
        // CATEGORIA
        // =================================================

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

        // =================================================
        // NOMBRE
        // =================================================

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

        // =================================================
        // CREAR CANAL
        // =================================================

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

        // =================================================
        // EMBED
        // =================================================

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(
              '#2b2d31'
            )
            .setTitle(
              'Ticket creado'
            )
            .setDescription(
              'Hola <@' +
              user.id +
              '>, gracias por contactar con nosotros.\n\n' +

              '**Tipo:** ' +
              tipo +
              '\n\n' +

              'Explica tu problema o solicitud y espera a que un miembro del equipo te atienda.'
            )
            .setTimestamp();

        // =================================================
        // BOTÓN CERRAR
        // =================================================

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

        // =================================================
        // MENSAJE
        // =================================================

        await canal.send({

          content:
            'Bienvenido <@' +
            user.id +
            '>',

          embeds:
            [ticketEmbed],

          components:
            [rowCerrar]
        });

        await interaction.reply({

          content:
            'Tu ticket fue creado correctamente: <#' +
            canal.id +
            '>',

          ephemeral:
            true
        });

        // =================================================
        // LOG TICKET
        // =================================================

        const logEmbed =
          new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Ticket creado')
            .setDescription(
              informacionUsuario(user)
            )
            .addFields(
              {
                name: 'Tipo',
                value: tipo
              },
              {
                name: 'Canal',
                value:
                  '<#' +
                  canal.id +
                  '>'
              }
            )
            .setTimestamp();

        await enviarLog(
          guild,
          logEmbed
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

// =====================================================
// ERROR CLIENTE
// =====================================================

client.on(
  'error',
  error => {

    console.error(
      'ERROR DEL CLIENTE DE DISCORD:',
      error
    );

  }
);

// =====================================================
// LOGIN
// =====================================================

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
