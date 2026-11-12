'use strict';
/**
 * SMILEY CYMOR MD — Game Arena + Fun Corner
 * New commands: tictactoe, hangman, trivia, truth, dare, coinflip, dice, eightball, ship, rps,
 *               compliment, flirt, roast, goodnight, roseday, wasted-style fun lines
 */
const S = require('../lib/style');
const { target, pick, rnd, tag, getJson } = require('../lib/cmdutil');

// ─── TIC-TAC-TOE ─────────────────────────────────────────────────────────────
const ttt = new Map(); // chat -> game
const SYM = { X: '❌', O: '⭕' };
const NUMS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = b => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return null; };
const board = g => [0, 1, 2].map(r => [0, 1, 2].map(c => { const i = r * 3 + c; return g.b[i] ? SYM[g.b[i]] : NUMS[i]; }).join('')).join('\n');

// ─── HANGMAN ─────────────────────────────────────────────────────────────────
const WORDS = ['javascript', 'whatsapp', 'keyboard', 'universe', 'database', 'algorithm', 'internet', 'firewall', 'pancake', 'mountain', 'football', 'elephant', 'computer', 'umbrella', 'diamond', 'notebook', 'rainbow', 'galaxy', 'monitor', 'network', 'thunder', 'library', 'lecture', 'calculus', 'function', 'variable', 'compiler', 'nairobi', 'savannah', 'kilimanjaro', 'safari', 'matrix', 'vector', 'integral', 'theorem'];
const hang = new Map();
const STAGES = ['😀', '🙂', '😐', '😕', '😟', '😰', '😵'];
const hmView = g => `${STAGES[g.wrong]} ${S.bold('Hangman')}\n\n${[...g.word].map(c => g.got.has(c) ? c.toUpperCase() : '＿').join(' ')}\n\n❤️ ${S.small('lives')}: ${6 - g.wrong}/6\n🔤 ${S.small('tried')}: ${[...g.tried].join(' ') || '—'}`;

// ─── TRIVIA ──────────────────────────────────────────────────────────────────
const trivia = new Map();
const LOCAL_TRIVIA = [
  { q: 'What is the capital city of Kenya?', a: 'Nairobi', w: ['Mombasa', 'Kisumu', 'Nakuru'] },
  { q: 'Which planet is known as the Red Planet?', a: 'Mars', w: ['Venus', 'Jupiter', 'Mercury'] },
  { q: 'What is 12 × 12?', a: '144', w: ['124', '132', '154'] },
  { q: 'Who wrote "Romeo and Juliet"?', a: 'William Shakespeare', w: ['Charles Dickens', 'Mark Twain', 'Jane Austen'] },
  { q: 'What is the largest ocean on Earth?', a: 'Pacific Ocean', w: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
  { q: 'Which language runs in every web browser?', a: 'JavaScript', w: ['Python', 'C++', 'Java'] },
  { q: 'What is the derivative of x²?', a: '2x', w: ['x', 'x²', '2'] },
];
const decode = s => String(s).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&eacute;/g, 'é').replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…');

