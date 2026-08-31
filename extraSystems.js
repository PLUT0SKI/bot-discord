const fs = require('fs');
const https = require('https');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const DATA = {
  sales: './sales.json',
  pending: './pending.json',
  invites: './invites.json'
};

const CFG = {
  ticketCategory: process.env.TICKET_CATEGORY_ID || '1357832792699834548',
  staffRole: process.env.TICKET_STAFF_ROLE_ID || '1543794671195529246',
  welcomeChannel: process.env.WELCOME_CHANNEL_ID || '1543780167900471316',
  buyerRole: process.env.BUYER_ROLE_ID || '',
  payment: process.env.PAYMENT_INFO || 'Configura PAYMENT_INFO en tus variables de entorno.',
  deposit: process.env.DEPOSIT_INFO || 'Configura DEPOSIT_INFO en tus variables de entorno.'
};

const inviteCache = new Map();
const invitedBy = new Map();
let installed = false;

function readJson(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function staff(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    interaction.member?.roles?.cache?.has(CFG.staffRole);
}
function getBuyerRole(guild) {
  return CFG.buyerRole ? guild.roles.cache.get(CFG.buyerRole) : guild.roles.cache.find(r => r.name.toLowerCase() === 'comprador');
}
function httpJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function commandData() {
  return [
    new SlashCommandBuilder().setName('roblox-user').setDescription('Consulta un usuario de Roblox').addStringOption(o => o.setName('usuario').setDescription('Username de Roblox').setRequired(true)),
    new SlashCommandBuilder().setName('roblox-game').setDescription('Consulta información pública de un juego de Roblox').addIntegerOption(o => o.setName('id').setDescription('Universe ID del juego').setRequired(true)),
    new SlashCommandBuilder().setName('comprador').setDescription('Confirma una venta y otorga el rol Comprador').addUserOption(o => o.setName('usuario').setDescription('Usuario comprador')).addNumberOption(o => o.setName('precio').setDescription('Importe de la venta').setMinValue(0)),
    new SlashCommandBuilder().setName('reportesemanal').setDescription('Muestra las ganancias de los últimos 7 días'),
    new SlashCommandBuilder().setName('limpiarventas').setDescription('Borra el historial de ventas').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder().setName('pendientes').setDescription('Gestiona entregas pendientes')
      .addSubcommand(s => s.setName('agregar').setDescription('Agrega una entrega pendiente').addStringOption(o => o.setName('descripcion').setDescription('Qué falta entregar').setRequired(true)).addUserOption(o => o.setName('usuario').setDescription('Cliente')))
      .addSubcommand(s => s.setName('completar').setDescription('Marca un pendiente como entregado').addIntegerOption(o => o.setName('id').setDescription('ID del pendiente').setRequired(true)))
      .addSubcommand(s => s.setName('lista').setDescription('Muestra pendientes activos'))
  ].map(c => c.toJSON());
}

async function registerCommands(client) {
  const existing = await client.application.commands.fetch();
  for (const data of commandData()) {
    const old = existing.find(c => c.name === data.name);
    if (old) await old.edit(data); else await client.application.commands.create(data);
  }
}

async function cacheInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const inv of invites.values()) map.set(inv.code, { uses: inv.uses || 0, inviterId: inv.inviter?.id || null });
    inviteCache.set(guild.id, map);
  } catch (e) { console.log(`[INVITES] No se pudieron cargar en ${guild.name}: ${e.message}`); }
}

async function usedInvite(guild) {
  try {
    const now = await guild.invites.fetch();
    const old = inviteCache.get(guild.id) || new Map();
    let used = null;
    for (const inv of now.values()) {
      const before = old.get(inv.code)?.uses || 0;
      if ((inv.uses || 0) > before) { used = inv; break; }
    }
    const map = new Map();
    for (const inv of now.values()) map.set(inv.code, { uses: inv.uses || 0, inviterId: inv.inviter?.id || null });
    inviteCache.set(guild.id, map);
    return used;
  } catch { return null; }
}

