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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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
const WELCOME_CHANNEL_ID = '1543780167900471316';
const GOODBYE_CHANNEL_ID = '1543780307688497223';

const REACTION_FILE = './reactionRoles.json';
const LOGS_FILE = './logsConfig.json';

// ==========================================
// PRECIOS
// ==========================================

const PRECIO_ROBUX = 200;
const PRECIO_TRANSFERENCIA = 100;
const PRECIO_DEPOSITO = 100;

const MULTIPLICADOR_CAMISA = 1;
const MULTIPLICADOR_PANTALON = 1;
const MULTIPLICADOR_CONJUNTO = 1.7;

// ==========================================
// REACTION ROLES
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
// MENSAJES ELIMINADOS POR /CLEAR
// ==========================================

const mensajesEliminadosPorClear = new Set();

// ==========================================
// DETECTOR DE LINKS
// ==========================================

const LINK_REGEX =
  /https?:\/\/[^\s<]+/gi;

// ==========================================
// EMBED BUILDER
// ==========================================

const embedBuilders = new Map();

function obtenerEmbedKey(interaction) {

  return (
    interaction.guild.id +
    ':' +
    interaction.user.id
  );

}

function obtenerDatosEmbed(interaction) {

  const key =
    obtenerEmbedKey(interaction);

  if (!embedBuilders.has(key)) {

    embedBuilders.set(
      key,
      {
        title: '',
        description: '',
        color: '#2b2d31',
        footer: '',
        thumbnail: '',
        image: '',
        fields: []
      }
    );

  }

  return embedBuilders.get(key);

}

function crearEmbedDesdeDatos(datos) {

  const embed =
    new EmbedBuilder()
      .setColor(
        datos.color || '#2b2d31'
      );

  if (datos.title) {

    embed.setTitle(
      datos.title
    );

  }

  if (datos.description) {

    embed.setDescription(
      datos.description
    );

  }

  if (datos.footer) {

    embed.setFooter({
      text:
        datos.footer
    });

  }

  if (datos.thumbnail) {

    embed.setThumbnail(
      datos.thumbnail
    );

  }

  if (datos.image) {

    embed.setImage(
      datos.image
    );

  }

  if (
    datos.fields &&
    datos.fields.length > 0
  ) {

    embed.addFields(
      datos.fields
    );

  }

  return embed;

}

function crearMenuEmbed() {

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        'embed_builder_menu'
      )
      .setPlaceholder(
        'Selecciona qué quieres configurar'
      )
      .addOptions([

        {
          label:
            'Título',
          description:
            'Configurar el título del embed',
          value:
            'embed_title',
          emoji:
            '📝'
        },

        {
          label:
            'Descripción',
          description:
            'Configurar la descripción',
          value:
            'embed_description',
          emoji:
            '📄'
        },

        {
          label:
            'Color',
          description:
            'Cambiar el color del embed',
          value:
            'embed_color',
          emoji:
            '🎨'
        },

        {
          label:
            'Footer',
          description:
            'Configurar el texto inferior',
          value:
            'embed_footer',
          emoji:
            '🔻'
        },

        {
          label:
            'Thumbnail',
          description:
            'Agregar una imagen pequeña',
          value:
            'embed_thumbnail',
          emoji:
            '🖼️'
        },

        {
          label:
            'Imagen',
          description:
            'Agregar una imagen grande',
          value:
            'embed_image',
          emoji:
            '🌄'
        },

        {
          label:
            'Agregar campo',
          description:
            'Agregar un campo al embed',
          value:
            'embed_field',
          emoji:
            '➕'
        },

        {
          label:
            'Vista previa',
          description:
            'Ver cómo quedará el embed',
          value:
            'embed_preview',
          emoji:
            '👀'
        },

        {
          label:
            'Enviar embed',
          description:
            'Enviar el embed al canal',
          value:
            'embed_send',
          emoji:
            '📤'
        },

        {
          label:
            'Cancelar',
          description:
            'Cancelar el creador de embeds',
          value:
            'embed_cancel',
          emoji:
            '❌'
        }

      ]);

  return new ActionRowBuilder()
    .addComponents(
      menu
    );

}