// ─── Fun lines ───────────────────────────────────────────────────────────────
const TRUTHS = ['What is the most embarrassing thing you have done in public?', 'Who was your first crush?', 'What is a secret talent nobody knows about?', 'What is the last lie you told?', 'Which app do you waste the most time on?', 'What is the weirdest dream you remember?', 'Have you ever pretended to be sick to skip something?', 'What is the worst gift you ever received?', 'What would you do with a million dollars tomorrow?', 'Who in this chat would you trust with your phone password?', 'What is your biggest fear?', 'What is the silliest thing you are afraid of?'];
const DARES = ['Send a voice note singing the chorus of your favourite song.', 'Change your WhatsApp status to "I love Mondays" for one hour.', 'Text the 5th contact in your list "I just realised something important…" and say nothing else.', 'Speak only in emojis for the next 10 minutes.', 'Send your funniest selfie right now.', 'Do 15 push-ups and send proof.', 'Write a two-line poem about the last person who messaged you.', 'Talk like a pirate for your next 5 messages.', 'Send a voice note laughing for 10 seconds straight.', 'Let the group choose your profile picture for a day.'];
const COMPLIMENTS = ['You light up every chat you walk into. ✨', 'Your brain is the kind of powerful that makes problems nervous. 🧠', 'You have a smile that could fix a bad Monday. 😄', 'Honestly, you are the main character and the best supporting actor. 🌟', 'You make hard things look easy. 💪', 'You are proof that kindness and brilliance can live together. 💛', 'The world is a bit better because you are in it. 🌍', 'Your vibe is premium, no subscription needed. 😎'];
const FLIRTS = ['Are you Wi-Fi? Because I am feeling a strong connection. 📶', 'Do you have a map? I keep getting lost in your messages. 🗺️', 'Is your name Google? Because you have everything I have been searching for. 🔍', 'If you were a keyboard, you would be my favourite key: Enter. ⌨️', 'Are you a charger? Because I feel alive when I am near you. 🔋', 'Do you believe in love at first text? 💌'];
const ROASTS = ['You are the reason the "seen" feature exists. 👀', 'Your Wi-Fi password is probably "password" and it still feels too hard for you. 📶', 'You are like a cloud: when you disappear, it is a beautiful day. ☁️', 'I would roast you, but my mum said not to burn trash. 🗑️', 'You bring everyone together… to talk about how late you are. ⏰', 'You have the energy of a phone at 1% — and no charger in sight. 🔋'];
const NIGHT = ['May your pillow be soft and your dreams be loud. 🌙', 'Close the apps, open your dreams. Goodnight! 😴', 'Tomorrow is a fresh page. Rest well, champion. ✨', 'The stars are tucking you in tonight. Sleep tight! ⭐', 'Charge your body, not just your phone. Goodnight! 🔋'];
const ROSES = ['🌹 A rose for the one who makes ordinary days softer.', '🌹 Roses are red, bots are blue, this little flower is just for you.', '🌹 Some people are like roses — beautiful and worth every thorn.', '🌹 Sending you a bouquet of good vibes today.'];
const BALL = ['It is certain. ✅', 'Without a doubt. ✅', 'You may rely on it. ✅', 'Yes, definitely. ✅', 'Most likely. 👍', 'Signs point to yes. 👍', 'Reply hazy, try again. 🌫️', 'Ask again later. ⏳', 'Better not tell you now. 🤐', 'Cannot predict now. 🔮', "Don't count on it. ❌", 'My sources say no. ❌', 'Very doubtful. ❌'];

const textCmd = (command, cat, desc, build, extra = {}) => ({
  command: [command], category: cat, description: desc,
  handler: async (client, m, ctx) => {
    const out = await build(client, m, ctx);
    if (out) await client.sendMessage(m.chat, typeof out === 'string' ? { text: out } : out, { quoted: m });
  },
  ...extra,
});

