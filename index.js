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
  Partials
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
const GOODBYE_CHANNEL_ID = '1357832797448044684';

const REACTION_FILE = './reactionRoles.json';
const LOGS_FILE = './logsConfig.json';

// ==========================================
// REACTION ROLES
// ==========================================

let reactionRoles = {};

if (fs.existsSync(REACTION_FILE)) {
  try {

    reactionRoles = JSON.parse(
      fs.readFileSync(
        REACTION_FILE,
        'utf8'
      )
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
      JSON.stringify(
        reactionRoles,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      'ERROR AL GUARDAR REACTION ROLES:',
      error
    );

  }

}

// ==========================================
// LOGS
// ==========================================

let logsConfig = {};

if (fs.existsSync(LOGS_FILE)) {

  try {

    logsConfig = JSON.parse(
      fs.readFileSync(
        LOGS_FILE,
        'utf8'
      )
    );

    console.log(
      'CONFIGURACIÓN DE LOGS CARGADA.'
    );

  } catch (error) {

    console.error(
      'ERROR AL CARGAR logsConfig.json:',
      error
    );

    logsConfig = {};

  }

}

function guardarLogsConfig() {

  try {

    fs.writeFileSync(
      LOGS_FILE,
      JSON.stringify(
        logsConfig,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      'ERROR AL GUARDAR CONFIGURACIÓN DE LOGS:',
      error
    );

  }

}

// ==========================================
// SPAM
// ==========================================

const spamUsers = new Map();

const SPAM_LIMIT = 5;
const SPAM_TIME = 5000;
const MUTE_TIME = 60000;

// ==========================================
// MENSAJES ELIMINADOS POR EL BOT
// ==========================================

const mensajesEliminadosPorBot = new Set();

// ==========================================
// DETECTOR DE LINKS
// ==========================================

const LINK_REGEX =
  /https?:\/\/[^\s<]+/gi;

// ==========================================
// COMPROBAR SI ES UN GIF PERMITIDO
// ==========================================

function esGifPermitido(url) {

  try {

    const urlLimpia =
      url.toLowerCase();

    if (
      /\.gif(?:\?[^\s]*)?$/i.test(
        urlLimpia
      )
    ) {

      return true;

    }

    if (
      urlLimpia.includes(
        'tenor.com'
      )
    ) {

      return true;

    }

    if (
      urlLimpia.includes(
        'giphy.com'
      )
    ) {

      return true;

    }

    return false;

  } catch (error) {

    return false;

  }

}

// ==========================================
// COMPROBAR SI EL MENSAJE TIENE LINK
// ==========================================

function obtenerLinksNoPermitidos(contenido) {

  if (!contenido) return [];

  const links =
    contenido.match(
      LINK_REGEX
    );

  if (!links) return [];

  return links.filter(
    link =>
      !esGifPermitido(
        link
      )
  );

}

// ==========================================
// LOG DE SPAM
// ==========================================

async function enviarLogSpam(
  member,
  cantidad,
  duracion,
  canal
) {

  try {

    const guild =
      member.guild;

    const canalLogsId =
      logsConfig[guild.id];

    if (!canalLogsId) {

      console.log(
        'NO HAY CANAL DE LOGS CONFIGURADO PARA: ' +
        guild.name
      );

      return;

    }

    const canalLogs =
      guild.channels.cache.get(
        canalLogsId
      );

    if (!canalLogs) {

      console.error(
        'EL CANAL DE LOGS CONFIGURADO NO EXISTE.'
      );

      return;

    }

    const embed =
      new EmbedBuilder()

        .setColor('#ff0000')

        .setTitle(
          '🚨 Spam detectado'
        )

        .setDescription(
          'Un usuario fue silenciado automáticamente por enviar demasiados mensajes en poco tiempo.'
        )

        .addFields(

          {
            name: '👤 Usuario',

            value:
              '<@' +
              member.id +
              '> `' +
              member.user.tag +
              '`',

            inline: false
          },

          {
            name: '🆔 ID',

            value:
              '`' +
              member.id +
              '`',

            inline: true
          },

          {
            name: '📨 Mensajes',

            value:
              '`' +
              cantidad +
              '`',

            inline: true
          },

          {
            name: '⏱️ Silenciado',

            value:
              '`' +
              Math.floor(
                duracion / 1000
              ) +
              ' segundos`',

            inline: true
          },

          {
            name: '📍 Canal',

            value:
              canal
                ? '<#' + canal.id + '>'
                : 'No disponible',

            inline: true
          },

          {
            name: '📅 Fecha',

            value:
              '<t:' +
              Math.floor(
                Date.now() / 1000
              ) +
              ':F>',

            inline: false
          }

        )

        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        )

        .setFooter({
          text: 'Sistema de seguridad'
        })

        .setTimestamp();

    await canalLogs.send({
      embeds: [
        embed
      ]
    });

  } catch (error) {

    console.error(
      'ERROR AL ENVIAR LOG DE SPAM:',
      error
    );

  }

}

// ==========================================
// LOG DE LINK DUDOSO
// ==========================================

async function enviarLogLink(
  member,
  link,
  canal
) {

  try {

    const guild =
      member.guild;

    const canalLogsId =
      logsConfig[guild.id];

    if (!canalLogsId) {

      console.log(
        'NO HAY CANAL DE LOGS CONFIGURADO PARA: ' +
        guild.name
      );

      return;

    }

    const canalLogs =
      guild.channels.cache.get(
        canalLogsId
      );

    if (!canalLogs) {

      console.error(
        'EL CANAL DE LOGS CONFIGURADO NO EXISTE.'
      );

      return;

    }

    const embed =
      new EmbedBuilder()

        .setColor('#ff0000')

        .setTitle(
          '🚨 Link dudoso detectado'
        )

        .setDescription(
          'Un usuario envió un enlace no permitido. El mensaje fue eliminado automáticamente.'
        )

        .addFields(

          {
            name: '👤 Usuario',

            value:
              '<@' +
              member.id +
              '> `' +
              member.user.tag +
              '`',

            inline: false
          },

          {
            name: '🆔 ID',

            value:
              '`' +
              member.id +
              '`',

            inline: true
          },

          {
            name: '📍 Canal',

            value:
              canal
                ? '<#' + canal.id + '>'
                : 'No disponible',

            inline: true
          },

          {
            name: '🔗 Link eliminado',

            value:
              '```' +
              link.slice(
                0,
                1000
              ) +
              '```',

            inline: false
          },

          {
            name: '📅 Fecha',

            value:
              '<t:' +
              Math.floor(
                Date.now() / 1000
              ) +
              ':F>',

            inline: false
          }

        )

        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        )

        .setFooter({
          text: 'Sistema de seguridad'
        })

        .setTimestamp();

    await canalLogs.send({
      embeds: [
        embed
      ]
    });

  } catch (error) {

    console.error(
      'ERROR AL ENVIAR LOG DE LINK:',
      error
    );

  }

}