function crearPanelEmbed(datos) {

  const embed =
    new EmbedBuilder()
      .setColor(
        datos.color || '#2b2d31'
      )
      .setTitle(
        '🛠️ CREADOR DE EMBEDS'
      )
      .setDescription(
        'Configura tu embed utilizando el menú de abajo.\n\n' +

        '📝 **Título:** ' +
        (
          datos.title
            ? '`Configurado`'
            : '`Sin configurar`'
        ) +
        '\n' +

        '📄 **Descripción:** ' +
        (
          datos.description
            ? '`Configurada`'
            : '`Sin configurar`'
        ) +
        '\n' +

        '🎨 **Color:** `' +
        (
          datos.color ||
          '#2b2d31'
        ) +
        '`\n' +

        '🔻 **Footer:** ' +
        (
          datos.footer
            ? '`Configurado`'
            : '`Sin configurar`'
        ) +
        '\n' +

        '🖼️ **Thumbnail:** ' +
        (
          datos.thumbnail
            ? '`Configurado`'
            : '`Sin configurar`'
        ) +
        '\n' +

        '🌄 **Imagen:** ' +
        (
          datos.image
            ? '`Configurada`'
            : '`Sin configurar`'
        ) +
        '\n' +

        '➕ **Campos:** `' +
        datos.fields.length +
        '`'
      );

  return embed;

}

// ==========================================
// COMPROBAR GIF PERMITIDO
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
// OBTENER LINKS NO PERMITIDOS
// ==========================================