module.exports = [
  // ── Tic-Tac-Toe ──
  {
    command: ['tictactoe'], aliases: ['ttt', 'xo'], category: 'games',
    description: 'Challenge someone to Tic-Tac-Toe (tag them), then send 1-9 to play',
    handler: async (client, m, { text, prefix }) => {
      if (!m.isGroup) return m.reply(S.voice.err('Tic-Tac-Toe is played inside groups.'));
      if (/^(end|stop|quit)$/i.test(text || '')) { ttt.delete(m.chat); return m.reply('🏳️ Game closed.'); }
      const foe = target(m, text);
      if (!foe) return m.reply(S.voice.usage(prefix + 'tictactoe @friend', 'tag a friend to start'));
      if (foe === m.sender) return m.reply(S.voice.err('you cannot play yourself.'));
      const g = { b: Array(9).fill(null), X: m.sender, O: foe, turn: 'X', at: Date.now() };
      ttt.set(m.chat, g);
      await client.sendMessage(m.chat, {
        text: `⭕❌ ${S.scriptLite('Tic-Tac-Toe')}\n\n${board(g)}\n\n❌ ${tag(g.X)}\n⭕ ${tag(g.O)}\n\n🎯 ${tag(g.X)} ${S.italic('starts — send a number 1-9')}`,
        mentions: [g.X, g.O],
      }, { quoted: m });
    },
  },
  {
    command: ['tttmove'], hidden: true, category: 'games', description: 'internal',
    noprefix: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    handler: async (client, m, { body }) => {
      const g = ttt.get(m.chat);
      if (!g || !m.isGroup) return;
      if (Date.now() - g.at > 15 * 60 * 1000) { ttt.delete(m.chat); return; }
      if (m.sender !== g[g.turn]) return;
      const i = Number(String(body).trim()) - 1;
      if (g.b[i]) return m.reply('🚫 That square is taken.');
      g.b[i] = g.turn; g.at = Date.now();
      const w = winner(g.b);
      if (w) {
        ttt.delete(m.chat);
        return client.sendMessage(m.chat, { text: `${board(g)}\n\n🏆 ${tag(g[w])} ${S.scriptLite('wins!')}`, mentions: [g[w]] }, { quoted: m });
      }
      if (g.b.every(Boolean)) { ttt.delete(m.chat); return client.sendMessage(m.chat, { text: `${board(g)}\n\n🤝 ${S.scriptLite('Draw!')}` }, { quoted: m }); }
      g.turn = g.turn === 'X' ? 'O' : 'X';
      await client.sendMessage(m.chat, { text: `${board(g)}\n\n🎯 ${tag(g[g.turn])} ${S.italic('your move')} ${SYM[g.turn]}`, mentions: [g[g.turn]] }, { quoted: m });
    },
  },

  // ── Hangman ──
  {
    command: ['hangman'], category: 'games', description: 'Guess the hidden word letter by letter',
    handler: async (client, m, { text, prefix }) => {
      if (/^(end|stop|quit)$/i.test(text || '')) { hang.delete(m.chat); return m.reply('🏳️ Hangman closed.'); }
      if (hang.has(m.chat)) return m.reply(hmView(hang.get(m.chat)) + `\n\n${S.italic('Guess with')} ${prefix}guess <letter>`);
      const g = { word: pick(WORDS), got: new Set(), tried: new Set(), wrong: 0 };
      hang.set(m.chat, g);
      m.reply(hmView(g) + `\n\n${S.italic('Guess with')} ${prefix}guess <letter>`);
    },
  },
  {
    command: ['guess'], category: 'games', description: 'Guess a letter in Hangman (or the answer in Trivia)',
    handler: async (client, m, { text, prefix }) => {
      const g = hang.get(m.chat);
      if (!g) return m.reply(S.voice.err(`no game running — start one with ${prefix}hangman`));
      const l = String(text || '').trim().toLowerCase();
      if (!/^[a-z]$/.test(l)) return m.reply(S.voice.usage(prefix + 'guess a'));
      if (g.tried.has(l)) return m.reply('🔁 You already tried that letter.');
      g.tried.add(l);
      if (g.word.includes(l)) g.got.add(l); else g.wrong++;
      if ([...g.word].every(c => g.got.has(c))) { hang.delete(m.chat); return m.reply(`🏆 ${S.scriptLite('You got it!')} The word was *${g.word.toUpperCase()}*`); }
      if (g.wrong >= 6) { hang.delete(m.chat); return m.reply(`💀 ${S.scriptLite('Game over.')} The word was *${g.word.toUpperCase()}*`); }
      m.reply(hmView(g));
    },
  },

  // ── Trivia ──
  {
    command: ['trivia'], aliases: ['quiz'], category: 'games', description: 'Answer a random trivia question',
    handler: async (client, m, { prefix }) => {
      let q;
      try {
        const d = await getJson('https://opentdb.com/api.php?amount=1&type=multiple');
        const r = d.results[0];
        q = { q: decode(r.question), a: decode(r.correct_answer), w: r.incorrect_answers.map(decode), cat: decode(r.category), diff: r.difficulty };
      } catch (_) { q = { ...pick(LOCAL_TRIVIA), cat: 'General', diff: 'easy' }; }
      const opts = [q.a, ...q.w].sort(() => Math.random() - 0.5);
      const letters = ['A', 'B', 'C', 'D'];
      trivia.set(m.chat, { answer: letters[opts.indexOf(q.a)], text: q.a, at: Date.now() });
      m.reply(`🧩 ${S.scriptLite('Trivia')} · ${S.small(q.cat)} · ${S.small(q.diff)}\n\n*${q.q}*\n\n${opts.map((o, i) => `${letters[i]}) ${o}`).join('\n')}\n\n${S.italic('Reply with')} ${prefix}answer <a/b/c/d>`);
    },
  },
  {
    command: ['answer'], aliases: ['ans'], category: 'games', description: 'Answer the running trivia question',
    handler: async (client, m, { text, prefix }) => {
      const t = trivia.get(m.chat);
      if (!t) return m.reply(S.voice.err(`no question open — try ${prefix}trivia`));
      const a = String(text || '').trim().toUpperCase().charAt(0);
      if (!'ABCD'.includes(a) || !a) return m.reply(S.voice.usage(prefix + 'answer a'));
      trivia.delete(m.chat);
      m.reply(a === t.answer ? `✅ ${S.scriptLite('Correct!')} Nicely done, ${m.pushName || 'champ'}.` : `❌ ${S.scriptLite('Nope.')} The answer was *${t.answer}) ${t.text}*`);
    },
  },

  // ── Quick games ──
  textCmd('coinflip', 'games', 'Flip a coin', () => `🪙 ${S.scriptLite('The coin says')}: *${pick(['HEADS', 'TAILS'])}*`, { aliases: ['flip'] }),
  textCmd('dice', 'games', 'Roll a dice (optional: sides)', (c, m, { text }) => {
    const sides = Math.min(1000, Math.max(2, parseInt(text, 10) || 6));
    return `🎲 ${S.scriptLite('Rolled a d' + sides)}: *${rnd(1, sides)}*`;
  }, { aliases: ['roll'] }),
  textCmd('eightball', 'games', 'Ask the magic 8-ball a question', (c, m, { text, prefix }) => {
    if (!text) return S.voice.usage(prefix + 'eightball will I pass?');
    return `🎱 *${text}*\n\n${pick(BALL)}`;
  }, { aliases: ['8ball'] }),
  {
    command: ['rps'], category: 'games', description: 'Rock, paper, scissors against the bot',
    handler: async (client, m, { text, prefix }) => {
      const map = { rock: '🪨', paper: '📄', scissors: '✂️', r: '🪨', p: '📄', s: '✂️' };
      const full = { r: 'rock', p: 'paper', s: 'scissors' };
      let me = String(text || '').trim().toLowerCase();
      me = full[me] || me;
      if (!['rock', 'paper', 'scissors'].includes(me)) return m.reply(S.voice.usage(prefix + 'rps rock|paper|scissors'));
      const bot = pick(['rock', 'paper', 'scissors']);
      const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const res = me === bot ? '🤝 Draw' : beats[me] === bot ? '🏆 You win' : '😈 I win';
      m.reply(`${map[me]} vs ${map[bot]}\n\n${S.scriptLite(res)}`);
    },
  },
  {
    command: ['ship'], category: 'games', description: 'Check the love score of two people',
    handler: async (client, m, { text, prefix }) => {
      const men = m.mentionedJid || [];
      let a = men.length > 1 ? men[0] : m.sender, b = men.length > 1 ? men[1] : (men[0] || (m.quoted && m.quoted.sender));
      if (!b) return m.reply(S.voice.usage(prefix + 'ship @someone', 'tag one person (you + them) or tag two people'));
      const seed = [a, b].sort().join('|');
      let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 101;
      const bar = '█'.repeat(Math.round(h / 10)) + '░'.repeat(10 - Math.round(h / 10));
      const msg = h > 80 ? 'Soulmates! 💍' : h > 60 ? 'Strong spark 🔥' : h > 40 ? 'Could work 🙂' : h > 20 ? 'Needs effort 😅' : 'Just friends 🫠';
      await client.sendMessage(m.chat, { text: `💘 ${S.scriptLite('Love meter')}\n\n${tag(a)} ✕ ${tag(b)}\n\n[${bar}] *${h}%*\n${msg}`, mentions: [a, b] }, { quoted: m });
    },
  },
  textCmd('truth', 'games', 'Get a truth question', () => `🫢 ${S.scriptLite('Truth')}\n\n${pick(TRUTHS)}`),
  textCmd('dare', 'games', 'Get a dare', () => `😈 ${S.scriptLite('Dare')}\n\n${pick(DARES)}`),

  // ── Fun corner ──
  {
    command: ['compliment'], category: 'others', description: 'Send a compliment to someone (tag them)',
    handler: async (client, m, { text }) => {
      const t = target(m, text);
      await client.sendMessage(m.chat, { text: `${t ? tag(t) + '\n' : ''}💛 ${pick(COMPLIMENTS)}`, mentions: t ? [t] : [] }, { quoted: m });
    },
  },
  {
    command: ['flirt'], category: 'others', description: 'Send a cheesy pickup line to someone',
    handler: async (client, m, { text }) => {
      const t = target(m, text);
      await client.sendMessage(m.chat, { text: `${t ? tag(t) + '\n' : ''}😏 ${pick(FLIRTS)}`, mentions: t ? [t] : [] }, { quoted: m });
    },
  },
  {
    command: ['roast'], category: 'others', description: 'Playfully roast someone (tag them)',
    handler: async (client, m, { text }) => {
      const t = target(m, text);
      await client.sendMessage(m.chat, { text: `${t ? tag(t) + '\n' : ''}🔥 ${pick(ROASTS)}`, mentions: t ? [t] : [] }, { quoted: m });
    },
  },
  textCmd('goodnight', 'others', 'Wish someone a good night', () => `🌙 ${pick(NIGHT)}`, { aliases: ['gn'] }),
  textCmd('roseday', 'others', 'Send a rose', () => pick(ROSES), { aliases: ['rose'] }),
];