// ==========================================
// LOG MENSAJE ELIMINADO
// ==========================================

client.on(
  'messageDelete',
  async (message) => {

    try {

      if (
        mensajesEliminadosPorBot.has(
          message.id
        )
      ) {

        mensajesEliminadosPorBot.delete(
          message.id
        );

        return;

      }

      if (!message.guild) return;

      if (
        message.author &&
        message.author.bot
      ) {

        return;

      }

      const canalLogsId =
        logsConfig[
          message.guild.id
        ];

      if (!canalLogsId) return;

      const canalLogs =
        message.guild.channels.cache.get(
          canalLogsId
        );

      if (!canalLogs) return;

      const contenido =
        message.content &&
        message.content.trim()
          ? message.content.trim()
          : '*Sin contenido de texto*';

      const usuario =
        message.author;

      if (!usuario) return;

      const embed =
        new EmbedBuilder()

          .setColor('#ff0000')

          .setTitle(
            '🗑️ Mensaje eliminado'
          )

          .setDescription(
            'Un mensaje fue eliminado de un canal.'
          )

          .addFields(

            {
              name: '👤 Usuario',

              value:
                '<@' +
                usuario.id +
                '> `' +
                usuario.tag +
                '`',

              inline: false
            },

            {
              name: '🆔 ID',

              value:
                '`' +
                usuario.id +
                '`',

              inline: true
            },

            {
              name: '📍 Canal',

              value:
                '<#' +
                message.channel.id +
                '>',

              inline: true
            },

            {
              name: '💬 Mensaje',

              value:
                '```' +
                contenido.slice(
                  0,
                  1000
                ) +
                '```',

              inline: false
            },

            {
              name: '📅 Fecha',

              value:
                '<t:' +
                Math.floor(
                  Date.now() / 1000
                ) +
                ':F>',

              inline: false
            }

          )

          .setThumbnail(
            usuario.displayAvatarURL({
              size: 256
            })
          )

          .setFooter({
            text: 'Sistema de seguridad'
          })

          .setTimestamp();

      await canalLogs.send({
        embeds: [
          embed
        ]
      });

    } catch (error) {

      console.error(
        'ERROR AL ENVIAR LOG DE MENSAJE ELIMINADO:',
        error
      );

    }

  }
);