function install(client) {
  if (installed || !client) return;
  installed = true;

  client.once('ready', async () => {
    await registerCommands(client).catch(e => console.error('[SYSTEMS] Comandos:', e));
    for (const guild of client.guilds.cache.values()) await cacheInvites(guild);
    console.log('Sistemas extra cargados: Roblox, ventas, pendientes, tickets, comandos e invitaciones.');
  });

  client.on('guildCreate', guild => cacheInvites(guild));

  client.on('guildMemberAdd', async member => {
    const inv = await usedInvite(member.guild);
    const inviter = inv?.inviter;
    if (!inviter || inviter.id === member.id) return;

    const data = readJson(DATA.invites, {});
    data[member.guild.id] ??= {};
    data[member.guild.id][inviter.id] ??= { count: 0, members: [] };
    const key = `${member.guild.id}:${member.id}`;
    if (!invitedBy.has(key)) {
      data[member.guild.id][inviter.id].count++;
      data[member.guild.id][inviter.id].members.push(member.id);
      invitedBy.set(key, inviter.id);
      writeJson(DATA.invites, data);
    }
    const channel = member.guild.channels.cache.get(CFG.welcomeChannel);
    if (channel) await channel.send(`🎉 **${member} fue invitado a la comunidad por <@${inviter.id}>**\n👥 <@${inviter.id}> ahora tiene **${data[member.guild.id][inviter.id].count} invitación${data[member.guild.id][inviter.id].count === 1 ? '' : 'es'}**.`).catch(() => {});
  });

  client.on('guildMemberRemove', member => {
    const key = `${member.guild.id}:${member.id}`;
    const inviterId = invitedBy.get(key);
    if (!inviterId) return;
    const data = readJson(DATA.invites, {});
    const rec = data[member.guild.id]?.[inviterId];
    if (rec) {
      rec.count = Math.max(0, rec.count - 1);
      rec.members = (rec.members || []).filter(id => id !== member.id);
      writeJson(DATA.invites, data);
    }
    invitedBy.delete(key);
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        const name = interaction.commandName;
        if (['comprador', 'reportesemanal', 'limpiarventas', 'pendientes'].includes(name) && !staff(interaction)) return interaction.reply({ content: '❌ No tienes permisos de staff.', ephemeral: true });

        if (name === 'roblox-user') {
          const username = interaction.options.getString('usuario');
          await interaction.deferReply();
          const r = await httpJson('https://users.roblox.com/v1/usernames/users', { method: 'POST', body: { usernames: [username], excludeBannedUsers: false } });
          const u = r.data?.data?.[0];
          if (!u) return interaction.editReply('❌ No encontré ese usuario de Roblox.');
          const p = await httpJson(`https://users.roblox.com/v1/users/${u.id}`);
          const embed = new EmbedBuilder().setColor('#2b2d31').setTitle(`Roblox: ${u.name}`).setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${u.id}&width=420&height=420&format=png`).addFields({ name: 'Display name', value: u.displayName || u.name, inline: true }, { name: 'ID', value: String(u.id), inline: true }, { name: 'Creado', value: p.data?.created ? `<t:${Math.floor(new Date(p.data.created).getTime()/1000)}:D>` : 'N/D', inline: true }).setDescription(p.data?.description || 'Sin descripción.');
          return interaction.editReply({ embeds: [embed] });
        }

        if (name === 'roblox-game') {
          const id = interaction.options.getInteger('id');
          await interaction.deferReply();
          const r = await httpJson(`https://games.roblox.com/v1/games?universeIds=${id}`);
          const g = r.data?.data?.[0];
          if (!g) return interaction.editReply('❌ No encontré información pública para ese Universe ID.');
          const embed = new EmbedBuilder().setColor('#2b2d31').setTitle(g.name || 'Juego Roblox').setDescription(g.description || 'Sin descripción.').addFields({ name: 'Universe ID', value: String(id), inline: true }, { name: 'Jugadores', value: String(g.playing ?? 0), inline: true }, { name: 'Visitas', value: String(g.visits ?? 0), inline: true }, { name: 'Favoritos', value: String(g.favoritedCount ?? 0), inline: true });
          return interaction.editReply({ embeds: [embed] });
        }

        if (name === 'comprador') {
          const user = interaction.options.getUser('usuario') || interaction.user;
          const price = interaction.options.getNumber('precio') || 0;
          const member = await interaction.guild.members.fetch(user.id);
          const role = getBuyerRole(interaction.guild);
          if (!role) return interaction.reply({ content: '❌ No encontré el rol Comprador. Crea el rol o configura BUYER_ROLE_ID.', ephemeral: true });
          await member.roles.add(role);
          const sales = readJson(DATA.sales, []);
          sales.push({ id: Date.now(), guildId: interaction.guild.id, userId: user.id, price, date: new Date().toISOString() });
          writeJson(DATA.sales, sales);
          return interaction.reply(`✅ ${user} fue marcado como **Comprador**${price ? ` y se registró una venta de **$${price.toFixed(2)}**.` : '.'}`);
        }

        if (name === 'reportesemanal') {
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const sales = readJson(DATA.sales, []).filter(s => s.guildId === interaction.guild.id && new Date(s.date).getTime() >= cutoff);
          const total = sales.reduce((a, s) => a + Number(s.price || 0), 0);
          return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('📊 Reporte de ganancias — últimos 7 días').addFields({ name: 'Ventas', value: String(sales.length), inline: true }, { name: 'Ganancias', value: `$${total.toFixed(2)}`, inline: true })] });
        }

        if (name === 'limpiarventas') {
          writeJson(DATA.sales, []);
          return interaction.reply('🗑️ Historial de ventas eliminado.');
        }

        if (name === 'pendientes') {
          const sub = interaction.options.getSubcommand();
          const pending = readJson(DATA.pending, []);
          if (sub === 'agregar') {
            const item = { id: pending.length ? Math.max(...pending.map(x => x.id)) + 1 : 1, guildId: interaction.guild.id, userId: interaction.options.getUser('usuario')?.id || null, description: interaction.options.getString('descripcion'), created: new Date().toISOString(), completed: false };
            pending.push(item); writeJson(DATA.pending, pending); return interaction.reply(`📦 Pendiente **#${item.id}** agregado.`);
          }
          if (sub === 'completar') {
            const id = interaction.options.getInteger('id'); const item = pending.find(x => x.guildId === interaction.guild.id && x.id === id && !x.completed);
            if (!item) return interaction.reply('❌ No encontré ese pendiente activo.');
            item.completed = true; item.completedAt = new Date().toISOString(); writeJson(DATA.pending, pending); return interaction.reply(`✅ Pendiente **#${id}** marcado como entregado.`);
          }
          const active = pending.filter(x => x.guildId === interaction.guild.id && !x.completed);
          return interaction.reply(active.length ? active.map(x => `**#${x.id}** — ${x.description}${x.userId ? ` — <@${x.userId}>` : ''}`).join('\n') : '📦 No hay pendientes activos.');
        }
      }

      if (interaction.isButton() && interaction.customId === 'extra_ticket_open') {
        const existing = interaction.guild.channels.cache.find(c => c.parentId === CFG.ticketCategory && c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18)}`);
        if (existing) return interaction.reply({ content: `🎫 Ya tienes un ticket abierto: ${existing}`, ephemeral: true });
        const channel = await interaction.guild.channels.create({ name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18)}`, type: ChannelType.GuildText, parent: CFG.ticketCategory, permissionOverwrites: [{ id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }, { id: CFG.staffRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }] });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('extra_ticket_close').setLabel('Cerrar ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
        await channel.send({ content: `${interaction.user} <@&${CFG.staffRole}>`, embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('🎫 Soporte & Compras').setDescription('Cuéntanos qué necesitas. Un miembro del staff te atenderá.')], components: [row] });
        return interaction.reply({ content: `✅ Ticket creado: ${channel}`, ephemeral: true });
      }
      if (interaction.isButton() && interaction.customId === 'extra_ticket_close') {
        if (!staff(interaction)) return interaction.reply({ content: '❌ Solo staff puede cerrar tickets.', ephemeral: true });
        await interaction.reply('🔒 Ticket cerrado.');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 1500);
      }
    } catch (e) {
      console.error('[SYSTEMS]', e);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Ocurrió un error.', ephemeral: true }).catch(() => {});
    }
  });

  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const content = message.content.trim();
    if (!content.startsWith('!')) return;
    if (!staff(message)) return;
    const [cmd, ...args] = content.slice(1).split(/\s+/);

    if (cmd === 'panel') {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('extra_ticket_open').setLabel('Abrir ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('🎫 Soporte & Compras').setDescription('Pulsa el botón para abrir un ticket de soporte o compra.')], components: [row] });
    }
    if (cmd === 'reglas') return message.channel.send({ embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('📜 Reglas').setDescription('Respeta a los demás, evita spam, no compartas contenido inapropiado y sigue las indicaciones del staff.')] });
    if (cmd === 'pago') return message.channel.send({ embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('💳 Datos de pago').setDescription(CFG.payment)] });
    if (cmd === 'deposito') return message.channel.send({ embeds: [new EmbedBuilder().setColor('#2b2d31').setTitle('🏦 Datos de depósito').setDescription(CFG.deposit)] });
    if (cmd === 'rename') {
      if (!message.channel.parentId || message.channel.parentId !== CFG.ticketCategory) return message.reply('❌ Este comando solo se usa dentro de un ticket.');
      const name = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
      if (!name) return message.reply('Uso: `!rename nombre`');
      return message.channel.setName(name).then(() => message.reply(`✅ Ticket renombrado a **${name}**.`));
    }
    if (cmd === 'plantilla') return message.channel.send('📋 **Plantilla de alianza/promoción**\n\n**Servidor:**\n**Miembros:**\n**Invitación:**\n**Propuesta:**\n**Contacto:**');
    if (cmd === 'comandos') {
      const text = '📋 **Comandos**\n\n**Todos:** `/roblox-user`, `/roblox-game`\n**Staff:** `/comprador`, `/reportesemanal`, `/limpiarventas`, `/pendientes`, `!panel`, `!reglas`, `!pago`, `!deposito`, `!rename`, `!plantilla`, `!comandos`';
      return message.author.send(text).then(() => message.reply('📩 Te envié la lista por DM.')).catch(() => message.reply('❌ No pude enviarte DM.'));
    }
  });
}

const { Client } = require('discord.js');
const originalLogin = Client.prototype.login;
Client.prototype.login = function(...args) {
  install(this);
  return originalLogin.apply(this, args);
};

module.exports = { install };
