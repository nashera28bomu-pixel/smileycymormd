'use strict';

const fs = require('fs');
const path = require('path');
const brand = require('../brand');
const S = require('../lib/style');
const { sendWithChannelButton } = require('../lib/channel');

const cmdName = n => (n || '').toLowerCase();

// ─── Category look & feel (own names, own order — nothing copied from other bots) ───
const THEMES = {
  ai:        { icon: '🧠', rune: '◈', title: 'Brain Lab' },
  others:    { icon: '🎉', rune: '✧', title: 'Fun Corner' },
  games:     { icon: '🎮', rune: '✪', title: 'Game Arena' },
  economy:   { icon: '💰', rune: '❖', title: 'Cymor Bank' },
  downloads: { icon: '📥', rune: '⬢', title: 'Grab Zone' },
  media:     { icon: '🎬', rune: '◉', title: 'Media Studio' },
  effects:   { icon: '🪄', rune: '✺', title: 'Logo Magic' },
  converter: { icon: '🔁', rune: '⇄', title: 'Shape Shifter' },
  text:      { icon: '🔤', rune: '✎', title: 'Text Forge' },
  utility:   { icon: '🧰', rune: '⚙', title: 'Toolbox' },
  group:     { icon: '🏘️', rune: '✦', title: 'Squad Control' },
  stalk:     { icon: '🕵️', rune: '◎', title: 'Profile Radar' },
  football:  { icon: '⚽', rune: '⬡', title: 'Pitch Side' },
  coding:    { icon: '👨‍💻', rune: '⌘', title: 'Dev Den' },
  owner:     { icon: '👑', rune: '♛', title: 'Boss Mode' },
  misc:      { icon: '📦', rune: '▣', title: 'Extras' },
};
const ORDER = ['ai', 'others', 'games', 'economy', 'downloads', 'media', 'effects', 'converter', 'text', 'utility', 'group', 'stalk', 'football', 'coding', 'owner', 'misc'];
const theme = c => THEMES[c] || { icon: '📌', rune: '✦', title: c.charAt(0).toUpperCase() + c.slice(1) };

// handpicked "start here" commands that float to the top of a category
const FEATURED = {
  ai: ['ai', 'gpt', 'gemini', 'imagine', 'vision'],
  downloads: ['play', 'ytmp4', 'tiktok', 'instagram', 'facebook', 'spotify'],
  group: ['tagall', 'hidetag', 'kick', 'promote', 'warn', 'antilink'],
  utility: ['ping', 'alive', 'weather', 'translate', 'qr'],
  owner: ['mode', 'prefix', 'settings', 'broadcast'],
  games: ['tictactoe', 'trivia', 'hangman', 'slot'],
  economy: ['daily', 'wallet', 'work'],
};

// ─── Data helpers ────────────────────────────────────────────────────────────
function collectCommands() {
  const byCategory = {};
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'menu.js');
  for (const file of files) {
    try {
      const list = require(path.join(__dirname, file));
      for (const plugin of (Array.isArray(list) ? list : [list])) {
        if (plugin.hidden) continue;
        const cat = plugin.category || 'misc';
        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        if (!cmds[0]) continue;
        (byCategory[cat] = byCategory[cat] || []).push({
          name: cmdName(cmds[0]),
          aliases: plugin.aliases || [],
          description: plugin.description || '',
        });
      }
    } catch {}
  }
  for (const k of Object.keys(byCategory)) {
    const feat = FEATURED[k] || [];
    // featured first (in the order above), the rest by length then A–Z → a tidy "staircase"
    byCategory[k].sort((a, b) => {
      const fa = feat.indexOf(a.name), fb = feat.indexOf(b.name);
      if (fa !== -1 || fb !== -1) return (fa === -1 ? 99 : fa) - (fb === -1 ? 99 : fb);
      return a.name.length - b.name.length || a.name.localeCompare(b.name);
    });
  }
  return byCategory;
}

const sortedCats = by => [...Object.keys(by)].filter(c => c !== 'menu').sort((a, b) => {
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

function nairobi() {
  const now = new Date();
  const tz = 'Africa/Nairobi';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: tz }).format(now)) % 24;
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(now);
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: tz }).format(now);
  const greet = hour < 5 ? '🌙 Late night' : hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : hour < 21 ? '🌇 Good evening' : '🌙 Good night';
  return { time, date, greet };
}