// ==========================================
// LOG MENSAJE EDITADO
// ==========================================

client.on(
  'messageUpdate',
  async (
    mensajeAnterior,
    mensajeNuevo
  ) => {

    try {

      if (!mensajeNuevo.guild) return;

      if (
        mensajeNuevo.author &&
        mensajeNuevo.author.bot
      ) {

        return;

      }

      if (
        mensajeAnterior.partial ||
        mensajeNuevo.partial
      ) {

        return;

      }

      if (
        mensajeAnterior.content ===
        mensajeNuevo.content
      ) {

        return;

      }

      const canalLogsId =
        logsConfig[
          mensajeNuevo.guild.id
        ];

      if (!canalLogsId) return;

      const canalLogs =
        mensajeNuevo.guild.channels.cache.get(
          canalLogsId
        );

      if (!canalLogs) return;

      const usuario =
        mensajeNuevo.author;

      if (!usuario) return;

      const anterior =
        mensajeAnterior.content &&
        mensajeAnterior.content.trim()
          ? mensajeAnterior.content.trim()
          : '*Sin contenido*';

      const nuevo =
        mensajeNuevo.content &&
        mensajeNuevo.content.trim()
          ? mensajeNuevo.content.trim()
          : '*Sin contenido*';

      const embed =
        new EmbedBuilder()

          .setColor('#ffaa00')

          .setTitle(
            '✏️ Mensaje editado'
          )

          .setDescription(
            'Un usuario editó un mensaje.'
          )

          .addFields(

            {
              name: '👤 Usuario',

              value:
                '<@' +
                usuario.id +
                '> `' +
                usuario.tag +
                '`',

              inline: false
            },

            {
              name: '🆔 ID',

              value:
                '`' +
                usuario.id +
                '`',

              inline: true
            },

            {
              name: '📍 Canal',

              value:
                '<#' +
                mensajeNuevo.channel.id +
                '>',

              inline: true
            },

            {
              name: '📝 Antes',

              value:
                '```' +
                anterior.slice(
                  0,
                  1000
                ) +
                '```',

              inline: false
            },

            {
              name: '✏️ Después',

              value:
                '```' +
                nuevo.slice(
                  0,
                  1000
                ) +
                '```',

              inline: false
            },

            {
              name: '📅 Fecha',

              value:
                '<t:' +
                Math.floor(
                  Date.now() / 1000
                ) +
                ':F>',

              inline: false
            }

          )

          .setThumbnail(
            usuario.displayAvatarURL({
              size: 256
            })
          )

          .setFooter({
            text: 'Sistema de seguridad'
          })

          .setTimestamp();

      await canalLogs.send({
        embeds: [
          embed
        ]
      });

    } catch (error) {

      console.error(
        'ERROR AL ENVIAR LOG DE MENSAJE EDITADO:',
        error
      );

    }

  }
);

