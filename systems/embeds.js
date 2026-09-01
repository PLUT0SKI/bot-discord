const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');

const builders = new Map();
const key = i => `${i.guild.id}:${i.user.id}`;
const getData = i => {
  const k = key(i);
  if (!builders.has(k)) builders.set(k, { title: '', description: '', color: '#2b2d31', footer: '', thumbnail: '', image: '', fields: [], lastActivity: Date.now() });
  const d = builders.get(k); d.lastActivity = Date.now(); return d;
};
function build(d) {
  const e = new EmbedBuilder().setColor(d.color || '#2b2d31');
  if (d.title) e.setTitle(d.title);
  if (d.description) e.setDescription(d.description);
  if (d.footer) e.setFooter({ text: d.footer });
  if (d.thumbnail) e.setThumbnail(d.thumbnail);
  if (d.image) e.setImage(d.image);
  if (d.fields.length) e.addFields(d.fields);
  return e;
}
function menu() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('embed_builder_menu').setPlaceholder('Selecciona qué quieres configurar').addOptions(
    { label: 'Título', description: 'Configurar el título del embed', value: 'embed_title', emoji: '📝' },
    { label: 'Descripción', description: 'Configurar la descripción', value: 'embed_description', emoji: '📄' },
    { label: 'Color', description: 'Cambiar el color del embed', value: 'embed_color', emoji: '🎨' },
    { label: 'Footer', description: 'Configurar el texto inferior', value: 'embed_footer', emoji: '🔻' },
    { label: 'Thumbnail', description: 'Agregar una imagen pequeña', value: 'embed_thumbnail', emoji: '🖼️' },
    { label: 'Imagen', description: 'Agregar una imagen grande', value: 'embed_image', emoji: '🌄' },
    { label: 'Agregar campo', description: 'Agregar un campo al embed', value: 'embed_field', emoji: '➕' },
    { label: 'Vista previa', description: 'Ver cómo quedará el embed', value: 'embed_preview', emoji: '👀' },
    { label: 'Enviar embed', description: 'Enviar el embed al canal', value: 'embed_send', emoji: '📤' },
    { label: 'Cancelar', description: 'Cancelar el creador de embeds', value: 'embed_cancel', emoji: '❌' }
  ));
}
function panel(d) {
  return new EmbedBuilder().setColor(d.color).setTitle('🛠️ CREADOR DE EMBEDS').setDescription(
    'Configura tu embed utilizando el menú de abajo.\n\n' +
    `📝 **Título:** ${d.title ? '`Configurado`' : '`Sin configurar`'}\n` +
    `📄 **Descripción:** ${d.description ? '`Configurada`' : '`Sin configurar`'}\n` +
    `🎨 **Color:** \`${d.color}\`\n` +
    `🔻 **Footer:** ${d.footer ? '`Configurado`' : '`Sin configurar`'}\n` +
    `🖼️ **Thumbnail:** ${d.thumbnail ? '`Configurado`' : '`Sin configurar`'}\n` +
    `🌄 **Imagen:** ${d.image ? '`Configurada`' : '`Sin configurar`'}\n` +
    `➕ **Campos:** \`${d.fields.length}\``
  );
}
function textModal(id, title, label, placeholder, style = TextInputStyle.Short, required = false, max = 2048) {
  return new ModalBuilder().setCustomId(id).setTitle(title).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`${id}_input`).setLabel(label).setPlaceholder(placeholder).setStyle(style).setRequired(required).setMaxLength(max)));
}