function uptimeStr(sec) {
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

// wrap a list of "chips" into lines of at most `width` visible characters
function wrapChips(chips, width = 30, sep = '  ') {
  const lines = []; let cur = '';
  for (const c of chips) {
    if (!cur) cur = c;
    else if ((cur + sep + c).length <= width) cur += sep + c;
    else { lines.push(cur); cur = c; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
function headerCard({ pushname, mode, prefix, total, cats, Rspeed }) {
  const t = nairobi();
  const mem = (process.memoryUsage().rss / 1048576).toFixed(0);
  const row = (k, v) => `┃ ${S.small(k.padEnd(8, ' '))}❯ ${v}`;
  return [
    `┏━━━━━━━━━━━━━━━━━━━━━━━━┓`,
    `┃   ${S.script('Smiley Cymor MD')}  ${'✦'}`,
    `┃   ${S.small(brand.motto)}`,
    `┗━━━━━━━━━━━━━━━━━━━━━━━━┛`,
    ``,
    `${t.greet}, *${pushname}* 👋`,
    ``,
    `╭──── ${S.bold('SYSTEM CARD')} ────╮`,
    row('owner', brand.owner),
    row('mode', String(mode).toUpperCase()),
    row('prefix', `[ ${prefix} ]`),
    row('tools', `${total} cmds · ${cats} zones`),
    row('uptime', uptimeStr(process.uptime())),
    row('memory', `${mem} MB`),
    row('speed', `${Number(Rspeed || 0).toFixed(2)} ms`),
    row('clock', `${t.time} · ${t.date}`),
    `╰──────────────────────╯`,
  ].join('\n');
}

function fullMenu(by, ctx) {
  let out = '';
  for (const cat of sortedCats(by)) {
    const th = theme(cat);
    const list = by[cat];
    out += `\n╭━━❰ ${th.icon} ${S.scriptLite(th.title)} ❱━━╮\n`;
    out += `┃ ${th.rune} ${S.tiny(list.length + ' commands')}\n`;
    for (const line of wrapChips(list.map(c => `${ctx.prefix}${c.name}`), 32, ' ▪ ')) out += `┃ ${line}\n`;
    out += `╰━━━━━━━━━━━━━━━━━━━╯\n`;
  }
  out += `\n💡 ${S.italic('Peek inside a zone')}: ${ctx.prefix}menu games\n`;
  return out;
}

function categoryMenu(cat, list, ctx) {
  const th = theme(cat);
  let out = `╭━━❰ ${th.icon} ${S.scriptLite(th.title)} ❱━━╮\n┃ ${th.rune} ${S.tiny(list.length + ' commands')}\n╰━━━━━━━━━━━━━━━━━━━╯\n\n`;
  for (const c of list) {
    out += `${th.rune} *${ctx.prefix}${c.name}*\n`;
    if (c.description) out += `   ╰ ${S.italic(c.description)}\n`;
    if (c.aliases.length) out += `   ╰ ${S.small('also')}: ${c.aliases.slice(0, 4).map(a => ctx.prefix + a).join(', ')}\n`;
  }
  return out;
}

const footerText = () => `${S.small(brand.name)} • ${S.italic(brand.motto)}`;

// ─── Media ───────────────────────────────────────────────────────────────────
const MEDIA_DIR = path.join(__dirname, '..', 'media');
function readMedia(video) {
  try { return fs.readFileSync(path.join(MEDIA_DIR, video ? 'menu.mp4' : 'menu.jpg')); } catch { return null; }
}

module.exports = [
  {
    command: ['menu', 'help'],
    aliases: ['allmenu', 'commands'],
    description: 'Open the command menu (banner + menu + channel button in one message)',
    category: 'menu',
    handler: async (client, m, { prefix, mode, menutype, pushname, Rspeed, text }) => {
      const by = collectCommands();
      const cats = sortedCats(by);
      const total = cats.reduce((s, c) => s + by[c].length, 0);
      const ctx = { prefix, mode, pushname, Rspeed, total, cats: cats.length };

      const want = (text || '').trim().toLowerCase();
      let caption;
      if (want) {
        const hit = cats.find(c => c === want || theme(c).title.toLowerCase().includes(want));
        if (!hit) {
          const names = cats.map(c => `${theme(c).icon} ${c} — ${theme(c).title}`).join('\n');
          return client.sendMessage(m.chat, { text: `${S.voice.err('no zone called *' + want + '*')}\n\n${S.bold('Zones')}:\n${names}\n\n${S.italic('Try')}: ${prefix}menu games` }, { quoted: m });
        }
        caption = categoryMenu(hit, by[hit], ctx);
      } else {
        caption = headerCard(ctx) + '\n' + fullMenu(by, ctx);
      }

      const isVideo = menutype === 'video';
      const wantsMedia = menutype === 'video' || menutype === 'image';
      const buffer = wantsMedia ? readMedia(isVideo) : null;
      const content = { caption, footer: footerText() };
      if (buffer) { if (isVideo) { content.video = buffer; content.gif = true; } else content.image = buffer; }

      try {
        await sendWithChannelButton(client, m.chat, content, m);
      } catch (err) {
        console.error('[menu] send failed:', err);
        try { await client.sendMessage(m.chat, { text: caption + '\n\n📢 ' + brand.channel }, { quoted: m }); } catch (e) { console.error('[menu] text fallback failed:', e); }
      }
    },
  },
];
