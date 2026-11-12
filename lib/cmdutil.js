'use strict';
// shared helpers for the new command packs
const num = j => String(j || '').split('@')[0].split(':')[0];

// who is the command aimed at?  @mention > replied-to message > number typed in the text
function target(m, text = '') {
  const men = m.mentionedJid && m.mentionedJid[0];
  if (men) return men;
  if (m.quoted && m.quoted.sender) return m.quoted.sender;
  const digits = String(text).replace(/\D/g, '');
  if (digits.length >= 8) return digits + '@s.whatsapp.net';
  return null;
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const tag = j => '@' + num(j);
const fmt = n => Number(n).toLocaleString('en-US');

async function getJson(url, opts = {}) {
  const axios = global.axios || require('axios');
  const r = await axios.get(url, { timeout: 15000, ...opts });
  return r.data;
}
module.exports = { num, target, pick, rnd, tag, fmt, getJson };