// ==========================================
// DETECTOR DE SPAM + LINKS
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

      if (
        member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {

        return;

      }

      // ====================================
      // DETECTOR DE LINKS
      // ====================================

      const linksNoPermitidos =
        obtenerLinksNoPermitidos(
          message.content
        );

      if (
        linksNoPermitidos.length > 0
      ) {

        try {

          mensajesEliminadosPorBot.add(
            message.id
          );

          await message.delete();

          await enviarLogLink(
            member,
            linksNoPermitidos[0],
            message.channel
          );

          console.log(
            'LINK ELIMINADO | ' +
            member.user.tag +
            ' | CANAL: ' +
            message.channel.name
          );

        } catch (error) {

          mensajesEliminadosPorBot.delete(
            message.id
          );

          console.error(
            'ERROR AL ELIMINAR LINK:',
            error
          );

        }

        return;

      }

      // ====================================
      // DETECTOR DE SPAM
      // ====================================

      const ahora =
        Date.now();

      let datos =
        spamUsers.get(
          message.author.id
        );

      if (!datos) {

        datos = {

          mensajes: [],

          silenciado: false

        };

        spamUsers.set(
          message.author.id,
          datos
        );

      }

      datos.mensajes =
        datos.mensajes.filter(
          dato =>
            ahora -
            dato.timestamp <=
            SPAM_TIME
        );

      datos.mensajes.push({

        timestamp:
          ahora,

        message:
          message

      });

      if (
        datos.mensajes.length >=
          SPAM_LIMIT &&
        !datos.silenciado
      ) {

        datos.silenciado =
          true;

        const cantidad =
          datos.mensajes.length;

        const mensajesSpam =
          [
            ...datos.mensajes
          ];

        datos.mensajes =
          [];

        try {

          if (
            member.moderatable
          ) {

            await member.timeout(

              MUTE_TIME,

              'Spam detectado automáticamente'

            );

            for (
              const dato
              of mensajesSpam
            ) {

              try {

                if (
                  dato.message &&
                  !dato.message.deleted
                ) {

                  mensajesEliminadosPorBot.add(
                    dato.message.id
                  );

                  await dato.message.delete();

                }

              } catch (error) {

                mensajesEliminadosPorBot.delete(
                  dato.message?.id
                );

                console.log(
                  'NO SE PUDO ELIMINAR UN MENSAJE DE SPAM.'
                );

              }

            }

            await enviarLogSpam(
              member,
              cantidad,
              MUTE_TIME,
              message.channel
            );

            console.log(

              'SPAM DETECTADO | ' +

              member.user.tag +

              ' | ' +

              cantidad +

              ' MENSAJES ELIMINADOS | ' +

              'SILENCIADO 60 SEGUNDOS'

            );

            setTimeout(
              () => {

                const usuario =
                  spamUsers.get(
                    member.id
                  );

                if (usuario) {

                  usuario.silenciado =
                    false;

                  usuario.mensajes =
                    [];

                }

              },
              MUTE_TIME
            );

          } else {

            console.log(

              'NO PUDE SILENCIAR A ' +

              member.user.tag +

              ' POR JERARQUÍA DE ROLES.'

            );

            datos.silenciado =
              false;

          }

        } catch (error) {

          console.error(
            'ERROR AL SILENCIAR USUARIO:',
            error
          );

          datos.silenciado =
            false;

        }

      }

    } catch (error) {

      console.error(
        'ERROR EN DETECTOR DE SPAM/LINKS:',
        error
      );

    }

  }
);

// ==========================================
// LIMPIEZA DE IDS
// ==========================================

setInterval(
  () => {

    if (
      mensajesEliminadosPorBot.size >
      1000
    ) {

      mensajesEliminadosPorBot.clear();

    }

  },
  60000
);

// ==========================================
// BOT ENCENDIDO
// ==========================================

client.once(
  'ready',
  () => {

    console.log(
      'BOT ENCENDIDO COMO ' +
      client.user.tag
    );

  }
);

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
          'CANAL DE BIENVENIDA NO ENCONTRADO: ' +
          WELCOME_CHANNEL_ID
        );

        return;

      }

      const embed =
        new EmbedBuilder()

          .setColor(
            '#2b2d31'
          )

          .setTitle(
            'Bienvenido/a'
          )

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
          );

      await canal.send({

        content:
          'Hola <@' +
          member.id +
          '>!',

        embeds: [
          embed
        ]

      });

    } catch (error) {

      console.error(
        'ERROR EN BIENVENIDA:',
        error
      );

    }

  }
);

// ==========================================
// DESPEDIDA
// ==========================================