function obtenerLinksNoPermitidos(
  contenido
) {

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

    if (!canalLogsId) return;

    const canalLogs =
      guild.channels.cache.get(
        canalLogsId
      );

    if (!canalLogs) return;

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
                ? '<#' +
                  canal.id +
                  '>'
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
          text:
            'Sistema de seguridad'
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

    if (!canalLogsId) return;

    const canalLogs =
      guild.channels.cache.get(
        canalLogsId
      );

    if (!canalLogs) return;

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
                ? '<#' +
                  canal.id +
                  '>'
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
          text:
            'Sistema de seguridad'
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

      if (
        mensajesEliminadosPorClear.has(
          message.id
        )
      ) {

        mensajesEliminadosPorClear.delete(
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
            text:
              'Sistema de seguridad'
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
            text:
              'Sistema de seguridad'
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

    if (
      mensajesEliminadosPorClear.size >
      5000
    ) {

      mensajesEliminadosPorClear.clear();

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

      if (!canal) return;

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

      if (!canal) return;

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

      if (!role) return;

      const botMember =
        guild.members.me;

      if (!botMember) return;

      if (
        role.position >=
        botMember.roles.highest.position
      ) {

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
        // /EMBED
        // ====================================

        if (
          interaction.commandName ===
          'embed'
        ) {

          if (
            !interaction.memberPermissions.has(
              PermissionsBitField.Flags.ManageMessages
            )
          ) {

            await interaction.reply({
              content:
                '❌ Necesitas el permiso **Gestionar mensajes** para usar este comando.',
              ephemeral:
                true
            });

            return;
          }

          const key =
            obtenerEmbedKey(
              interaction
            );

          embedBuilders.set(
            key,
            {
              title: '',
              description: '',
              color: '#2b2d31',
              footer: '',
              thumbnail: '',
              image: '',
              fields: []
            }
          );

          const datos =
            embedBuilders.get(
              key
            );

          await interaction.reply({
            embeds: [
              crearPanelEmbed(
                datos
              )
            ],
            components: [
              crearMenuEmbed()
            ],
            ephemeral:
              true
          });

          return;
        }

        // ====================================
        // /CLEAR
        // ====================================

        if (
          interaction.commandName ===
          'clear'
        ) {

          if (
            !interaction.memberPermissions.has(
              PermissionsBitField.Flags.ManageMessages
            )
          ) {

            await interaction.reply({
              content:
                '❌ No tienes permiso para usar este comando.',
              ephemeral:
                true
            });

            return;
          }

          const canal =
            interaction.channel;

          if (!canal) {

            await interaction.reply({
              content:
                '❌ No se pudo encontrar este canal.',
              ephemeral:
                true
            });

            return;
          }

          if (
            canal.type !==
            ChannelType.GuildText
          ) {

            await interaction.reply({
              content:
                '❌ Este comando solo funciona en canales de texto.',
              ephemeral:
                true
            });

            return;
          }

          const botMember =
            interaction.guild.members.me;

          if (!botMember) {

            await interaction.reply({
              content:
                '❌ No pude comprobar mis permisos.',
              ephemeral:
                true
            });

            return;
          }

          if (
            !canal
              .permissionsFor(botMember)
              .has(
                PermissionsBitField.Flags.ManageMessages
              )
          ) {

            await interaction.reply({
              content:
                '❌ Necesito el permiso **Gestionar mensajes** para poder vaciar este canal.',
              ephemeral:
                true
            });

            return;
          }

          await interaction.reply({
            content:
              '🧹 **Vaciando el canal...**',
            ephemeral:
              true
          });

          let totalEliminados = 0;
          let errores = 0;

          while (true) {

            let mensajes;

            try {

              mensajes =
                await canal.messages.fetch({
                  limit: 100
                });

            } catch (error) {

              console.error(
                'ERROR AL OBTENER MENSAJES PARA /CLEAR:',
                error
              );

              errores++;

              break;

            }

            if (
              mensajes.size === 0
            ) {

              break;

            }

            const ahora =
              Date.now();

            const mensajesRecientes =
              mensajes.filter(
                mensaje =>
                  ahora -
                  mensaje.createdTimestamp <
                  14 *
                  24 *
                  60 *
                  60 *
                  1000
              );

            const mensajesAntiguos =
              mensajes.filter(
                mensaje =>
                  ahora -
                  mensaje.createdTimestamp >=
                  14 *
                  24 *
                  60 *
                  60 *
                  1000
              );

            if (
              mensajesRecientes.size > 0
            ) {

              try {

                for (
                  const mensaje
                  of mensajesRecientes.values()
                ) {

                  mensajesEliminadosPorClear.add(
                    mensaje.id
                  );

                }

                const eliminados =
                  await canal.bulkDelete(
                    mensajesRecientes,
                    true
                  );

                totalEliminados +=
                  eliminados.size;

              } catch (error) {

                for (
                  const mensaje
                  of mensajesRecientes.values()
                ) {

                  try {

                    mensajesEliminadosPorClear.add(
                      mensaje.id
                    );

                    await mensaje.delete();

                    totalEliminados++;

                  } catch (deleteError) {

                    mensajesEliminadosPorClear.delete(
                      mensaje.id
                    );

                    errores++;

                  }

                }

              }

            }

            if (
              mensajesAntiguos.size > 0
            ) {

              const antiguos =
                [
                  ...mensajesAntiguos.values()
                ];

              const BLOQUE =
                10;

              for (
                let i = 0;
                i < antiguos.length;
                i += BLOQUE
              ) {

                const bloque =
                  antiguos.slice(
                    i,
                    i + BLOQUE
                  );

                const resultados =
                  await Promise.allSettled(
                    bloque.map(
                      async (mensaje) => {

                        try {

                          mensajesEliminadosPorClear.add(
                            mensaje.id
                          );

                          await mensaje.delete();

                          return true;

                        } catch (error) {

                          mensajesEliminadosPorClear.delete(
                            mensaje.id
                          );

                          return false;

                        }

                      }
                    )
                  );

                for (
                  const resultado
                  of resultados
                ) {

                  if (
                    resultado.status ===
                    'fulfilled' &&
                    resultado.value === true
                  ) {

                    totalEliminados++;

                  } else {

                    errores++;

                  }

                }

              }

            }

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  250
                )
            );

          }

          await interaction.editReply({
            content:
              '✅ **Canal vaciado correctamente.**\n\n' +
              '🗑️ Mensajes eliminados: **' +
              totalEliminados +
              '**' +
              (
                errores > 0
                  ? '\n⚠️ No se pudieron eliminar: **' +
                    errores +
                    '**'
                  : ''
              )
          });

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

          const permisos =
            canal.permissionsFor(
              interaction.guild.members.me
            );

          if (
            !permisos ||
            !permisos.has(
              PermissionsBitField.Flags.ViewChannel
            ) ||
            !permisos.has(
              PermissionsBitField.Flags.SendMessages
            ) ||
            !permisos.has(
              PermissionsBitField.Flags.EmbedLinks
            )
          ) {

            await interaction.reply({
              content:
                '❌ No puedo enviar logs a ese canal. Necesito **Ver canal**, **Enviar mensajes** y **Insertar enlaces**.',
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

          if (!canal) return;

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

        // ====================================
        // /PAGOS
        // ====================================

        if (
          interaction.commandName ===
          'pagos'
        ) {

          const embed =
            new EmbedBuilder()
              .setColor(
                '#2b2d31'
              )
              .setTitle(
                'MÉTODOS DE PAGO'
              )
              .setDescription(
                'Selecciona el método de pago que quieras utilizar.\n\n' +

                '🪙 **Robux**\n' +
                '🏦 **Transferencia**\n' +
                '💵 **Depósito**'
              )
              .setFooter({
                text:
                  'El precio se mostrará al completar tu pedido'
              })
              .setTimestamp();

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                'pagos_menu'
              )
              .setPlaceholder(
                'Selecciona un método de pago'
              )
              .addOptions([
                {
                  label:
                    'Robux',
                  value:
                    'robux',
                  emoji:
                    '🪙'
                },
                {
                  label:
                    'Transferencia',
                  value:
                    'transferencia',
                  emoji:
                    '🏦'
                },
                {
                  label:
                    'Depósito',
                  value:
                    'deposito',
                  emoji:
                    '💵'
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
              '✅ Panel de métodos de pago enviado.',
            ephemeral:
              true
          });

          return;
        }
      }

      // ======================================
      // MENÚ EMBED
      // ======================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
        'embed_builder_menu'
      ) {

        const datos =
          obtenerDatosEmbed(
            interaction
          );

        const opcion =
          interaction.values[0];

        // ==================================
        // TÍTULO
        // ==================================

        if (
          opcion ===
          'embed_title'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_title'
              )
              .setTitle(
                'Configurar título'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_title_input'
              )
              .setLabel(
                'Título del embed'
              )
              .setPlaceholder(
                'Escribe el título'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                false
              )
              .setMaxLength(
                256
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // DESCRIPCIÓN
        // ==================================

        if (
          opcion ===
          'embed_description'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_description'
              )
              .setTitle(
                'Configurar descripción'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_description_input'
              )
              .setLabel(
                'Descripción'
              )
              .setPlaceholder(
                'Escribe la descripción del embed'
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(
                false
              )
              .setMaxLength(
                4000
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // COLOR
        // ==================================

        if (
          opcion ===
          'embed_color'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_color'
              )
              .setTitle(
                'Cambiar color'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_color_input'
              )
              .setLabel(
                'Color HEX'
              )
              .setPlaceholder(
                '#ff0000'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                true
              )
              .setMinLength(
                7
              )
              .setMaxLength(
                7
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // FOOTER
        // ==================================

        if (
          opcion ===
          'embed_footer'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_footer'
              )
              .setTitle(
                'Configurar footer'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_footer_input'
              )
              .setLabel(
                'Texto del footer'
              )
              .setPlaceholder(
                'Texto inferior del embed'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                false
              )
              .setMaxLength(
                2048
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // THUMBNAIL
        // ==================================

        if (
          opcion ===
          'embed_thumbnail'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_thumbnail'
              )
              .setTitle(
                'Thumbnail'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_thumbnail_input'
              )
              .setLabel(
                'URL de la imagen'
              )
              .setPlaceholder(
                'https://ejemplo.com/imagen.png'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                false
              )
              .setMaxLength(
                2048
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // IMAGEN
        // ==================================

        if (
          opcion ===
          'embed_image'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_image'
              )
              .setTitle(
                'Imagen'
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                'embed_image_input'
              )
              .setLabel(
                'URL de la imagen'
              )
              .setPlaceholder(
                'https://ejemplo.com/imagen.png'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                false
              )
              .setMaxLength(
                2048
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                input
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // AGREGAR CAMPO
        // ==================================

        if (
          opcion ===
          'embed_field'
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                'embed_modal_field'
              )
              .setTitle(
                'Agregar campo'
              );

          const nombre =
            new TextInputBuilder()
              .setCustomId(
                'embed_field_name'
              )
              .setLabel(
                'Nombre del campo'
              )
              .setPlaceholder(
                'Ejemplo: Precio'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                true
              )
              .setMaxLength(
                256
              );

          const valor =
            new TextInputBuilder()
              .setCustomId(
                'embed_field_value'
              )
              .setLabel(
                'Contenido del campo'
              )
              .setPlaceholder(
                'Ejemplo: 100 Robux'
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(
                true
              )
              .setMaxLength(
                1024
              );

          const inline =
            new TextInputBuilder()
              .setCustomId(
                'embed_field_inline'
              )
              .setLabel(
                '¿Inline? escribe si o no'
              )
              .setPlaceholder(
                'si / no'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                false
              )
              .setMaxLength(
                3
              );

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(
                nombre
              ),
            new ActionRowBuilder()
              .addComponents(
                valor
              ),
            new ActionRowBuilder()
              .addComponents(
                inline
              )
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ==================================
        // VISTA PREVIA
        // ==================================

        if (
          opcion ===
          'embed_preview'
        ) {

          const embed =
            crearEmbedDesdeDatos(
              datos
            );

          await interaction.reply({
            content:
              '👀 **Vista previa:**',
            embeds: [
              embed
            ],
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // ENVIAR EMBED
        // ==================================

        if (
          opcion ===
          'embed_send'
        ) {

          const embed =
            crearEmbedDesdeDatos(
              datos
            );

          if (
            !datos.title &&
            !datos.description &&
            datos.fields.length === 0 &&
            !datos.image &&
            !datos.thumbnail &&
            !datos.footer
          ) {

            await interaction.reply({
              content:
                '❌ El embed está vacío. Configura al menos un elemento antes de enviarlo.',
              ephemeral:
                true
            });

            return;
          }

          try {

            await interaction.channel.send({
              embeds: [
                embed
              ]
            });

            embedBuilders.delete(
              obtenerEmbedKey(
                interaction
              )
            );

            await interaction.reply({
              content:
                '✅ **Embed enviado correctamente.**',
              ephemeral:
                true
            });

          } catch (error) {

            console.error(
              'ERROR AL ENVIAR EMBED:',
              error
            );

            await interaction.reply({
              content:
                '❌ No pude enviar el embed. Comprueba que tenga permiso para **Enviar mensajes** e **Insertar enlaces**.',
              ephemeral:
                true
            });

          }

          return;
        }

        // ==================================
        // CANCELAR
        // ==================================

        if (
          opcion ===
          'embed_cancel'
        ) {

          embedBuilders.delete(
            obtenerEmbedKey(
              interaction
            )
          );

          await interaction.update({
            content:
              '❌ **Creador de embeds cancelado.**',
            embeds: [],
            components: []
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
      // MENÚS SELECT
      // ======================================

      if (
        interaction.isStringSelectMenu()
      ) {

        // ====================================
        // MÉTODO DE PAGO
        // ====================================

        if (
          interaction.customId ===
          'pagos_menu'
        ) {

          const metodo =
            interaction.values[0];

          if (
            ![
              'robux',
              'transferencia',
              'deposito'
            ].includes(
              metodo
            )
          ) {

            await interaction.reply({
              content:
                '❌ Método de pago no válido.',
              ephemeral:
                true
            });

            return;
          }

          const embed =
            new EmbedBuilder()
              .setColor(
                '#2b2d31'
              )
              .setTitle(
                '¿QUÉ QUIERES COMPRAR?'
              )
              .setDescription(
                'Selecciona el producto que deseas comprar.\n\n' +
                '👕 **Camisa**\n' +
                '🩳 **Pantalón/Short**\n' +
                '👔 **Conjunto completo**'
              )
              .setFooter({
                text:
                  'El precio se mostrará al finalizar tu pedido'
              })
              .setTimestamp();

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                'producto_menu_' +
                metodo
              )
              .setPlaceholder(
                '¿Qué quieres comprar?'
              )
              .addOptions([
                {
                  label:
                    'Camisa',
                  value:
                    'camisa',
                  emoji:
                    '👕'
                },
                {
                  label:
                    'Pantalón/Short',
                  value:
                    'pantalon',
                  emoji:
                    '🩳'
                },
                {
                  label:
                    'Conjunto completo',
                  value:
                    'conjunto',
                  emoji:
                    '👔'
                }
              ]);

          const row =
            new ActionRowBuilder()
              .addComponents(
                menu
              );

          await interaction.reply({
            embeds: [
              embed
            ],
            components: [
              row
            ],
            ephemeral:
              true
          });

          return;
        }

        // ====================================
        // PRODUCTO
        // ====================================

        if (
          interaction.customId.startsWith(
            'producto_menu_'
          )
        ) {

          const metodo =
            interaction.customId.replace(
              'producto_menu_',
              ''
            );

          const producto =
            interaction.values[0];

          if (
            ![
              'robux',
              'transferencia',
              'deposito'
            ].includes(
              metodo
            )
          ) {

            await interaction.reply({
              content:
                '❌ Método de pago inválido.',
              ephemeral:
                true
            });

            return;
          }

          if (
            ![
              'camisa',
              'pantalon',
              'conjunto'
            ].includes(
              producto
            )
          ) {

            await interaction.reply({
              content:
                '❌ Producto inválido.',
              ephemeral:
                true
            });

            return;
          }

          const modal =
            new ModalBuilder()
              .setCustomId(
                'pedido_cantidad_' +
                metodo +
                '_' +
                producto
              )
              .setTitle(
                'Cantidad'
              );

          const cantidadInput =
            new TextInputBuilder()
              .setCustomId(
                'cantidad_producto'
              )
              .setLabel(
                '¿Cuántos quieres comprar?'
              )
              .setPlaceholder(
                'Ejemplo: 5'
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(
                true
              )
              .setMinLength(
                1
              )
              .setMaxLength(
                4
              );

          const row =
            new ActionRowBuilder()
              .addComponents(
                cantidadInput
              );

          modal.addComponents(
            row
          );

          await interaction.showModal(
            modal
          );

          return;
        }

        // ====================================
        // CREAR TICKET
        // ====================================

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

      // ======================================
      // MODALES
      // ======================================

      if (
        interaction.isModalSubmit()
      ) {

        const key =
          obtenerEmbedKey(
            interaction
          );

        const datos =
          embedBuilders.get(
            key
          );

        // ==================================
        // EMBED TITLE
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_title'
        ) {

          if (!datos) return;

          datos.title =
            interaction.fields.getTextInputValue(
              'embed_title_input'
            );

          await interaction.reply({
            content:
              '✅ Título actualizado.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED DESCRIPTION
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_description'
        ) {

          if (!datos) return;

          datos.description =
            interaction.fields.getTextInputValue(
              'embed_description_input'
            );

          await interaction.reply({
            content:
              '✅ Descripción actualizada.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED COLOR
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_color'
        ) {

          if (!datos) return;

          const color =
            interaction.fields.getTextInputValue(
              'embed_color_input'
            ).trim();

          if (
            !/^#[0-9A-Fa-f]{6}$/.test(
              color
            )
          ) {

            await interaction.reply({
              content:
                '❌ Color inválido. Usa un color HEX como `#ff0000`.',
              ephemeral:
                true
            });

            return;
          }

          datos.color =
            color;

          await interaction.reply({
            content:
              '✅ Color actualizado a `' +
              color +
              '`.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED FOOTER
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_footer'
        ) {

          if (!datos) return;

          datos.footer =
            interaction.fields.getTextInputValue(
              'embed_footer_input'
            );

          await interaction.reply({
            content:
              '✅ Footer actualizado.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED THUMBNAIL
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_thumbnail'
        ) {

          if (!datos) return;

          const url =
            interaction.fields.getTextInputValue(
              'embed_thumbnail_input'
            ).trim();

          if (
            url &&
            !/^https?:\/\/.+/i.test(
              url
            )
          ) {

            await interaction.reply({
              content:
                '❌ La URL no parece válida.',
              ephemeral:
                true
            });

            return;
          }

          datos.thumbnail =
            url;

          await interaction.reply({
            content:
              url
                ? '✅ Thumbnail actualizado.'
                : '✅ Thumbnail eliminado.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED IMAGE
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_image'
        ) {

          if (!datos) return;

          const url =
            interaction.fields.getTextInputValue(
              'embed_image_input'
            ).trim();

          if (
            url &&
            !/^https?:\/\/.+/i.test(
              url
            )
          ) {

            await interaction.reply({
              content:
                '❌ La URL no parece válida.',
              ephemeral:
                true
            });

            return;
          }

          datos.image =
            url;

          await interaction.reply({
            content:
              url
                ? '✅ Imagen actualizada.'
                : '✅ Imagen eliminada.',
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // EMBED FIELD
        // ==================================

        if (
          interaction.customId ===
          'embed_modal_field'
        ) {

          if (!datos) return;

          if (
            datos.fields.length >= 25
          ) {

            await interaction.reply({
              content:
                '❌ Un embed puede tener como máximo **25 campos**.',
              ephemeral:
                true
            });

            return;
          }

          const nombre =
            interaction.fields.getTextInputValue(
              'embed_field_name'
            );

          const valor =
            interaction.fields.getTextInputValue(
              'embed_field_value'
            );

          const inlineTexto =
            interaction.fields.getTextInputValue(
              'embed_field_inline'
            )
              .trim()
              .toLowerCase();

          datos.fields.push({
            name:
              nombre,
            value:
              valor,
            inline:
              inlineTexto ===
              'si'
          });

          await interaction.reply({
            content:
              '✅ Campo agregado correctamente.\n\n' +
              '📌 **Nombre:** ' +
              nombre,
            ephemeral:
              true
          });

          return;
        }

        // ==================================
        // MODAL CANTIDAD
        // ==================================

        if (
          interaction.customId.startsWith(
            'pedido_cantidad_'
          )
        ) {

          const datosPedido =
            interaction.customId.replace(
              'pedido_cantidad_',
              ''
            );

          const partes =
            datosPedido.split('_');

          const metodo =
            partes[0];

          const producto =
            partes[1];

          const cantidadTexto =
            interaction.fields.getTextInputValue(
              'cantidad_producto'
            );

          const cantidad =
            Number(
              cantidadTexto
            );

          if (
            !Number.isInteger(
              cantidad
            ) ||
            cantidad <= 0
          ) {

            await interaction.reply({
              content:
                '**❌ Introduce una cantidad válida. Por ejemplo: __5__**',
              ephemeral:
                true
            });

            return;
          }

          if (
            cantidad > 1000
          ) {

            await interaction.reply({
              content:
                '**❌ La cantidad máxima por pedido es de __1000__.**',
              ephemeral:
                true
            });

            return;
          }

          let nombreMetodo;
          let precioBase;
          let moneda;

          if (
            metodo ===
            'robux'
          ) {

            nombreMetodo =
              'Robux';

            precioBase =
              PRECIO_ROBUX;

            moneda =
              'Robux';

          } else if (
            metodo ===
            'transferencia'
          ) {

            nombreMetodo =
              'Transferencia';

            precioBase =
              PRECIO_TRANSFERENCIA;

            moneda =
              'MXN';

          } else if (
            metodo ===
            'deposito'
          ) {

            nombreMetodo =
              'Depósito';

            precioBase =
              PRECIO_DEPOSITO;

            moneda =
              'MXN';

          } else {

            await interaction.reply({
              content:
                '❌ Método de pago no válido.',
              ephemeral:
                true
            });

            return;
          }

          let nombreProducto;
          let multiplicador;

          if (
            producto ===
            'camisa'
          ) {

            nombreProducto =
              'Camisa';

            multiplicador =
              MULTIPLICADOR_CAMISA;

          } else if (
            producto ===
            'pantalon'
          ) {

            nombreProducto =
              'Pantalón/Short';

            multiplicador =
              MULTIPLICADOR_PANTALON;

          } else if (
            producto ===
            'conjunto'
          ) {

            nombreProducto =
              'Conjunto completo';

            multiplicador =
              MULTIPLICADOR_CONJUNTO;

          } else {

            await interaction.reply({
              content:
                '❌ Producto no válido.',
              ephemeral:
                true
            });

            return;
          }

          const precioPorUnidad =
            precioBase *
            multiplicador;

          const total =
            cantidad *
            precioPorUnidad;

          const embed =
            new EmbedBuilder()
              .setColor('#2b2d31')
              .setTitle(
                '🧾 RESUMEN DE TU PEDIDO'
              )
              .setDescription(
                'Aquí están los detalles completos de tu pedido:'
              )
              .addFields(
                {
                  name:
                    '💳 Método de pago',

                  value:
                    '`' +
                    nombreMetodo +
                    '`',

                  inline:
                    true
                },
                {
                  name:
                    '🛍️ Producto',

                  value:
                    '`' +
                    nombreProducto +
                    '`',

                  inline:
                    true
                },
                {
                  name:
                    '📦 Cantidad',

                  value:
                    '`' +
                    cantidad +
                    '`',

                  inline:
                    true
                },
                {
                  name:
                    '💰 Precio por unidad',

                  value:
                    '**' +
                    precioPorUnidad +
                    ' ' +
                    moneda +
                    '**',

                  inline:
                    true
                },
                {
                  name:
                    '💵 TOTAL',

                  value:
                    '**' +
                    total +
                    ' ' +
                    moneda +
                    '**',

                  inline:
                    false
                },
                {
                  name:
                    '\u200B',

                  value:
                    '🛒 Para comprar abre un <#1357832842561978505>',

                  inline:
                    false
                }
              )
              .setTimestamp();

          await interaction.reply({
            embeds: [
              embed
            ],
            ephemeral:
              true
          });

          return;
        }

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

        try {

          await interaction.reply({
            content:
              '❌ Ocurrió un error al procesar esta interacción.',
            ephemeral:
              true
          });

        } catch (replyError) {

          console.error(
            'ERROR AL ENVIAR MENSAJE DE ERROR:',
            replyError
          );

        }

      }

    }

  }
);

// ==========================================
// LIMPIAR EMBEDS ANTIGUOS
// ==========================================

setInterval(
  () => {

    for (
      const [
        key,
        datos
      ]
      of embedBuilders
    ) {

      if (
        !datos.lastActivity
      ) {

        datos.lastActivity =
          Date.now();

        continue;

      }

      if (
        Date.now() -
        datos.lastActivity >
        30 *
        60 *
        1000
      ) {

        embedBuilders.delete(
          key
        );

      }

    }

  },
  10 *
  60 *
  1000
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
