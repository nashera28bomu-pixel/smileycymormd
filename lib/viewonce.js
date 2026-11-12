'use strict';
/**
 * View-once saver for SMILEY CYMOR MD.
 *
 * Triggers (owner only):
 *   1. React to a view-once photo / video / voice note with ANY emoji (❤️ 😍 🔥 …) -> saved to your DM
 *   2. Reply to it with an emoji (see media.js "vv2" list)                         -> saved to your DM
 *   3. .vv (to the chat) / .vv2 (to your DM)
 * No temp files are written: media is downloaded straight to memory.
 */
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const S = require('./style');
const brand = require('../brand');

const CACHE_MAX = 400;
const cache = new Map();           // messageId -> { key, node, type, sender, chat, at }

const unwrap = (msg) => {
  let cur = msg;
  for (let i = 0; i < 6 && cur; i++) {
    const next = cur.ephemeralMessage?.message || cur.viewOnceMessageV2?.message || cur.viewOnceMessageV2Extension?.message ||
      cur.viewOnceMessage?.message || cur.documentWithCaptionMessage?.message;
    if (!next) break;
    cur = next;
  }
  return cur || {};
};

// returns { type, node } for a view-once image/video/audio, otherwise null
function findViewOnce(message) {
  if (!message) return null;
  const wrapped = !!(message.viewOnceMessageV2 || message.viewOnceMessageV2Extension || message.viewOnceMessage ||
    message.ephemeralMessage?.message?.viewOnceMessageV2 || message.ephemeralMessage?.message?.viewOnceMessage);
  const inner = unwrap(message);
  for (const type of ['imageMessage', 'videoMessage', 'audioMessage']) {
    const node = inner[type];
    if (node && (wrapped || node.viewOnce)) return { type, node };
  }
  return null;
}

// call for every incoming message: remembers view-once media so a later reaction can find it
function remember(mek) {
  try {
    const found = findViewOnce(mek.message);
    if (!found || !mek.key?.id) return;
    cache.set(mek.key.id, {
      key: mek.key, ...found,
      sender: jidNormalizedUser(mek.key.participant || mek.key.remoteJid || ''),
      chat: mek.key.remoteJid, name: mek.pushName || '', at: Date.now(),
    });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  } catch (_) {}
}

async function download(client, type, node) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return downloadMediaMessage({ message: { [type]: node } }, 'buffer', {}, { reuploadRequest: client.updateMediaMessage, logger: console });
}

/** download + send one view-once item to `jid`. returns true if something was sent */
async function deliver(client, jid, found, info = {}, quoted) {
  const { type, node } = found;
  const buffer = await download(client, type, node);
  const who = info.sender ? `@${String(info.sender).split('@')[0]}` : '';
  const where = info.chat && String(info.chat).endsWith('@g.us') ? 'group' : 'DM';
  const cap = [
    S.voice.vvSaved(),
    who ? `👤 ${S.small('from')} ${who} ${S.tiny('(' + where + ')')}` : '',
    node.caption ? `💬 ${node.caption}` : '',
  ].filter(Boolean).join('\n');
  const mentions = info.sender ? [info.sender] : [];
  const opt = quoted ? { quoted } : {};
  if (type === 'imageMessage') await client.sendMessage(jid, { image: buffer, caption: cap, mentions }, opt);
  else if (type === 'videoMessage') await client.sendMessage(jid, { video: buffer, mimetype: node.mimetype || 'video/mp4', caption: cap, mentions }, opt);
  else {
    await client.sendMessage(jid, { text: cap, mentions }, opt);
    await client.sendMessage(jid, { audio: buffer, mimetype: node.mimetype || 'audio/ogg; codecs=opus', ptt: !!node.ptt }, opt);
  }
  return true;
}

const ownerNumbers = () => {
  try { return require('../set').owner.map(n => n.replace(/\D/g, '')); } catch { return [brand.ownerNumber]; }
};

/**
 * Hook for messages.upsert — handles "react to a view-once with an emoji".
 * Returns true if the event was a reaction (so the caller can skip further processing).
 */
async function handleReaction(client, mek, store) {
  const r = mek.message?.reactionMessage;
  if (!r) return false;
  try {
    if (!r.text) return true;                              // reaction removed
    const me = jidNormalizedUser(client.user.id);
    const reactor = mek.key.fromMe ? me : jidNormalizedUser(mek.key.participant || mek.key.remoteJid || '');
    const isOwner = mek.key.fromMe || ownerNumbers().includes(reactor.split('@')[0]);
    if (!isOwner) return true;

    const id = r.key?.id;
    let found = null, info = {};
    const hit = cache.get(id);
    if (hit) { found = { type: hit.type, node: hit.node }; info = hit; }
    else if (store && r.key?.remoteJid) {
      const stored = store.loadMessage(r.key.remoteJid, id);
      const f = stored && findViewOnce(stored.message);
      if (f) { found = f; info = { sender: stored.key?.participant || stored.key?.remoteJid, chat: stored.key?.remoteJid }; }
    }
    if (!found) return true;
    await deliver(client, mek.key.fromMe ? me : reactor, found, info);
  } catch (e) {
    console.error('[viewonce] react-save failed:', e.message);
  }
  return true;
}

// used by .vv / .vv2 / emoji-reply: quotedMessage is the proto of the quoted message
async function saveQuoted(client, m, jid, quotedMessage, quoted) {
  const found = findViewOnce(quotedMessage) || (() => {
    const inner = unwrap(quotedMessage);
    for (const type of ['imageMessage', 'videoMessage', 'audioMessage']) if (inner[type]) return { type, node: inner[type] };
    return null;
  })();
  if (!found) return false;
  const ctxInfo = m.msg?.contextInfo || {};
  return deliver(client, jid, found, { sender: ctxInfo.participant, chat: m.chat }, quoted);
}

module.exports = { remember, handleReaction, saveQuoted, findViewOnce };