client.on(
  'guildMemberRemove',
  async (member) => {

    try {

      const canal =
        member.guild.channels.cache.get(
          GOODBYE_CHANNEL_ID
        );

      if (!canal) {

        console.error(
          'CANAL DE DESPEDIDA NO ENCONTRADO: ' +
          GOODBYE_CHANNEL_ID
        );

        return;

      }

      const embed =
        new EmbedBuilder()

          .setColor(
            '#2b2d31'
          )

          .setTitle(
            'Hasta luego'
          )

          .setDescription(

            'Adios <@' +
            member.id +
            '>, esperamos volver a verte pronto.\n\n' +

            'Gracias por haber formado parte del servidor.'

          )

          .setThumbnail(
            member.user.displayAvatarURL({
              size: 256
            })
          );

      await canal.send({

        content:
          'Adios <@' +
          member.id +
          '>!',

        embeds: [
          embed
        ]

      });

    } catch (error) {

      console.error(
        'ERROR EN DESPEDIDA:',
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
          ? 'custom:' +
            reaction.emoji.id
          : 'unicode:' +
            reaction.emoji.name;

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

      if (!role) {

        console.error(
          'ROL NO ENCONTRADO: ' +
          config.roleId
        );

        return;

      }

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

      await member.roles.add(
        role
      );

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
          ? 'custom:' +
            reaction.emoji.id
          : 'unicode:' +
            reaction.emoji.name;

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

      await member.roles.remove(
        role
      );

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

// ==========================================
// INTERACCIONES
// ==========================================

client.on(
  'interactionCreate',
  async (interaction) => {

    try {

      // ======================================
      // COMANDOS SLASH
      // ======================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ====================================
        // /CLEAR
        // ====================================

        if (
          interaction.commandName ===
          'clear'
        ) {

          // Comprobar permiso del usuario

          if (
            !interaction.memberPermissions.has(
              PermissionsBitField.Flags.ManageMessages
            )
          ) {

            await interaction.reply({

              content:
                '❌ Necesitas el permiso **Gestionar mensajes** para utilizar este comando.',

              ephemeral:
                true

            });

            return;

          }

          // Comprobar permiso del bot

          const botMember =
            interaction.guild.members.me;

          if (
            !botMember ||
            !interaction.channel
              .permissionsFor(botMember)
              .has(
                PermissionsBitField.Flags.ManageMessages
              )
          ) {

            await interaction.reply({

              content:
                '❌ No tengo permiso para **Gestionar mensajes** en este canal.',

              ephemeral:
                true

            });

            return;

          }

          await interaction.reply({

            content:
              '🧹 Eliminando **todos los mensajes** de este canal...',

            ephemeral:
              true

          });

          try {

            let totalEliminados = 0;

            while (true) {

              const mensajes =
                await interaction.channel.messages.fetch({
                  limit: 100
                });

              if (
                mensajes.size === 0
              ) {

                break;

              }

              const mensajesRecientes = [];
              const mensajesAntiguos = [];

              const AHORA =
                Date.now();

              const LIMITE_14_DIAS =
                14 * 24 * 60 * 60 * 1000;

              for (
                const mensaje
                of mensajes.values()
              ) {

                mensajesEliminadosPorBot.add(
                  mensaje.id
                );

                if (
                  AHORA -
                  mensaje.createdTimestamp <
                  LIMITE_14_DIAS
                ) {

                  mensajesRecientes.push(
                    mensaje
                  );

                } else {

                  mensajesAntiguos.push(
                    mensaje
                  );

                }

              }

              // ==================================
              // MENSAJES RECIENTES
              // ==================================

              if (
                mensajesRecientes.length > 0
              ) {

                try {

                  const eliminados =
                    await interaction.channel.bulkDelete(
                      mensajesRecientes,
                      true
                    );

                  totalEliminados +=
                    eliminados.size;

                  // Si alguno no fue eliminado,
                  // quitarlo del Set para que no
                  // se quede bloqueando el proceso.

                  for (
                    const mensaje
                    of mensajesRecientes
                  ) {

                    if (
                      !eliminados.has(
                        mensaje.id
                      )
                    ) {

                      mensajesEliminadosPorBot.delete(
                        mensaje.id
                      );

                    }

                  }

                } catch (error) {

                  console.error(
                    'ERROR EN ELIMINADO MASIVO:',
                    error
                  );

                  // Si bulkDelete falla,
                  // intentamos eliminar individualmente.

                  for (
                    const mensaje
                    of mensajesRecientes
                  ) {

                    try {

                      await mensaje.delete();

                      totalEliminados++;

                    } catch (error) {

                      mensajesEliminadosPorBot.delete(
                        mensaje.id
                      );

                    }

                  }

                }

              }

              // ==================================
              // MENSAJES ANTIGUOS
              // ==================================

              for (
                const mensaje
                of mensajesAntiguos
              ) {

                try {

                  await mensaje.delete();

                  totalEliminados++;

                } catch (error) {

                  mensajesEliminadosPorBot.delete(
                    mensaje.id
                  );

                  console.log(
                    'NO SE PUDO ELIMINAR EL MENSAJE ANTIGUO: ' +
                    mensaje.id
                  );

                }

              }

              // ==================================
              // ESPERA PEQUEÑA
              // ==================================

              await new Promise(
                resolve =>
                  setTimeout(
                    resolve,
                    500
                  )
              );

            }

            // ==================================
            // LIMPIAR IDS
            // ==================================

            setTimeout(
              () => {

                for (
                  const id
                  of mensajesEliminadosPorBot
                ) {

                  mensajesEliminadosPorBot.delete(
                    id
                  );

                }

              },
              60000
            );

            await interaction.editReply({

              content:
                '✅ Se eliminaron **' +
                totalEliminados +
                ' mensajes** de este canal.'

            });

            console.log(

              '🧹 CLEAR EJECUTADO | ' +

              'USUARIO: ' +
              interaction.user.tag +

              ' | CANAL: ' +
              interaction.channel.name +

              ' | MENSAJES ELIMINADOS: ' +
              totalEliminados

            );

          } catch (error) {

            console.error(
              'ERROR AL EJECUTAR /CLEAR:',
              error
            );

            await interaction.editReply({

              content:
                '❌ Ocurrió un error mientras eliminaba los mensajes.'

            }).catch(
              () => {}
            );

          }

          return;

        }

        // ====================================
        // /SETLOGS
        // ====================================

        if (
          interaction.commandName ===
          'setlogs'
        ) {

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
                '❌ Selecciona un canal de texto.',

              ephemeral:
                true

            });

            return;

          }

          logsConfig[
            interaction.guild.id
          ] =
            canal.id;

          guardarLogsConfig();

          const embed =
            new EmbedBuilder()

              .setColor(
                '#00ff88'
              )

              .setTitle(
                '⚙️ Sistema de logs configurado'
              )

              .setDescription(
                'El canal de logs fue configurado correctamente.'
              )

              .addFields({

                name:
                  '📋 Canal',

                value:
                  '<#' +
                  canal.id +
                  '>'

              })

              .setTimestamp();

          await interaction.reply({

            embeds: [
              embed
            ],

            ephemeral:
              true

          });

          console.log(

            'LOGS CONFIGURADOS | ' +

            interaction.guild.name +

            ' | CANAL: ' +

            canal.id

          );

          return;

        }

        // ====================================
        // /ADDREACTION
        // ====================================

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

              ephemeral:
                true

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
                '❌ No encontré ese mensaje en este canal.\n\n' +
                'Asegúrate de usar correctamente el ID del mensaje.',

              ephemeral:
                true

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

              ephemeral:
                true

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

            ephemeral:
              true

          });

          console.log(

            'REACTION ROLE CONFIGURADO | ' +

            'MENSAJE: ' +
            mensajeId +

            ' | ROL: ' +
            rol.name +

            ' | EMOJI: ' +
            emojiMostrar

          );

          return;

        }

        // ====================================
        // /TICKETS
        // ====================================

        if (
          interaction.commandName ===
          'tickets'
        ) {

          const embed =
            new EmbedBuilder()

              .setColor(
                '#2b2d31'
              )

              .setTitle(
                'TICKETS'
              )

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

            embeds: [
              embed
            ],

            components: [
              row
            ]

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

      // ======================================
      // BOTONES
      // ======================================

      if (
        interaction.isButton()
      ) {

        // ====================================
        // CERRAR TICKET
        // ====================================

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
              [
                rowConfirmacion
              ],

            ephemeral:
              true

          });

          return;

        }

        // ====================================
        // CANCELAR
        // ====================================

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

        // ====================================
        // CONFIRMAR CIERRE
        // ====================================

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
                .catch(
                  () => {}
                );

            },
            2000
          );

          return;

        }

      }

      // ======================================
      // CREAR TICKET
      // ======================================

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

            ephemeral:
              true

          });

          return;

        }

        const ticketExistente =
          guild.channels.cache.find(
            (channel) =>

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

          console.error(

            'CATEGORIA NO ENCONTRADA: ' +
            TICKET_CATEGORY_ID

          );

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

                  PermissionsBitField.Flags.ManageChannels,

                  PermissionsBitField.Flags.ManageMessages

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

              'Hola <@' +
              user.id +
              '>, gracias por contactar con nosotros.\n\n' +

              '**Tipo:** ' +
              tipo +
              '\n\n' +

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
            'Bienvenido <@' +
            user.id +
            '>',

          embeds: [
            ticketEmbed
          ],

          components: [
            rowCerrar
          ]

        });

        await interaction.reply({

          content:
            'Tu ticket fue creado correctamente: <#' +
            canal.id +
            '>',

          ephemeral:
            true

        });

        console.log(

          'TICKET CREADO: ' +
          canal.name +
          ' | USUARIO: ' +
          user.tag

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

        }).catch(
          () => {}
        );

      }

    }

  }
);

// ==========================================
// ERROR DEL CLIENTE
// ==========================================

client.on(
  'error',
  (error) => {

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
