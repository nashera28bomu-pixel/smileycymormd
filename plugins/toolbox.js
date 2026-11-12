'use strict';
/**
 * SMILEY CYMOR MD — Text Forge + Toolbox extras
 * New commands: fancy, qr, readmore, fliptext, reverse, ebinary, dbinary, b64, unb64, shorten, wiki,
 *               pokemon, time, unit, wordcount, mock, clap
 */
const S = require('../lib/style');
const { pick, getJson } = require('../lib/cmdutil');

// text that comes from the command, or from the replied message
const input = (m, text) => String(text || (m.quoted && (m.quoted.text || m.quoted.caption)) || '').trim();
const need = (m, text, prefix, name, ex) => { const t = input(m, text); if (!t) { m.reply(S.voice.usage(`${prefix}${name} <text>`, ex)); return null; } return t; };

const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144 },
  mass: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495, t: 1000 },
  data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
};

module.exports = [
  {
    command: ['fancy'], aliases: ['fonts', 'style'], category: 'text', description: 'Turn text into 16 fancy fonts',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'fancy', 'fancy Smiley Cymor'); if (!t) return;
      const names = { bold: 'Sans Bold', serifBold: 'Serif Bold', italic: 'Italic', boldItalic: 'Bold Italic', script: 'Script', scriptLite: 'Script Lite', gothic: 'Gothic', double: 'Double Struck', mono: 'Monospace', small: 'Small Caps', wide: 'Wide', bubble: 'Bubble', tiny: 'Tiny', upside: 'Upside Down', strike: 'Strike', under: 'Underline' };
      m.reply(`🔤 ${S.scriptLite('Font lab')}\n\n${S.ALL_STYLES.map(k => `▪️ ${S.small(names[k])}\n${S[k](t)}`).join('\n\n')}`);
    },
  },
  {
    command: ['qr'], aliases: ['qrcode'], category: 'utility', description: 'Make a QR code from text or a link',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'qr', 'qr https://example.com'); if (!t) return;
      await client.sendMessage(m.chat, { image: { url: 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=' + encodeURIComponent(t) }, caption: `🔳 ${S.scriptLite('Your QR code')}\n${S.voice.made()}` }, { quoted: m });
    },
  },
  {
    command: ['readmore'], aliases: ['rm'], category: 'text', description: 'Hide text behind "Read more" — use | to split',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'readmore', 'readmore Hello | the secret part'); if (!t) return;
      const [a, ...b] = t.split('|');
      m.reply(a.trim() + '‎'.repeat(4001) + '\n' + b.join('|').trim());
    },
  },
  {
    command: ['fliptext'], aliases: ['upsidedown'], category: 'text', description: 'Write text upside down',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'fliptext', 'fliptext hello'); if (t) m.reply(S.upside(t)); },
  },
  {
    command: ['reverse'], category: 'text', description: 'Reverse any text',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'reverse', 'reverse hello'); if (t) m.reply([...t].reverse().join('')); },
  },
  {
    command: ['mock'], category: 'text', description: 'sPoNgEbOb mOcKiNg tExT',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'mock', 'mock you are so smart'); if (t) m.reply([...t].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('')); },
  },
  {
    command: ['clap'], category: 'text', description: 'Put 👏 between 👏 every 👏 word',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'clap', 'clap good job team'); if (t) m.reply(t.split(/\s+/).join(' 👏 ') + ' 👏'); },
  },
  {
    command: ['wordcount'], aliases: ['count'], category: 'text', description: 'Count words, characters and lines',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'wordcount', 'wordcount some text'); if (!t) return;
      m.reply(`🧮 ${S.scriptLite('Text stats')}\n\n▪️ ${S.small('words')} ❯ ${t.split(/\s+/).filter(Boolean).length}\n▪️ ${S.small('characters')} ❯ ${[...t].length}\n▪️ ${S.small('no spaces')} ❯ ${[...t.replace(/\s/g, '')].length}\n▪️ ${S.small('lines')} ❯ ${t.split('\n').length}`);
    },
  },
  {
    command: ['ebinary'], aliases: ['tobinary'], category: 'text', description: 'Text ➜ binary',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'ebinary', 'ebinary hi'); if (t) m.reply([...Buffer.from(t, 'utf8')].map(b => b.toString(2).padStart(8, '0')).join(' ')); },
  },
  {
    command: ['dbinary'], aliases: ['frombinary'], category: 'text', description: 'Binary ➜ text',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'dbinary', 'dbinary 01101000 01101001'); if (!t) return;
      const bits = t.replace(/[^01]/g, '');
      if (!bits.length || bits.length % 8) return m.reply(S.voice.err('that is not valid 8-bit binary.'));
      m.reply(Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2))).toString('utf8'));
    },
  },
  {
    command: ['b64'], aliases: ['base64'], category: 'text', description: 'Text ➜ Base64',
    handler: async (client, m, { text, prefix }) => { const t = need(m, text, prefix, 'b64', 'b64 hello'); if (t) m.reply(Buffer.from(t, 'utf8').toString('base64')); },
  },
  {
    command: ['unb64'], aliases: ['debase64'], category: 'text', description: 'Base64 ➜ text',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'unb64', 'unb64 aGVsbG8='); if (!t) return;
      if (!/^[A-Za-z0-9+/=\s]+$/.test(t)) return m.reply(S.voice.err('that is not valid Base64.'));
      m.reply(Buffer.from(t, 'base64').toString('utf8'));
    },
  },
  {
    command: ['shorten'], aliases: ['tiny', 'shorturl'], category: 'utility', description: 'Shorten a long link',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'shorten', 'shorten https://example.com/very/long'); if (!t) return;
      if (!/^https?:\/\//i.test(t)) return m.reply(S.voice.err('send a link that starts with http:// or https://'));
      try { const r = await getJson('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(t), { responseType: 'text' }); m.reply(`🔗 ${S.scriptLite('Short link')}\n${r}`); }
      catch (e) { m.reply(S.voice.err('the shortener is not reachable right now.')); }
    },
  },
  {
    command: ['wiki'], aliases: ['wikipedia'], category: 'utility', description: 'Wikipedia summary of any topic',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'wiki', 'wiki Mount Kenya'); if (!t) return;
      try {
        const d = await getJson('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t.replace(/\s+/g, '_')));
        if (!d.extract) throw new Error('none');
        const caption = `📚 *${d.title}*\n${d.description ? '_' + d.description + '_\n' : ''}\n${d.extract.slice(0, 1400)}\n\n🔗 ${d.content_urls?.desktop?.page || ''}`;
        if (d.thumbnail?.source) return client.sendMessage(m.chat, { image: { url: d.thumbnail.source }, caption }, { quoted: m });
        m.reply(caption);
      } catch (e) { m.reply(S.voice.err('no Wikipedia page found for that.')); }
    },
  },
  {
    command: ['pokemon'], aliases: ['poke'], category: 'others', description: 'Look up any Pokémon',
    handler: async (client, m, { text, prefix }) => {
      const t = need(m, text, prefix, 'pokemon', 'pokemon pikachu'); if (!t) return;
      try {
        const d = await getJson('https://pokeapi.co/api/v2/pokemon/' + encodeURIComponent(t.toLowerCase().replace(/\s+/g, '-')));
        const st = Object.fromEntries(d.stats.map(s => [s.stat.name, s.base_stat]));
        const caption = `⚡ *${d.name.toUpperCase()}* #${d.id}\n\n▪️ ${S.small('type')} ❯ ${d.types.map(x => x.type.name).join(', ')}\n▪️ ${S.small('height')} ❯ ${d.height / 10} m\n▪️ ${S.small('weight')} ❯ ${d.weight / 10} kg\n▪️ ${S.small('abilities')} ❯ ${d.abilities.map(x => x.ability.name).join(', ')}\n\n❤️ HP ${st.hp}  ⚔️ ATK ${st.attack}  🛡️ DEF ${st['defense']}\n💨 SPD ${st.speed}  ✨ SP.ATK ${st['special-attack']}`;
        const img = d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default;
        if (img) return client.sendMessage(m.chat, { image: { url: img }, caption }, { quoted: m });
        m.reply(caption);
      } catch (e) { m.reply(S.voice.err('that Pokémon does not exist.')); }
    },
  },
  {
    command: ['time'], aliases: ['worldtime', 'clock'], category: 'utility', description: 'Current time in any timezone (default Nairobi)',
    handler: async (client, m, { text }) => {
      const tz = String(text || '').trim() || 'Africa/Nairobi';
      try {
        const d = new Date();
        const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        m.reply(`🕒 ${S.scriptLite(tz)}\n${fmt.format(d)}`);
      } catch (e) { m.reply(S.voice.err('unknown timezone. Try: Africa/Nairobi, Europe/London, Asia/Tokyo')); }
    },
  },
  {
    command: ['unit'], aliases: ['convertunit'], category: 'utility', description: 'Convert units: .unit 5 km mi (length, mass, data, temperature)',
    handler: async (client, m, { args, prefix }) => {
      const [v, from, to] = (args || []); const x = parseFloat(v);
      if (!Number.isFinite(x) || !from || !to) return m.reply(S.voice.usage(prefix + 'unit 5 km mi', 'works for length, mass, data and c/f/k temperature'));
      const f = from.toLowerCase(), t = to.toLowerCase();
      const temp = { c: v => v, f: v => (v - 32) * 5 / 9, k: v => v - 273.15 };
      const back = { c: v => v, f: v => v * 9 / 5 + 32, k: v => v + 273.15 };
      let out;
      if (temp[f] && back[t] && ['c', 'f', 'k'].includes(f) && ['c', 'f', 'k'].includes(t)) out = back[t](temp[f](x));
      else { for (const grp of Object.values(UNITS)) if (grp[f] && grp[t]) out = x * grp[f] / grp[t]; }
      if (out === undefined) return m.reply(S.voice.err('I cannot convert between those units.'));
      m.reply(`📐 ${x} ${f} ➜ *${Number(out.toFixed(6))}* ${t}`);
    },
  },
];
