'use strict';
/**
 * SMILEY CYMOR MD — font + voice toolkit.
 * Every reply the bot sends can use these so it has its own look.
 */

const map = (str, up, low, dig) => [...String(str)].map(c => {
  const k = c.charCodeAt(0);
  if (k >= 65 && k <= 90 && up) return String.fromCodePoint(up + k - 65);
  if (k >= 97 && k <= 122 && low) return String.fromCodePoint(low + k - 97);
  if (k >= 48 && k <= 57 && dig) return String.fromCodePoint(dig + k - 48);
  return c;
}).join('');

// script / bold-script have a few holes in Unicode, patch them
const SCRIPT_HOLES = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' };
const DOUBLE_HOLES = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' };
const SMALLCAPS = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };

const F = {
  bold:       s => map(s, 0x1D5D4, 0x1D5EE, 0x1D7EC),   // 𝗕𝗼𝗹𝗱
  serifBold:  s => map(s, 0x1D400, 0x1D41A, 0x1D7CE),   // 𝐁𝐨𝐥𝐝
  italic:     s => map(s, 0x1D608, 0x1D622, 0),         // 𝘐𝘵𝘢𝘭𝘪𝘤
  boldItalic: s => map(s, 0x1D63C, 0x1D656, 0),         // 𝘽𝙞
  script:     s => [...map(s, 0x1D4D0, 0x1D4EA, 0)].join(''),            // 𝓢𝓬𝓻𝓲𝓹𝓽
  scriptLite: s => [...String(s)].map(c => SCRIPT_HOLES[c] || map(c, 0x1D49C, 0x1D4B6, 0)).join(''), // 𝒮𝒸𝓇𝒾𝓅𝓉
  gothic:     s => map(s, 0x1D56C, 0x1D586, 0),         // 𝕭𝖑𝖆𝖈𝖐
  double:     s => [...String(s)].map(c => DOUBLE_HOLES[c] || map(c, 0x1D538, 0x1D552, 0x1D7D8)).join(''), // 𝔻𝕠𝕦𝕓𝕝𝕖
  mono:       s => map(s, 0x1D670, 0x1D68A, 0x1D7F6),   // 𝙼𝚘𝚗𝚘
  small:      s => [...String(s).toLowerCase()].map(c => SMALLCAPS[c] || c).join(''), // ꜱᴍᴀʟʟ ᴄᴀᴘꜱ
  wide:       s => [...String(s)].map(c => { const k = c.charCodeAt(0); return k > 32 && k < 127 ? String.fromCodePoint(k + 0xFEE0) : (k === 32 ? '　' : c); }).join(''),
  bubble:     s => [...String(s)].map(c => { const k = c.charCodeAt(0); if (k >= 65 && k <= 90) return String.fromCodePoint(0x24B6 + k - 65); if (k >= 97 && k <= 122) return String.fromCodePoint(0x24D0 + k - 97); if (k >= 49 && k <= 57) return String.fromCodePoint(0x2460 + k - 49); return c; }).join(''),
  upside:     s => { const m = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' }; return [...String(s).toLowerCase()].map(c => m[c] || c).reverse().join(''); },
  tiny:       s => { const m = { a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', q: 'q', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ' }; return [...String(s).toLowerCase()].map(c => m[c] || c).join(''); },
  strike:     s => [...String(s)].map(c => c + '̶').join(''),
  under:      s => [...String(s)].map(c => c + '̲').join(''),
};

// every style, for the .fancy command
const ALL_STYLES = ['bold', 'serifBold', 'italic', 'boldItalic', 'script', 'scriptLite', 'gothic', 'double', 'mono', 'small', 'wide', 'bubble', 'tiny', 'upside', 'strike', 'under'];

/**
 * SMILEY CYMOR MD "voice": the signature lines and stock phrases.
 * Nothing here says "retrieved / downloaded by / powered by" in the old style.
 */
const BRAND = 'ꜱᴍɪʟᴇʏ ᴄʏᴍᴏʀ ᴍᴅ';
const voice = {
  brand: BRAND,
  sig: (verb = 'crafted') => `╰➤ ${F.scriptLite(verb)} ${F.small('by')} ${BRAND} ⚡`,
  saved:      () => `✦ ${F.scriptLite('Snagged')} ${F.small('for you by')} ${BRAND}`,
  fetched:    () => `✦ ${F.scriptLite('Delivered')} ${F.small('by')} ${BRAND}`,
  made:       () => `✦ ${F.scriptLite('Cooked up')} ${F.small('by')} ${BRAND}`,
  converted:  () => `✦ ${F.scriptLite('Reshaped')} ${F.small('by')} ${BRAND}`,
  edited:     () => `✦ ${F.scriptLite('Polished')} ${F.small('by')} ${BRAND}`,
  vvSaved:    () => `🫣 ${F.scriptLite('Unlocked')} ${F.small('by')} ${BRAND}`,
  err:        (msg = '') => `⚠️ ${F.scriptLite('Oops')}${msg ? ' — ' + msg : ''}`,
  wait:       (what = 'that') => `⏳ ${F.italic('Working on ' + what + '…')}`,
  usage:      (cmd, example) => `ℹ️ ${F.bold('Usage')} ➜ ${cmd}${example ? `\n💡 ${F.italic('Example')} ➜ ${example}` : ''}`,
  ok:         (msg) => `✅ ${msg}`,
};

module.exports = { ...F, F, ALL_STYLES, voice, map };
