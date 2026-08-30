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
    GatewayIntentBits.GuildMessages
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

// ==========================================
// REACTION ROLES
// ==========================================

let reactionRoles = {};

if (fs.existsSync(REACTION_FILE)) {
  try {
    reactionRoles = JSON.parse(
      fs.readFileSync(REACTION_FILE, 'utf8')
    );

    console.log('CONFIGURACIONES DE REACCIONES CARGADAS.');
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
// BOT ENCENDIDO
// ==========================================

client.once('ready', () => {
  console.log(
    'BOT ENCENDIDO COMO ' + client.user.tag
  );
});

// ==========================================
// BIENVENIDA
// ==========================================

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
      return;
    }

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
        );

    await canal.send({
      content:
        'Hola <@' +
        member.id +
        '>!',

      embeds: [embed]
    });

  } catch (error) {
    console.error(
      'ERROR EN BIENVENIDA:',
      error
    );
  }
});

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
                '❌ No encontré ese mensaje en este canal.\n\n' +
                'Asegúrate de usar correctamente el ID del mensaje.',
              ephemeral: true
            });

            return;
          }

          // =================================
          // PROCESAR EMOJI
          // =================================

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

          // =================================
          // AGREGAR REACCIÓN
          // =================================

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
                '❌ No pude agregar esa reacción.\n\n' +
                'Comprueba que el emoji sea válido y que el bot tenga permiso para reaccionar.',
              ephemeral: true
            });

            return;
          }

          // =================================
          // GUARDAR CONFIGURACIÓN
          // =================================

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

          // =================================
          // RESPUESTA
          // =================================

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

      // ======================================
      // BOTONES
      // ======================================

      if (interaction.isButton()) {

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
              [rowConfirmacion],

            ephemeral:
              true
          });

          return;
        }

        // ====================================
        // CANCELAR CIERRE
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
                .catch(() => {});

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
            ephemeral: true
          });

          return;
        }

        // ====================================
        // COMPROBAR TICKET EXISTENTE
        // ====================================

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

        // ====================================
        // COMPROBAR CATEGORIA
        // ====================================

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

        // ====================================
        // NOMBRE DEL CANAL
        // ====================================

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

        // ====================================
        // CREAR CANAL
        // ====================================

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

        // ====================================
        // EMBED DEL TICKET
        // ====================================

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

        // ====================================
        // BOTON CERRAR
        // ====================================

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

        // ====================================
        // MENSAJE DEL TICKET
        // ====================================

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
