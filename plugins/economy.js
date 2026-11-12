'use strict';
/**
 * SMILEY CYMOR MD — Cymor Bank (virtual coins, just for fun)
 * New commands: wallet, daily, work, deposit, withdraw, gamble, slot, rob, transfer, richlist, resetwallet
 */
const S = require('../lib/style');
const db = require('../lib/jsondb');
const { target, pick, rnd, tag, fmt, num } = require('../lib/cmdutil');

const COIN = '🪙';
const acct = (jid) => {
  const d = db.load('economy');
  const k = num(jid);
  if (!d[k]) d[k] = { wallet: 100, bank: 0, daily: 0, work: 0, rob: 0 };
  return d[k];
};
const save = () => db.save('economy');
const left = (ms) => { const s = Math.ceil(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h ? h + 'h ' : ''}${m}m ${s % 60}s`; };
const amountOf = (text, max) => {
  const t = String(text || '').trim().toLowerCase().split(/\s+/).pop();
  if (t === 'all') return max;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : NaN;
};

const JOBS = ['fixed a stubborn Wi-Fi router', 'debugged someone else\'s code', 'delivered pizzas on a rainy day', 'tutored a maths class', 'designed a logo overnight', 'sold mandazi at the bus stop', 'repaired a cracked phone screen', 'moderated a lively WhatsApp group'];

module.exports = [
  {
    command: ['wallet'], aliases: ['balance', 'bal'], category: 'economy', description: 'See your coins (or someone else\'s)',
    handler: async (client, m, { text }) => {
      const t = target(m, text) || m.sender;
      const a = acct(t);
      await client.sendMessage(m.chat, {
        text: `╭━━❰ 💰 ${S.scriptLite('Cymor Bank')} ❱━━╮\n┃ 👤 ${tag(t)}\n┃ ${COIN} ${S.small('wallet')}  ❯ ${fmt(a.wallet)}\n┃ 🏦 ${S.small('bank')}    ❯ ${fmt(a.bank)}\n┃ 💎 ${S.small('total')}   ❯ ${fmt(a.wallet + a.bank)}\n╰━━━━━━━━━━━━━━━━━━━╯`,
        mentions: [t],
      }, { quoted: m });
      save();
    },
  },
  {
    command: ['daily'], category: 'economy', description: 'Claim your daily coins',
    handler: async (client, m) => {
      const a = acct(m.sender), now = Date.now(), wait = 24 * 3600 * 1000;
      if (now - a.daily < wait) return m.reply(`⏳ ${S.italic('Come back in')} *${left(wait - (now - a.daily))}*`);
      const gain = rnd(300, 700); a.wallet += gain; a.daily = now; save();
      m.reply(`🎁 ${S.scriptLite('Daily reward')}: +${fmt(gain)} ${COIN}\n${S.small('wallet')}: ${fmt(a.wallet)}`);
    },
  },
  {
    command: ['work'], category: 'economy', description: 'Do a quick job for coins (every 30 min)',
    handler: async (client, m) => {
      const a = acct(m.sender), now = Date.now(), wait = 30 * 60 * 1000;
      if (now - a.work < wait) return m.reply(`⏳ ${S.italic('You are tired. Rest for')} *${left(wait - (now - a.work))}*`);
      const gain = rnd(80, 250); a.wallet += gain; a.work = now; save();
      m.reply(`🛠️ You ${pick(JOBS)} and earned *${fmt(gain)}* ${COIN}`);
    },
  },
  {
    command: ['deposit'], aliases: ['dep'], category: 'economy', description: 'Move coins from wallet to bank',
    handler: async (client, m, { text, prefix }) => {
      const a = acct(m.sender); const n = amountOf(text, a.wallet);
      if (!(n > 0)) return m.reply(S.voice.usage(prefix + 'deposit 500', 'or: ' + prefix + 'deposit all'));
      if (n > a.wallet) return m.reply(S.voice.err('you do not have that much in your wallet.'));
      a.wallet -= n; a.bank += n; save();
      m.reply(`🏦 ${S.scriptLite('Deposited')} ${fmt(n)} ${COIN}`);
    },
  },
  {
    command: ['withdraw'], aliases: ['wd'], category: 'economy', description: 'Take coins out of the bank',
    handler: async (client, m, { text, prefix }) => {
      const a = acct(m.sender); const n = amountOf(text, a.bank);
      if (!(n > 0)) return m.reply(S.voice.usage(prefix + 'withdraw 500', 'or: ' + prefix + 'withdraw all'));
      if (n > a.bank) return m.reply(S.voice.err('your bank does not hold that much.'));
      a.bank -= n; a.wallet += n; save();
      m.reply(`💸 ${S.scriptLite('Withdrew')} ${fmt(n)} ${COIN}`);
    },
  },
  {
    command: ['gamble'], aliases: ['bet'], category: 'economy', description: 'Bet coins — win double or lose it all',
    handler: async (client, m, { text, prefix }) => {
      const a = acct(m.sender); const n = amountOf(text, a.wallet);
      if (!(n > 0)) return m.reply(S.voice.usage(prefix + 'gamble 200'));
      if (n > a.wallet) return m.reply(S.voice.err('not enough coins in your wallet.'));
      const win = Math.random() < 0.45;
      a.wallet += win ? n : -n; save();
      m.reply(win ? `🎰 ${S.scriptLite('You won')} +${fmt(n)} ${COIN}\n${S.small('wallet')}: ${fmt(a.wallet)}` : `💥 ${S.scriptLite('You lost')} ${fmt(n)} ${COIN}\n${S.small('wallet')}: ${fmt(a.wallet)}`);
    },
  },
  {
    command: ['slot'], aliases: ['slots'], category: 'economy', description: 'Spin the slot machine',
    handler: async (client, m, { text, prefix }) => {
      const a = acct(m.sender); const n = amountOf(text, a.wallet);
      if (!(n > 0)) return m.reply(S.voice.usage(prefix + 'slot 100'));
      if (n > a.wallet) return m.reply(S.voice.err('not enough coins in your wallet.'));
      const sy = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎', '7️⃣'];
      const r = [pick(sy), pick(sy), pick(sy)];
      let mult = 0;
      if (r[0] === r[1] && r[1] === r[2]) mult = r[0] === '7️⃣' ? 10 : r[0] === '💎' ? 6 : 4;
      else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) mult = 1.5;
      const delta = mult ? Math.floor(n * mult) - n : -n;
      a.wallet += delta; save();
      m.reply(`🎰 ┃ ${r.join(' ┃ ')} ┃\n\n${mult ? `🏆 ${S.scriptLite('Win')} x${mult} (+${fmt(delta)} ${COIN})` : `💔 ${S.scriptLite('No luck')} (-${fmt(n)} ${COIN})`}\n${S.small('wallet')}: ${fmt(a.wallet)}`);
    },
  },
  {
    command: ['rob'], category: 'economy', description: 'Try to snatch coins from someone (risky!)',
    handler: async (client, m, { text, prefix }) => {
      const t = target(m, text);
      if (!t) return m.reply(S.voice.usage(prefix + 'rob @user'));
      if (num(t) === num(m.sender)) return m.reply(S.voice.err('you cannot rob yourself.'));
      const a = acct(m.sender), v = acct(t), now = Date.now(), wait = 60 * 60 * 1000;
      if (now - a.rob < wait) return m.reply(`🚔 ${S.italic('Lay low for')} *${left(wait - (now - a.rob))}*`);
      if (v.wallet < 100) return m.reply('🫥 That person has almost nothing in their wallet.');
      if (a.wallet < 100) return m.reply('🫥 You need at least 100 coins in your wallet to try a robbery.');
      a.rob = now;
      if (Math.random() < 0.4) {
        const take = Math.min(v.wallet, rnd(50, Math.floor(v.wallet * 0.4) + 50));
        v.wallet -= take; a.wallet += take; save();
        return client.sendMessage(m.chat, { text: `🦹 ${S.scriptLite('Success!')} You grabbed *${fmt(take)}* ${COIN} from ${tag(t)}`, mentions: [t] }, { quoted: m });
      }
      const fine = rnd(50, 150); a.wallet = Math.max(0, a.wallet - fine); save();
      m.reply(`🚨 ${S.scriptLite('Busted!')} You paid a fine of *${fmt(fine)}* ${COIN}`);
    },
  },
  {
    command: ['transfer'], aliases: ['give', 'pay'], category: 'economy', description: 'Send coins to someone',
    handler: async (client, m, { text, prefix }) => {
      const t = target(m, text);
      const a = acct(m.sender); const n = amountOf(String(text || '').replace(/@\d+/g, ''), a.wallet);
      if (!t || !(n > 0)) return m.reply(S.voice.usage(prefix + 'transfer @user 250'));
      if (num(t) === num(m.sender)) return m.reply(S.voice.err('you cannot pay yourself.'));
      if (n > a.wallet) return m.reply(S.voice.err('not enough coins in your wallet.'));
      const v = acct(t); a.wallet -= n; v.wallet += n; save();
      await client.sendMessage(m.chat, { text: `📤 ${S.scriptLite('Sent')} *${fmt(n)}* ${COIN} to ${tag(t)}`, mentions: [t] }, { quoted: m });
    },
  },
  {
    command: ['richlist'], aliases: ['lb', 'toprich'], category: 'economy', description: 'Top 10 richest users',
    handler: async (client, m) => {
      const d = db.load('economy');
      const top = Object.entries(d).map(([k, v]) => [k, v.wallet + v.bank]).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!top.length) return m.reply('🫥 Nobody has opened a wallet yet.');
      const medals = ['🥇', '🥈', '🥉'];
      const jids = top.map(([k]) => k + '@s.whatsapp.net');
      await client.sendMessage(m.chat, {
        text: `🏆 ${S.scriptLite('Richest in Cymor Bank')}\n\n${top.map(([k, v], i) => `${medals[i] || '▪️'} @${k} — ${fmt(v)} ${COIN}`).join('\n')}`,
        mentions: jids,
      }, { quoted: m });
    },
  },
  {
    command: ['resetwallet'], category: 'economy', description: 'Owner: reset someone\'s coins',
    handler: async (client, m, { text, Owner, NotOwner }) => {
      if (!Owner) return m.reply(NotOwner);
      const t = target(m, text);
      if (!t) return m.reply(S.voice.usage('resetwallet @user'));
      const d = db.load('economy'); delete d[num(t)]; save();
      m.reply('♻️ Wallet reset.');
    },
  },
];