module.exports = client => {
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'embed') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Necesitas el permiso **Gestionar mensajes** para usar este comando.', ephemeral: true });
        builders.set(key(interaction), { title: '', description: '', color: '#2b2d31', footer: '', thumbnail: '', image: '', fields: [], lastActivity: Date.now() });
        return interaction.reply({ embeds: [panel(getData(interaction))], components: [menu()], ephemeral: true });
      }
      if (interaction.isStringSelectMenu() && interaction.customId === 'embed_builder_menu') {
        const d = getData(interaction), o = interaction.values[0];
        const specs = {
          embed_title: ['embed_modal_title', 'Configurar título', 'Título del embed', 'Escribe el título', TextInputStyle.Short, false, 256],
          embed_description: ['embed_modal_description', 'Configurar descripción', 'Descripción', 'Escribe la descripción del embed', TextInputStyle.Paragraph, false, 4000],
          embed_footer: ['embed_modal_footer', 'Configurar footer', 'Texto del footer', 'Texto inferior del embed', TextInputStyle.Short, false, 2048],
          embed_thumbnail: ['embed_modal_thumbnail', 'Thumbnail', 'URL de la imagen', 'https://ejemplo.com/imagen.png', TextInputStyle.Short, false, 2048],
          embed_image: ['embed_modal_image', 'Imagen', 'URL de la imagen', 'https://ejemplo.com/imagen.png', TextInputStyle.Short, false, 2048]
        };
        if (specs[o]) return interaction.showModal(textModal(...specs[o]));
        if (o === 'embed_color') return interaction.showModal(textModal('embed_modal_color', 'Cambiar color', 'Color HEX', '#ff0000', TextInputStyle.Short, true, 7));
        if (o === 'embed_field') {
          const m = new ModalBuilder().setCustomId('embed_modal_field').setTitle('Agregar campo').addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_field_name').setLabel('Nombre del campo').setPlaceholder('Ejemplo: Precio').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_field_value').setLabel('Contenido del campo').setPlaceholder('Ejemplo: 100 Robux').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1024)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_field_inline').setLabel('¿Inline? escribe si o no').setPlaceholder('si / no').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(3))
          );
          return interaction.showModal(m);
        }
        if (o === 'embed_preview') return interaction.reply({ content: '👀 **Vista previa:**', embeds: [build(d)], ephemeral: true });
        if (o === 'embed_send') {
          if (!d.title && !d.description && !d.fields.length && !d.image && !d.thumbnail && !d.footer) return interaction.reply({ content: '❌ El embed está vacío. Configura al menos un elemento antes de enviarlo.', ephemeral: true });
          await interaction.channel.send({ embeds: [build(d)] }); builders.delete(key(interaction));
          return interaction.reply({ content: '✅ **Embed enviado correctamente.**', ephemeral: true });
        }
        if (o === 'embed_cancel') { builders.delete(key(interaction)); return interaction.update({ content: '❌ **Creador de embeds cancelado.**', embeds: [], components: [] }); }
      }
      if (!interaction.isModalSubmit()) return;
      const d = builders.get(key(interaction)); if (!d) return;
      d.lastActivity = Date.now();
      const values = {
        embed_modal_title: ['title', 'embed_modal_title_input', 'Título actualizado.'],
        embed_modal_description: ['description', 'embed_modal_description_input', 'Descripción actualizada.'],
        embed_modal_footer: ['footer', 'embed_modal_footer_input', 'Footer actualizado.'],
        embed_modal_thumbnail: ['thumbnail', 'embed_modal_thumbnail_input', 'Thumbnail actualizado.'],
        embed_modal_image: ['image', 'embed_modal_image_input', 'Imagen actualizada.']
      };
      if (values[interaction.customId]) {
        const [prop, input, msg] = values[interaction.customId]; const value = interaction.fields.getTextInputValue(input).trim();
        if ((prop === 'thumbnail' || prop === 'image') && value && !/^https?:\/\/.+/i.test(value)) return interaction.reply({ content: '❌ La URL no parece válida.', ephemeral: true });
        d[prop] = value; return interaction.reply({ content: value ? `✅ ${msg}` : `✅ ${prop === 'thumbnail' ? 'Thumbnail' : prop === 'image' ? 'Imagen' : prop} eliminado.`, ephemeral: true });
      }
      if (interaction.customId === 'embed_modal_color') {
        const color = interaction.fields.getTextInputValue('embed_modal_color_input').trim();
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return interaction.reply({ content: '❌ Color inválido. Usa un color HEX como `#ff0000`.', ephemeral: true });
        d.color = color; return interaction.reply({ content: `✅ Color actualizado a \`${color}\`.`, ephemeral: true });
      }
      if (interaction.customId === 'embed_modal_field') {
        if (d.fields.length >= 25) return interaction.reply({ content: '❌ Un embed puede tener como máximo **25 campos**.', ephemeral: true });
        const nombre = interaction.fields.getTextInputValue('embed_field_name'), valor = interaction.fields.getTextInputValue('embed_field_value'), inline = interaction.fields.getTextInputValue('embed_field_inline').trim().toLowerCase() === 'si';
        d.fields.push({ name: nombre, value: valor, inline }); return interaction.reply({ content: `✅ Campo agregado correctamente.\n\n📌 **Nombre:** ${nombre}`, ephemeral: true });
      }
    } catch (error) { console.error('ERROR EN EL SISTEMA DE EMBEDS:', error); }
  });
  setInterval(() => { for (const [k, d] of builders) if (Date.now() - d.lastActivity > 30 * 60 * 1000) builders.delete(k); }, 10 * 60 * 1000);
};
