'use strict';
const __V = require('../lib/style').voice;

const axios = global.axios || require('axios');
const fetch = require('node-fetch');
const yts = require('yt-search');
const _fs = require('fs');
const _os = require('os');
const _path = require('path');
const { spawn: _spawn, execFileSync: _execFileSync } = require('child_process');

// ─── Shared helpers (multi-provider fallbacks) ───────────────────────────

// Walk any API response and pull out media URLs, so a change in the
// provider's JSON shape doesn't silently break the command.
function collectMedia(node, out = []) {
  if (!node) return out;
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) { node.forEach(n => collectMedia(n, out)); return out; }
  if (typeof node === 'object') {
    for (const k of ['url', 'download_url', 'downloadUrl', 'video', 'hd', 'sd', 'image', 'play', 'hdplay', 'nowm', 'media', 'result', 'download', 'link']) {
      if (node[k]) collectMedia(node[k], out);
    }
    for (const k of Object.keys(node)) {
      if (typeof node[k] === 'object') collectMedia(node[k], out);
    }
  }
  return out;
}

async function getJson(url, timeout = 30000) {
  const res = await axios.get(url, {
    timeout,
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' }
  });
  return res.data;
}

// TikTok: returns { videoUrl, images[], title } or null
async function fetchTikTok(link) {
  const enc = encodeURIComponent(link);

  // Provider 1: tikwm (most stable, no key)
  try {
    const d = await getJson(`https://www.tikwm.com/api/?url=${enc}&hd=1`);
    if (d?.code === 0 && d.data) {
      const base = (u) => (u && u.startsWith('http') ? u : u ? `https://www.tikwm.com${u}` : null);
      return {
        videoUrl: base(d.data.hdplay || d.data.play),
        images: Array.isArray(d.data.images) ? d.data.images : [],
        title: d.data.title || ''
      };
    }
  } catch (_) {}

  // Provider 2: bk9
  try {
    const d = await getJson(`https://api.bk9.dev/download/tiktok?url=${enc}`);
    if (d?.status && d.BK9) {
      const urls = collectMedia(d.BK9).filter(u => /\.(mp4)|video|tikcdn|tiktokcdn|play/i.test(u));
      const any = urls[0] || collectMedia(d.BK9)[0];
      if (any) return { videoUrl: any, images: [], title: d.BK9.title || '' };
    }
  } catch (_) {}

  // Provider 3: ruhend-scraper (if installed)
  try {
    const { ttdl } = require('ruhend-scraper');
    const d = await ttdl(link);
    if (d?.video) return { videoUrl: d.video, images: [], title: d.title || '' };
  } catch (_) {}

  return null;
}

// ─── Instagram ───────────────────────────────────────────────────────────

// Strip tracking junk (?igsh=..., ?vrfl=..., #...) that makes scrapers fail
function cleanInstagramUrl(link) {
  try {
    const u = new URL(link);
    return `${u.origin}${u.pathname}`.replace(/\/?$/, '/');
  } catch { return link; }
}

const igLooksVideo = (u) => /\.mp4(\?|$)|video/i.test(u) && !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u);
const igMediaKey = (u) => { try { return new URL(u).pathname; } catch { return u; } };

// Last-resort provider: Instagram's own public embed page (no third party)
async function scrapeInstagramEmbed(clean) {
  const mm = clean.match(/instagram\.com\/(?:[^\/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!mm) throw new Error('no shortcode in link');
  const kind = mm[1].toLowerCase() === 'reels' ? 'reel' : mm[1].toLowerCase();
  const res = await axios.get(`https://www.instagram.com/${kind}/${mm[2]}/embed/captioned/`, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = String(res.data);
  const unescape = (s) => s.replace(/\\+u0026/g, '&').replace(/\\+\//g, '/').replace(/&amp;/g, '&');
  const vid = html.match(/video_url\\*"\s*:\s*\\*"(.+?)\\*"/);
  if (vid) return [{ url: unescape(vid[1]), isVideo: true }];
  const img = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/);
  if (img) return [{ url: unescape(img[1]), isVideo: false }];
  throw new Error('nothing found in embed page');
}

// Instagram: returns array of { url, isVideo } or []
async function fetchInstagram(link, api) {
  const clean = cleanInstagramUrl(link);
  const enc = encodeURIComponent(clean);
  const isReel = /\/(reel|reels|tv)\//i.test(clean);

  // Generic API provider: pulls media links out of whatever JSON shape comes back
  const fromApi = (url, ok, timeout = 25000) => async () => {
    const d = await getJson(url, timeout);
    if (ok && !ok(d)) throw new Error('unsuccessful response');
    const urls = [...new Set(collectMedia(d))].filter(u => !/^https?:\/\/(www\.)?instagram\.com\//i.test(u));
    if (!urls.length) {
      let peek = ''; try { peek = JSON.stringify(d).replace(/https?:\/\/\S+?(?=["\\])/g, 'URL').slice(0, 70); } catch {}
      throw new Error(`no media in response ${peek}`);
    }
    return urls.map(u => ({ url: u, isVideo: igLooksVideo(u) }));
  };

  const providers = [];
  const names = [];
  const add = (name, fn) => { names.push(name); providers.push(fn); };

  // ruhend-scraper (same one .insta2 uses)
  add('ruhend', async () => {
    const { igdl } = require('ruhend-scraper');
    const d = await igdl(clean);
    const items = (d?.data || []).filter(x => x?.url).map(x => ({ url: x.url, isVideo: x.type ? x.type === 'video' : igLooksVideo(x.url) }));
    if (!items.length) throw new Error('no media');
    return items;
  });

  // The bot's own API base (the one that already serves your YouTube/FB/Pinterest commands)
  if (api) {
    add('api/instagramdl', fromApi(`${api}/download/instagramdl?url=${enc}`, null, 100000));
    add('api/instadl', fromApi(`${api}/download/instadl?url=${enc}`, null, 60000));
  }

  add('bk9-1', fromApi(`https://api.bk9.dev/download/instagram?url=${enc}`, d => d?.status && d.BK9));
  add('bk9-2', fromApi(`https://api.bk9.dev/download/instagram2?url=${enc}`, d => d?.status && d.BK9));
  add('embed', () => scrapeInstagramEmbed(clean));

  // Run all at once; first one that returns real media wins
  fetchInstagram.lastErrors = [];
  const attempts = providers.map((p, i) => p()
    .then(items => {
      if (isReel && !items.some(x => x.isVideo)) throw new Error('only a thumbnail returned for a reel');
      return items;
    })
    .catch(e => {
      const why = e?.response?.status ? `HTTP ${e.response.status}` : (e?.code || e?.message || 'error');
      console.error(`[ig] ${names[i]} failed: ${why}`);
      fetchInstagram.lastErrors.push(`${names[i]}: ${String(why).slice(0, 60)}`);
      throw e;
    }));

  let items;
  try { items = await Promise.any(attempts); } catch { return []; }

  // Remove duplicates; reels/IGTV are a single video
  const seen = new Set();
  items = items.filter(x => { const k = igMediaKey(x.url); if (seen.has(k)) return false; seen.add(k); return true; });
  if (isReel) return [items.find(x => x.isVideo)];
  return items;
}

// ─── YouTube audio (multi-source, verified) ──────────────────────────────

const IMG_EXT = /\.(jpe?g|png|webp|gif|svg)(\?|$)/i;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Work out what a downloaded file really is
function sniff(buf) {
  const head = buf.slice(0, 16);
  const txt = head.toString('latin1');
  if (txt.trimStart()[0] === '<') return { kind: 'html' };
  if (txt.trimStart()[0] === '{' || txt.trimStart()[0] === '[') return { kind: 'json' };
  if (txt.startsWith('ID3') || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0)) return { kind: 'audio', mimetype: 'audio/mpeg', ext: 'mp3' };
  if (txt.slice(4, 8) === 'ftyp') return { kind: 'audio', mimetype: 'audio/mp4', ext: 'm4a' };
  if (txt.startsWith('OggS')) return { kind: 'audio', mimetype: 'audio/ogg; codecs=opus', ext: 'ogg' };
  if (txt.startsWith('RIFF') || txt.startsWith('fLaC')) return { kind: 'audio', mimetype: 'audio/mpeg', ext: 'mp3' };
  return { kind: 'unknown' };
}

// A real song is megabytes of audio. Reject error pages, JSON and tiny stub files.
// The error text says exactly what was received so it can be diagnosed from chat.
function checkAudio(buf, contentType = '') {
  const kb = Math.round((buf ? buf.length : 0) / 1024);
  const ct = String(contentType).split(';')[0] || '?';
  if (!buf || !buf.length) throw new Error('empty file');
  const info = sniff(buf);
  if (info.kind === 'html') {
    const body = buf.slice(0, 20000).toString('utf8');
    const title = (body.match(/<title[^>]*>([^<]{1,60})/i) || [])[1];
    throw new Error(`${kb}KB web page, not audio${title ? ` ("${title.trim()}")` : ''}`);
  }
  if (info.kind === 'json') {
    const peek = buf.slice(0, 60).toString('utf8').replace(/\s+/g, ' ').replace(/https?:\/\/\S+/g, 'URL');
    throw new Error(`${kb}KB json, not audio: ${peek}`);
  }
  if (info.kind === 'unknown') throw new Error(`${kb}KB unknown type (${ct})`);
  if (buf.length < 150 * 1024) {
    const e = new Error(`${kb}KB audio stub (${ct}) - too short`);
    e.small = true;
    throw e;
  }
  return { mimetype: info.mimetype, ext: info.ext };
}

// ── yt-dlp: runs on the bot's own server, no third-party API needed ──────
const YTDLP_URLS = {
  'linux-x64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
  'linux-arm64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64'
};
let ytdlpBin = null;
let ytdlpFailedAt = 0;
let ytdlpInstalling = null;

function ytdlpWorks(bin) {
  try { _execFileSync(bin, ['--version'], { timeout: 20000, stdio: 'pipe' }); return true; } catch { return false; }
}

async function ensureYtDlp() {
  if (ytdlpBin) return ytdlpBin;
  if (Date.now() - ytdlpFailedAt < 30 * 60 * 1000) throw new Error('yt-dlp unavailable (tried recently)');
  if (!ytdlpInstalling) {
    ytdlpInstalling = (async () => {
      const candidates = [process.env.YTDLP_PATH, 'yt-dlp', _path.join(_os.tmpdir(), 'yt-dlp_bin')].filter(Boolean);
      for (const c of candidates) if (ytdlpWorks(c)) return c;
      const url = YTDLP_URLS[`${process.platform}-${process.arch}`];
      if (!url) throw new Error(`yt-dlp not installed (${process.platform}-${process.arch})`);
      const dest = _path.join(_os.tmpdir(), 'yt-dlp_bin');
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 180000, maxContentLength: 120 * 1024 * 1024 });
      _fs.writeFileSync(dest, Buffer.from(res.data), { mode: 0o755 });
      if (!ytdlpWorks(dest)) throw new Error('downloaded yt-dlp will not run here');
      return dest;
    })().finally(() => { ytdlpInstalling = null; });
  }
  try { ytdlpBin = await ytdlpInstalling; return ytdlpBin; }
  catch (e) { ytdlpFailedAt = Date.now(); throw e; }
}

function runYtDlp(bin, watchUrl, fmt = 'bestaudio[ext=m4a]/bestaudio', maxMb = 60) {
  return new Promise((resolve, reject) => {
    const MAX = maxMb * 1024 * 1024;
    const child = _spawn(bin, ['-f', fmt, '--no-playlist', '--no-warnings', '--no-progress', '--max-filesize', `${maxMb}M`, '-o', '-', watchUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = []; let size = 0; let err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('yt-dlp timed out')); }, 150000);
    child.stdout.on('data', d => { size += d.length; if (size > MAX) { child.kill('SIGKILL'); } else chunks.push(d); });
    child.stderr.on('data', d => { err = (err + d.toString()).slice(-400); });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && size <= MAX) return resolve(Buffer.concat(chunks));
      const line = err.split('\n').map(x => x.trim()).filter(Boolean).pop() || `exit ${code}`;
      reject(new Error(line.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/i, '').slice(0, 90)));
    });
  });
}

// ── RapidAPI "youtube-mp36": set RAPIDAPI_KEY to enable ───────────────────
async function rapidApiLink(videoId) {
  for (let i = 0; i < 6; i++) {
    const res = await axios.get(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
      timeout: 30000,
      headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com' }
    });
    const d = res.data;
    if (d?.status === 'ok' && d.link) return { url: d.link, title: d.title || null };
    if (d?.status === 'processing') { await wait(3000); continue; }
    throw new Error(`rapidapi: ${String(d?.msg || d?.status || 'no link').slice(0, 60)}`);
  }
  throw new Error('rapidapi: still processing');
}

// Returns { buffer, mimetype, ext, title, source } or null (reasons in fetchYtAudio.lastErrors)
async function fetchYtAudio(videoUrl, api) {
  const enc = encodeURIComponent(videoUrl);
  const videoId = (String(videoUrl).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/) || [])[1];
  const names = [];
  const jobs = [];
  // each job returns a link ({url,title}) or a ready Buffer ({buffer})
  const add = (name, fn) => { names.push(name); jobs.push(fn); };
  const viaApi = (url, timeout = 60000) => async () => {
    const d = await getJson(url, timeout);
    let urls = [...new Set(collectMedia(d))].filter(u => !/youtube\.com|youtu\.be|ytimg\.com/i.test(u) && !IMG_EXT.test(u));
    urls.sort((x, y) => (/mp3|audio|download|dl|\.m4a/i.test(y) ? 1 : 0) - (/mp3|audio|download|dl|\.m4a/i.test(x) ? 1 : 0));
    if (!urls.length) {
      let peek = ''; try { peek = JSON.stringify(d).replace(/https?:\/\/\S+?(?=["\\])/g, 'URL').slice(0, 50); } catch {}
      throw new Error(`no link in reply ${peek}`);
    }
    return { url: urls[0], title: d?.title || d?.result?.title || d?.data?.title || null };
  };

  if (videoId) add('yt-dlp', async () => ({ buffer: await runYtDlp(await ensureYtDlp(), `https://www.youtube.com/watch?v=${videoId}`) }));
  if (videoId && process.env.RAPIDAPI_KEY) add('rapidapi', () => rapidApiLink(videoId));
  if (api) add('api/audio', viaApi(`${api}/download/audio?url=${enc}`, 90000));
  add('xcasper', viaApi(`https://apis.xcasper.space/api/downloader/ytmp3?url=${enc}`, 90000));
  add('gifted', viaApi(`https://mcow.giftedtechnexus.workers.dev/api/yta?url=${enc}`));

  const download = async (u) => axios.get(u, {
    responseType: 'arraybuffer', timeout: 120000, maxContentLength: 100 * 1024 * 1024,
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: '*/*' }
  });

  fetchYtAudio.lastErrors = [];
  const attempts = jobs.map(async (job, i) => {
    try {
      const got = await job();
      if (got.buffer) return { buffer: got.buffer, ...checkAudio(got.buffer, 'audio'), title: null, source: names[i] };
      let res = await download(got.url);
      let buffer = Buffer.from(res.data);
      let kind;
      try { kind = checkAudio(buffer, res.headers?.['content-type']); }
      catch (e) {
        if (!e.small) throw e;
        // maybe the server is still converting: wait and try the same link once more
        await wait(6000);
        res = await download(got.url);
        buffer = Buffer.from(res.data);
        kind = checkAudio(buffer, res.headers?.['content-type']);
      }
      return { buffer, ...kind, title: got.title, source: names[i] };
    } catch (e) {
      const why = e?.response?.status ? `HTTP ${e.response.status}` : (e?.code || e?.message || 'error');
      console.error(`[yta] ${names[i]} failed: ${why}`);
      fetchYtAudio.lastErrors.push(`${names[i]}: ${String(why).slice(0, 95)}`);
      throw e;
    }
  });
  try { return await Promise.any(attempts); } catch { return null; }
}

// ─── YouTube video (multi-source, verified) ──────────────────────────────

// Same idea as for audio: a real video is megabytes. Reject stubs, web pages and JSON.
function checkVideo(buf, contentType = '') {
  const kb = Math.round((buf ? buf.length : 0) / 1024);
  const ct = String(contentType).split(';')[0] || '?';
  if (!buf || !buf.length) throw new Error('empty file');
  const info = sniff(buf);
  if (info.kind === 'html') {
    const title = (buf.slice(0, 20000).toString('utf8').match(/<title[^>]*>([^<]{1,60})/i) || [])[1];
    throw new Error(`${kb}KB web page, not video${title ? ` ("${title.trim()}")` : ''}`);
  }
  if (info.kind === 'json') {
    const peek = buf.slice(0, 60).toString('utf8').replace(/\s+/g, ' ').replace(/https?:\/\/\S+/g, 'URL');
    throw new Error(`${kb}KB json, not video: ${peek}`);
  }
  if (buf.slice(4, 8).toString('latin1') !== 'ftyp') throw new Error(`${kb}KB not an mp4 file (${ct})`);
  if (buf.length < 100 * 1024) {
    const e = new Error(`${kb}KB video stub (${ct}) - too short`);
    e.small = true;
    throw e;
  }
  return { mimetype: 'video/mp4', ext: 'mp4' };
}

// Returns { buffer, title, source } or null (reasons in fetchYtVideo.lastErrors)
async function fetchYtVideo(videoUrl, api) {
  const enc = encodeURIComponent(videoUrl);
  const videoId = (String(videoUrl).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/) || [])[1];
  const names = [];
  const jobs = [];
  const add = (name, fn) => { names.push(name); jobs.push(fn); };

  const viaApi = (url, timeout, ok) => async () => {
    const d = await getJson(url, timeout);
    if (ok && !ok(d)) throw new Error('unsuccessful reply');
    const urls = [...new Set(collectMedia(d))].filter(u => !/youtube\.com|youtu\.be|ytimg\.com/i.test(u) && !IMG_EXT.test(u));
    urls.sort((x, y) => (/\.mp4|video|download|dl/i.test(y) ? 1 : 0) - (/\.mp4|video|download|dl/i.test(x) ? 1 : 0));
    if (!urls.length) {
      let peek = ''; try { peek = JSON.stringify(d).replace(/https?:\/\/\S+?(?=["\\])/g, 'URL').slice(0, 50); } catch {}
      throw new Error(`no link in reply ${peek}`);
    }
    return { url: urls[0], title: d?.title || d?.result?.title || d?.data?.title || d?.BK9?.title || null };
  };

  // your original service first, then the others - all at once, first REAL video wins
  add('supreme', viaApi(`https://apissupreme.vercel.app/media/ytmp4?apikey=supreme&url=${enc}`, 60000, d => d?.status));
  if (api) add('api/mp4', viaApi(`${api}/download/mp4?url=${enc}`, 90000));
  add('gifted', viaApi(`https://mcow.giftedtechnexus.workers.dev/api/ytv?url=${enc}`, 60000));
  add('xcasper', viaApi(`https://apis.xcasper.space/api/downloader/ytmp4?url=${enc}`, 60000));
  if (videoId) add('yt-dlp', async () => ({ buffer: await runYtDlp(await ensureYtDlp(), `https://www.youtube.com/watch?v=${videoId}`, 'b[ext=mp4][height<=720]/b[ext=mp4]', 100) }));

  const download = async (u) => axios.get(u, {
    responseType: 'arraybuffer', timeout: 150000, maxContentLength: 150 * 1024 * 1024,
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: '*/*' }
  });

  fetchYtVideo.lastErrors = [];
  const attempts = jobs.map(async (job, i) => {
    try {
      const got = await job();
      if (got.buffer) { checkVideo(got.buffer, 'video/mp4'); return { buffer: got.buffer, title: null, source: names[i] }; }
      let res = await download(got.url);
      let buffer = Buffer.from(res.data);
      try { checkVideo(buffer, res.headers?.['content-type']); }
      catch (e) {
        if (!e.small) throw e;
        await wait(6000); // maybe still converting: one more try
        res = await download(got.url);
        buffer = Buffer.from(res.data);
        checkVideo(buffer, res.headers?.['content-type']);
      }
      return { buffer, title: got.title, source: names[i] };
    } catch (e) {
      const why = e?.response?.status ? `HTTP ${e.response.status}` : (e?.code || e?.message || 'error');
      console.error(`[ytv] ${names[i]} failed: ${why}`);
      fetchYtVideo.lastErrors.push(`${names[i]}: ${String(why).slice(0, 95)}`);
      throw e;
    }
  });
  try { return await Promise.any(attempts); } catch { return null; }
}

module.exports = [

  // ═══════════════════════════════════════════════════════════
  // YOUTUBE SEARCH
  // ═══════════════════════════════════════════════════════════

  {
    command: ['ytsearch'],
    aliases: ['yts'],
    description: 'Search YouTube',
    category: 'downloads',
    handler: async (client, m, { reply, text }) => {
      if (!text) return reply('Provide a search term. E.g: .yts Alan Walker Alone');
      const result = await yts(text);
      const videos = result.videos;
      if (!videos || videos.length === 0) return reply(`No matching videos found for: *${text}*`);
      const length = Math.min(videos.length, 10);
      let tex = `📺 *YouTube Search*\n🔍 Query: ${text}\n\n`;
      for (let i = 0; i < length; i++) {
        tex += `*${i + 1}.* ${videos[i].title}\n🔗 ${videos[i].url}\n📺 ${videos[i].author.name}\n\n`;
      }
      reply(tex);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // YOUTUBE AUDIO
  // ═══════════════════════════════════════════════════════════

  {
    command: ['play'],
    aliases: ['yta', 'ytmp3'],
    description: 'Download YouTube audio (MP3)',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text) return m.reply('🔎 Provide a song name or YouTube link!');
      try {
        await client.sendMessage(m.chat, { react: { text: '🎧', key: m.key } });
        let msg = await client.sendMessage(m.chat, { text: `🔍 Searching *${text}*...` }, { quoted: m });

        let videoUrl, videoTitle;
        if (text.match(/(youtube\.com|youtu\.be)/i)) {
          videoUrl = text;
          const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
          if (!videoId) return m.reply('❌ Invalid YouTube link.');
          const info = await yts({ videoId });
          videoTitle = info?.title || 'YouTube Audio';
        } else {
          let search = await axios.get(`${api}/search/yts?query=${encodeURIComponent(text)}`);
          let videos = search.data?.result;
          if (!Array.isArray(videos) || videos.length === 0) {
            return client.sendMessage(m.chat, { text: '❌ No results found.', edit: msg.key });
          }
          videoUrl = videos[0].url;
          videoTitle = videos[0].title;
        }

        await client.sendMessage(m.chat, { text: `😍 Found: *${videoTitle}*`, edit: msg.key });
        await client.sendMessage(m.chat, { text: `✅ Downloading: *${videoTitle}*`, edit: msg.key });

        const song = await fetchYtAudio(videoUrl, api);
        if (!song) {
          const why = (fetchYtAudio.lastErrors || []).join('\n');
          return client.sendMessage(m.chat, { text: '❌ Failed to get audio. Try again in a minute.' + (why ? `\n\n🔎 Sources tried:\n${why}` : ''), edit: msg.key });
        }

        let fileName = `${videoTitle}`.replace(/[^\w\s.-]/gi, '') + '.' + song.ext;
        await client.sendMessage(m.chat, { audio: song.buffer, mimetype: song.mimetype, fileName }, { quoted: m });
        await client.sendMessage(m.chat, { document: song.buffer, mimetype: song.mimetype, fileName }, { quoted: m });
        await client.sendMessage(m.chat, { text: `✅ Succesfully Downloaded *${videoTitle}*`, edit: msg.key });
      } catch (err) {
        m.reply('❌ Error downloading audio.');
      }
    }
  },

  {
    command: ['play2'],
    aliases: ['yta2'],
    description: 'Download YouTube audio via alternate API',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text) return m.reply('🎧 Provide a song name or YouTube link!\nEg:- *play2 Blinding Lights*');
      try {
        await client.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
        let msg = await client.sendMessage(m.chat, { text: `🔍 Searching *${text}*...` }, { quoted: m });

        let videoUrl, videoTitle;
        if (text.match(/(youtube\.com|youtu\.be)/i)) {
          videoUrl = text;
          videoTitle = 'YouTube Audio';
        } else {
          const search = await yts(text);
          const video = search.videos[0];
          if (!video) return client.sendMessage(m.chat, { text: `❌ No results found for: *${text}*`, edit: msg.key });
          videoUrl = video.url;
          videoTitle = video.title;
        }

        await client.sendMessage(m.chat, { text: `😍 Found: *${videoTitle}*\n⏳ Downloading...`, edit: msg.key });

        const song = await fetchYtAudio(videoUrl, api);
        if (!song) {
          const why = (fetchYtAudio.lastErrors || []).join('\n');
          return client.sendMessage(m.chat, { text: '❌ Download failed. Try a different song.' + (why ? `\n\n🔎 Sources tried:\n${why}` : ''), edit: msg.key });
        }

        const finalTitle = song.title || videoTitle;
        const fileName = finalTitle.replace(/[\/\\:*?"<>|]/g, '').trim() + '.' + song.ext;

        await client.sendMessage(m.chat, { audio: song.buffer, mimetype: song.mimetype, fileName }, { quoted: m });
        await client.sendMessage(m.chat, { document: song.buffer, mimetype: song.mimetype, caption: __V.saved(), fileName }, { quoted: m });
        await client.sendMessage(m.chat, { text: `✅ Succesfully Downloaded! *${finalTitle}*`, edit: msg.key });
      } catch (err) {
        m.reply('❌ An error occurred. Try again.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // YOUTUBE VIDEO
  // ═══════════════════════════════════════════════════════════

  {
    command: ['video'],
    aliases: ['ytv', 'ytmp4'],
    description: 'Download YouTube video (MP4)',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text) return m.reply('🎬 Provide a video name or YouTube link!\nEg:- *ytv Blinding Lights*');
      try {
        await client.sendMessage(m.chat, { react: { text: '🎬', key: m.key } });
        let msg = await client.sendMessage(m.chat, { text: `🔍 Searching *${text}*...` }, { quoted: m });

        let videoUrl, videoTitle;
        if (text.match(/(youtube\.com|youtu\.be)/i)) {
          videoUrl = text.trim().split(/\s+/).find(w => /youtube\.com|youtu\.be/i.test(w)) || text.trim();
          const vid = (videoUrl.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/) || [])[1];
          const info = vid ? await yts({ videoId: vid }).catch(() => null) : null;
          videoTitle = info?.title || 'YouTube Video';
        } else {
          const search = await yts(text);
          const video = search.videos[0];
          if (!video) return client.sendMessage(m.chat, { text: `❌ No results found for: *${text}*`, edit: msg.key });
          videoUrl = video.url;
          videoTitle = video.title;
        }

        await client.sendMessage(m.chat, { text: `😍 Found: *${videoTitle}*\n⏳ Downloading...`, edit: msg.key });

        const found = await fetchYtVideo(videoUrl, api);
        if (!found) {
          const why = (fetchYtVideo.lastErrors || []).join('\n');
          return client.sendMessage(m.chat, { text: '❌ Download failed. Try again in a minute.' + (why ? `\n\n🔎 Sources tried:\n${why}` : ''), edit: msg.key });
        }

        // prefer the real YouTube title over whatever name a download service made up
        const finalTitle = (videoTitle && videoTitle !== 'YouTube Video') ? videoTitle : (found.title || videoTitle);
        const fileName = finalTitle.replace(/[\/\\:*?"<>|]/g, '').trim() + '.mp4';

        await client.sendMessage(m.chat, { video: found.buffer, mimetype: 'video/mp4', fileName, caption: `🎬 *${finalTitle}*` }, { quoted: m });
        await client.sendMessage(m.chat, { document: found.buffer, mimetype: 'video/mp4', caption: __V.saved(), fileName }, { quoted: m });
        await client.sendMessage(m.chat, { text: `✅ Successfully downloaded! *${finalTitle}*`, edit: msg.key });
      } catch (err) {
        console.error('[ytv] failed:', err.message);
        m.reply(`❌ An error occurred. Try again.\n\n🔎 ${String(err?.response?.status ? 'HTTP ' + err.response.status : err.message).slice(0, 80)}`);
      }
    }
  },

  {
    command: ['video2'],
    aliases: ['ytv2'],
    description: 'Download YouTube video via keithsite (alternate)',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text) return m.reply('🎬 Provide a video name or YouTube link!');
      try {
        await client.sendMessage(m.chat, { react: { text: '🎬', key: m.key } });
        let msg = await client.sendMessage(m.chat, { text: `🔍 Searching *${text}*...` }, { quoted: m });

        let videoUrl, videoTitle;
        if (text.match(/(youtube\.com|youtu\.be)/i)) {
          videoUrl = text;
          const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
          if (!videoId) return m.reply('❌ Invalid YouTube link.');
          const info = await yts({ videoId });
          videoTitle = info?.title || 'YouTube Video';
        } else {
          let search = await axios.get(`${api}/search/yts?query=${encodeURIComponent(text)}`);
          let videos = search.data?.result;
          if (!Array.isArray(videos) || videos.length === 0) return m.reply('❌ No results found.');
          videoUrl = videos[0].url;
          videoTitle = videos[0].title;
        }

        await client.sendMessage(m.chat, { text: `😍 Found: *${videoTitle}*`, edit: msg.key });
        await client.sendMessage(m.chat, { text: `✅ Downloading: *${videoTitle}*`, edit: msg.key });

        let download = await axios.get(`${api}/download/mp4?url=${encodeURIComponent(videoUrl)}`);
        let downloadUrl = download.data?.result;
        if (!downloadUrl) return client.sendMessage(m.chat, { text: '❌ Failed to get video.', edit: msg.key });

        let head = await axios.head(downloadUrl).catch(() => null);
        if (!head || !head.headers['content-type']?.includes('video')) return m.reply('❌ Invalid video format from API.');

        let response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
        let size = response.headers['content-length'];
        if (size && size > 150 * 1024 * 1024) return m.reply('❌ Video too large. Try another one.');

        let buffer = Buffer.from(response.data);
        let fileName = `${videoTitle}.mp4`.replace(/[^\w\s.-]/gi, '');

        await client.sendMessage(m.chat, { video: buffer, mimetype: 'video/mp4', fileName, caption: `🎬 ${videoTitle}` }, { quoted: m });
        await client.sendMessage(m.chat, { text: `✅ Succesfully Downloaded *${videoTitle}*`, edit: msg.key });
      } catch (err) {
        m.reply('❌ Error downloading video. API may be unstable.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // SPOTIFY
  // ═══════════════════════════════════════════════════════════

  {
    command: ['spotify'],
    description: 'Download from Spotify (name or link)',
    category: 'downloads',
    handler: async (client, m, { reply, text, prefix, api }) => {
      if (!text) return reply(
        `*🎵 Spotify Downloader*\n\nUsage:\n  *${prefix}spotify* _song name_\n  *${prefix}spotify* _<spotify URL>_\n\nExample: *${prefix}spotify* Shape of You Ed Sheeran`
      );
      try {
        await client.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
        let msg = await client.sendMessage(m.chat, { text: `🔍 Searching *${text}*...` }, { quoted: m });

        let query = text.trim();
        let displayTitle = query;

        if (/open\.spotify\.com\/track\//i.test(query)) {
          try {
            const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`, { timeout: 8000 });
            if (oembedRes.data?.title) { displayTitle = oembedRes.data.title; query = oembedRes.data.title; }
          } catch (_) {}
        }

        const results = await yts(query);
        const video = results.videos[0];
        if (!video) return client.sendMessage(m.chat, { text: `❌ No results found for: *${displayTitle}*`, edit: msg.key });

        const safeTitle = (displayTitle || video.title).replace(/[\/\\:*?"<>|]/g, '').trim();
        const fileName = safeTitle + '.mp3';
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

        await client.sendMessage(m.chat, { text: `😍 Found: *${video.title}*\n⏱️ ${video.timestamp} | 🎤 ${video.author.name}`, edit: msg.key });
        await client.sendMessage(m.chat, { text: `⬇️ Downloading: *${video.title}*...`, edit: msg.key });

        const song = await fetchYtAudio(videoUrl, api);
        if (!song) {
          const why = (fetchYtAudio.lastErrors || []).join('\n');
          return client.sendMessage(m.chat, { text: '❌ Could not get a working song file. Try again later.' + (why ? `\n\n🔎 Sources tried:\n${why}` : ''), edit: msg.key });
        }

        const outName = safeTitle + '.' + song.ext;
        await client.sendMessage(m.chat, { audio: song.buffer, mimetype: song.mimetype, fileName: outName }, { quoted: m });
        await client.sendMessage(m.chat, { document: song.buffer, mimetype: song.mimetype, fileName: outName }, { quoted: m });
        await client.sendMessage(m.chat, { text: `✅ Succesfully Downloaded! *${safeTitle}*`, edit: msg.key });
      } catch (err) {
        m.reply('❌ Failed to download. Try a different name or Spotify link.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // WHATSONG / SHAZAM
  // ═══════════════════════════════════════════════════════════

  {
    command: ['shazam'],
    aliases: ['whatsong'],
    description: 'Identify a song from quoted audio/video',
    category: 'downloads',
    handler: async (client, m, { reply, api }) => {
      try {
        if (!m.quoted) return reply('Quote a short audio or video to identify the song.');
        let d = m.quoted;
        let mimes = (d.msg || d).mimetype || d.mediaType || '';
        if (!/video|audio/i.test(mimes)) return reply('Quote an audio or video message.');

        await reply('🎵 Analyzing the media...');
        let buffer = await client.downloadMediaMessage(d);

        const acrcloud = require('acrcloud');
        let acr = new acrcloud({
          host: 'identify-eu-west-1.acrcloud.com',
          access_key: '2631ab98e77b49509e3edcf493757300',
          access_secret: 'KKbVWlTNCL3JjxjrWnywMdvQGanyhKRN0fpQxyUo'
        });

        let { status, metadata } = await acr.identify(buffer);
        if (status.code !== 0) return reply('❌ Could not identify the song. Try a clearer audio.');

        let { title, artists, album, genres, release_date } = metadata.music[0];
        let artistNames = artists ? artists.map(a => a.name).join(', ') : 'Unknown';
        let txt = `🎵 *Song Identified!*\n\n*• Title:* ${title}\n*• Artists:* ${artistNames}\n` +
          (album ? `*• Album:* ${album.name}\n` : '') +
          (genres ? `*• Genres:* ${genres.map(g => g.name).join(', ')}\n` : '') +
          (release_date ? `*• Released:* ${release_date}\n` : '') +
          `\n⬇️ Downloading...`;

        let infoMsg = await client.sendMessage(m.chat, { text: txt }, { quoted: m });

        let search = await axios.get(`${api}/search/yts?query=${encodeURIComponent(title + ' ' + artistNames)}`);
        let videos = search.data?.result;
        if (!Array.isArray(videos) || videos.length === 0) {
          return client.sendMessage(m.chat, { text: txt.replace('⬇️ Downloading...', '❌ No YouTube match found.'), edit: infoMsg.key });
        }

        let videoUrl = videos[0].url;
        let videoTitle = videos[0].title;
        const song = await fetchYtAudio(videoUrl, api);
        if (!song) {
          return client.sendMessage(m.chat, { text: txt.replace('⬇️ Downloading...', '❌ Download failed.'), edit: infoMsg.key });
        }

        let fileName = `${title} - ${artistNames}`.replace(/[^\w\s.-]/gi, '') + '.' + song.ext;
        await client.sendMessage(m.chat, { audio: song.buffer, mimetype: song.mimetype, fileName }, { quoted: m });
        await client.sendMessage(m.chat, { document: song.buffer, mimetype: song.mimetype, fileName }, { quoted: m });
        await client.sendMessage(m.chat, { text: txt.replace('⬇️ Downloading...', `✅ Succesfully Downloaded *${videoTitle}*`), edit: infoMsg.key });
      } catch (err) {
        reply('❌ Something went wrong identifying or downloading the song.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // SOCIAL MEDIA DOWNLOADERS
  // ═══════════════════════════════════════════════════════════

  {
  command: ['insta'],
  aliases: ['igdl', 'instagram', 'ig'],
  description: 'Download Instagram photo/video/reel',
  category: 'downloads',
  handler: async (client, m, { text, api }) => {
    if (!text) return m.reply('📌 Provide an Instagram link.\nExample: .ig https://www.instagram.com/p/xxxxx');
    if (!text.includes('instagram.com')) return m.reply('❌ That is not a valid Instagram link.');
    try {
      await m.reply('⏳ Please wait, fetching your media...');
      await client.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

      const link = text.trim().split(/\s+/).find(w => /instagram\.com/i.test(w)) || text.trim();
      const items = await fetchInstagram(link, api);
      if (!items.length) {
        const why = (fetchInstagram.lastErrors || []).join('\n');
        return m.reply('❌ Failed to fetch Instagram media. Make sure the post is public and the link is correct, then try again in a minute.' + (why ? `\n\n🔎 Sources tried:\n${why}` : ''));
      }

      const caption = `📸 *Instagram*\n${__V.fetched()}`;
      for (const { url, isVideo } of items.slice(0, 10)) {
        const content = (src) => isVideo
          ? { video: src, mimetype: 'video/mp4', caption, gifPlayback: false }
          : { image: src, caption };
        try {
          await client.sendMessage(m.chat, content({ url }), { quoted: m });
        } catch (_) {
          // Instagram CDN links often refuse WhatsApp's direct fetch: download it ourselves
          const dl = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          await client.sendMessage(m.chat, content(Buffer.from(dl.data)), { quoted: m });
        }
      }

    } catch (err) {
      console.error('[ig] send failed:', err.message);
      m.reply('❌ Error downloading Instagram media.');
    }
  }
},
  {
    command: ['insta2'],
    aliases: ['igdl2', 'instagram2', 'ig2'],
    description: 'Download Instagram video',
    category: 'downloads',
    handler: async (client, m, { text }) => {
      if (!text) return m.reply('Please provide an Instagram link for the video.');
      if (!text.includes('https://www.instagram.com/')) return m.reply('That is not a valid Instagram link.');
      try {
        const { igdl } = require('ruhend-scraper');
        const downloadData = await igdl(text);
        if (!downloadData || !downloadData.data || downloadData.data.length === 0) return m.reply('No video found at the provided link.');
        const videoData = downloadData.data;
        for (let i = 0; i < Math.min(20, videoData.length); i++) {
          await client.sendMessage(m.chat, {
            video: { url: videoData[i].url },
            mimetype: 'video/mp4',
            caption: __V.fetched()
          }, { quoted: m });
        }
      } catch (error) {
        m.reply('An error occurred while processing the request.');
      }
    }
  },

  {
  command: ['igstory'],
  aliases: ['instastory', 'igstories', 'igs'],
  description: 'Download Instagram stories by username',
  category: 'downloads',
  handler: async (client, m, { text }) => {
    if (!text) return m.reply('📌 Provide an Instagram username.\nExample: .igstory username');
    const username = text.trim().replace(/^@/, '');
    try {
      await m.reply(`⏳ Fetching stories for *@${username}*...`);
      await client.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

      const response = await fetch(`https://api.bk9.dev/download/igs?username=${encodeURIComponent(username)}`);
      const data = await response.json();

      if (!data.status || !data.BK9) {
  try {
    const profile = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      { headers: { 'x-ig-app-id': '936619743392459' } }
    );
    const pdata = await profile.json();
    const isPrivate = pdata?.data?.user?.is_private;
    if (isPrivate === true) {
      return m.reply(`🔒 *@${username}* has a private account. Stories can only be downloaded from public accounts.`);
    }
  } catch {}
  return m.reply(`📭 *@${username}* has no active stories right now.`);
  }
      
      const stories = data.BK9?.stories;
      if (!Array.isArray(stories) || stories.length === 0) return m.reply(`❌ No active stories found for *@${username}*.`);

      await m.reply(`📖 Found *${stories.length}* stor${stories.length === 1 ? 'y' : 'ies'} for *@${username}*. Sending...`);

      const album = [];
      for (let i = 0; i < stories.length; i++) {
        const item = stories[i];
        const url = item?.download_url || item?.url;
        if (!url) continue;
        if (item.type === 'video') {
          album.push({
            video: { url },
            mimetype: 'video/mp4',
            caption: i === 0 ? `📸 *@${username}* stories\n${__V.fetched()}` : undefined,
            gifPlayback: false,
          });
        } else {
          album.push({
            image: { url },
            caption: i === 0 ? `📸 *@${username}* stories\n${__V.fetched()}` : undefined,
          });
        }
      }
      if (!album.length) return m.reply('❌ No media could be loaded from those stories.');
      await client.sendMessage(m.chat, { album }, { quoted: m });

    } catch (err) {
      m.reply('❌ Error fetching Instagram stories.');
    }
  }
},
  
  {
    command: ['tikdl'],
    aliases: ['tiktok', 'tt'],
    description: 'Download TikTok video',
    category: 'downloads',
    handler: async (client, m, { reply, text }) => {
      if (!text) return reply('Please provide a TikTok video link.');
      if (!/tiktok\.com/i.test(text)) return reply('That is not a TikTok link.');
      await client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
      try {
        const link = text.trim().split(/\s+/)[0];
        const data = await fetchTikTok(link);
        if (!data || (!data.videoUrl && !data.images.length)) {
          return reply('❌ Failed to retrieve the video. The link may be private/removed, or all download servers are busy. Try again shortly.');
        }

        const caption = `🎵 *TikTok*${data.title ? `\n${data.title}` : ''}\n${__V.fetched()}`;

        if (data.videoUrl) {
          try {
            await client.sendMessage(m.chat, { video: { url: data.videoUrl }, mimetype: 'video/mp4', caption, gifPlayback: false }, { quoted: m });
          } catch (_) {
            // Some CDNs reject direct URL fetch from WhatsApp - fall back to buffer
            const dl = await axios.get(data.videoUrl, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' } });
            await client.sendMessage(m.chat, { video: Buffer.from(dl.data), mimetype: 'video/mp4', caption, gifPlayback: false }, { quoted: m });
          }
        } else {
          for (const img of data.images.slice(0, 10)) {
            await client.sendMessage(m.chat, { image: { url: img }, caption }, { quoted: m });
          }
        }
        await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      } catch (e) {
        reply(`❌ An error occurred during download: ${e.message}`);
      }
    }
  },
  
{
  command: ['twitter'],
  aliases: ['xdl'],
  description: 'Download Twitter/X video or image',
  category: 'downloads',
  handler: async (client, m, { text }) => {
    if (!text || !/https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/.test(text)) {
      return m.reply('📌 Provide a valid Twitter/X post link!\nExample: .twitter https://x.com/user/status/123456');
    }

    try {
      await m.reply('⏳ Fetching your media...');
      await client.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

      const tweetId = text.match(/\/status\/(\d+)/)?.[1];
      if (!tweetId) return m.reply('❌ Could not parse tweet ID from that link.');

      const res = await axios.get(`https://api.fxtwitter.com/i/status/${tweetId}`, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const tweet = res.data?.tweet;
      if (!tweet) return m.reply('❌ Tweet not found or is from a private account.');

      const caption = `🐦 *@${tweet.author?.screen_name || 'Unknown'}*\n\n${tweet.text || ''}\n\n❤️ ${tweet.likes || 0}  🔁 ${tweet.retweets || 0}`;
      const media = tweet.media;

      // ── Video / GIF ──────────────────────────────────────────────────
      if (media?.videos?.length) {
        const video = media.videos[0];
        const videoUrl = video.url;

        const dl = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const size = parseInt(dl.headers['content-length'] || '0');
        if (size > 150 * 1024 * 1024) return m.reply('❌ Video too large to send (over 150MB).');

        const buffer = Buffer.from(dl.data);
        const isGif = video.type === 'gif';

        await client.sendMessage(m.chat, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: caption,
          gifPlayback: isGif
        }, { quoted: m });

      // ── Photos ───────────────────────────────────────────────────────
      } else if (media?.photos?.length) {
        for (const photo of media.photos) {
          const dl = await axios.get(photo.url, { responseType: 'arraybuffer', timeout: 30000 });
          const buffer = Buffer.from(dl.data);
          await client.sendMessage(m.chat, {
            image: buffer,
            caption: caption
          }, { quoted: m });
        }

      // ── Text only tweet ──────────────────────────────────────────────
      } else {
        m.reply(`🐦 *Tweet (no media)*\n\n${caption}`);
      }

    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Unknown error';
      m.reply(`❌ Failed to download: ${msg}`);
    }
  }
},

  {
    command: ['fbdl'],
    aliases: ['fb', 'facebook'],
    description: 'Download Facebook video',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text || !text.startsWith('http')) return m.reply('📌 Provide a valid Facebook video link!');
      try {
        await m.reply('⏳ Please wait, fetching your video...');
        await client.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

        let response = await axios.get(`${api}/download/fbdown?url=${encodeURIComponent(text)}`, { timeout: 100000 });
        let result = response.data?.result;
        if (!result?.media?.sd) return m.reply('❌ Failed to fetch Facebook video.');

        let videoUrl = result.media.hd || result.media.sd;
        let head = await axios.head(videoUrl).catch(() => null);
        if (!head || !head.headers['content-type']?.includes('video')) return m.reply('❌ Invalid video format.');

        let res = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        let size = res.headers['content-length'];
        if (size && size > 100 * 1024 * 1024) return m.reply('❌ Video too large.');

        let buffer = Buffer.from(res.data);
        await client.sendMessage(m.chat, { video: buffer, mimetype: 'video/mp4', caption: '📘 Facebook Video' }, { quoted: m });
      } catch (err) {
        m.reply('❌ Error downloading Facebook video.');
      }
    }
  },

  {
  command: ['fbdl2'],
  aliases: ['fb2', 'facebook2'],
  description: 'Download Facebook video',
  category: 'downloads',
  handler: async (client, m, { text }) => {
    if (!text || !text.startsWith('http')) return m.reply('📌 Provide a valid Facebook video link!');
    try {
      await m.reply('⏳ Please wait, fetching your video...');
      await client.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

      const response = await fetch(`https://api.bk9.dev/download/fb?url=${encodeURIComponent(text)}`);
      const data = await response.json();

      if (!data.status || !data.BK9) return m.reply('❌ Failed to fetch Facebook video. Make sure the link is valid and the video is public.');

      const videoUrl = data.BK9?.hd || data.BK9?.sd || data.BK9?.url || (typeof data.BK9 === 'string' ? data.BK9 : null);
      if (!videoUrl) return m.reply('❌ No downloadable video found for that link.');

      const title = data.BK9?.title || 'Facebook Video';
      await client.sendMessage(m.chat, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        caption: `📘 *${title}*\n${__V.fetched()}`,
        gifPlayback: false,
      }, { quoted: m });

    } catch (err) {
      m.reply('❌ Error downloading Facebook video.');
    }
  }
},

  {
    command: ['pindl'],
    aliases: ['pin', 'pinterest'],
    description: 'Download Pinterest image or video',
    category: 'downloads',
    handler: async (client, m, { text, api }) => {
      if (!text || !text.startsWith('http')) return m.reply('📌 Provide a valid Pinterest link!');
      try {
        await m.reply('⏳ Fetching Pinterest media...');
        await client.sendMessage(m.chat, { react: { text: '📌', key: m.key } });

        let res = await axios.get(`${api}/download/pindl2?url=${encodeURIComponent(text)}`, { timeout: 100000 });
        let result = res.data?.result;
        if (!result?.success || !Array.isArray(result.medias)) return m.reply('❌ Failed to fetch Pinterest media.');

        let title = result.title || 'Pinterest Media';
        for (let media of result.medias) {
          let { url, extension, videoAvailable } = media;
          if (!url) continue;
          try {
            let bufferRes = await axios.get(url, { responseType: 'arraybuffer' });
            let size = bufferRes.headers['content-length'];
            if (size && size > 100 * 1024 * 1024) { await m.reply('⚠️ Skipped large file.'); continue; }
            let buffer = Buffer.from(bufferRes.data);
            let fileName = `${title}.${extension || 'jpg'}`.replace(/[^\w\s.-]/gi, '');

            if (videoAvailable || extension === 'mp4') {
              await client.sendMessage(m.chat, { video: buffer, mimetype: 'video/mp4', fileName, caption: '📌 Pinterest Video' }, { quoted: m });
            } else {
              await client.sendMessage(m.chat, { image: buffer, fileName, caption: '📌 Pinterest Image' }, { quoted: m });
            }
          } catch (err) {}
        }
      } catch (err) {
        m.reply('❌ Error downloading Pinterest media.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // OTHER DOWNLOADS
  // ═══════════════════════════════════════════════════════════
  
  {
    command: ['lyrics'],
    description: 'Get song lyrics',
    category: 'downloads',
    handler: async (client, m, { reply, text, from }) => {
      if (!text) return reply('Provide a song name!');
      try {
        const suggestRes = await global.axios.get('https://api.lyrics.ovh/suggest/' + encodeURIComponent(text));
        const hit = suggestRes.data?.data?.[0];
        if (!hit) return reply('No results found for: ' + text);
        const artist = hit.artist.name;
        const title = hit.title;
        const lyricsRes = await global.axios.get('https://api.lyrics.ovh/v1/' + encodeURIComponent(artist) + '/' + encodeURIComponent(title));
        if (!lyricsRes.data?.lyrics) return reply('Lyrics not found for: ' + title);
        const msg = `*${title}*\n_${artist}_\n\n${lyricsRes.data.lyrics}`;
        await client.sendMessage(from, { text: msg }, { quoted: m });
      } catch (error) {
        reply('I did not find any lyrics for ' + text + '. Try searching a different song.');
      }
    }
  },

      {
    command: ['movie'],
    aliases: ['mv'],
    description: 'Search IMDB for a movie or series',
    category: 'downloads',
    handler: async (client, m, { reply, text, from }) => {
      if (!text) return reply('Provide a series or movie name.');
      let fids = await global.axios.get(`http://www.omdbapi.com/?apikey=742b2d09&t=${encodeURIComponent(text)}&plot=full`);
      let imdbt =
        '⚍⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚍\n ``` IMDB MOVIE SEARCH```\n⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎\n' +
        `🎬Title      : ${fids.data.Title}\n` +
        `📅Year       : ${fids.data.Year}\n` +
        `⭐Rated      : ${fids.data.Rated}\n` +
        `📆Released   : ${fids.data.Released}\n` +
        `⏳Runtime    : ${fids.data.Runtime}\n` +
        `🌀Genre      : ${fids.data.Genre}\n` +
        `👨🏻‍💻Director   : ${fids.data.Director}\n` +
        `✍Writer     : ${fids.data.Writer}\n` +
        `👨Actors     : ${fids.data.Actors}\n` +
        `📃Plot       : ${fids.data.Plot}\n` +
        `🌐Language   : ${fids.data.Language}\n` +
        `🌍Country    : ${fids.data.Country}\n` +
        `🎖️Awards     : ${fids.data.Awards}\n` +
        `📦BoxOffice  : ${fids.data.BoxOffice}\n` +
        `🏙️Production : ${fids.data.Production}\n` +
        `🌟imdbRating : ${fids.data.imdbRating}\n` +
        `❎imdbVotes  : ${fids.data.imdbVotes}`;
      client.sendMessage(from, { image: { url: fids.data.Poster }, caption: imdbt }, { quoted: m });
    }
  },

  
{
    command: ['apk'],
    aliases: ['app'],
    description: 'Download an APK by name',
    category: 'downloads',
    handler: async (client, m, { reply, text }) => {
      if (!text) return reply('Where is the app name?');
      const { fetchJson } = require('../lib/ravenfunc');
      const kyuu = await fetchJson(`https://api.bk9.dev/search/apk?q=${text}`);
      const tylor = await fetchJson(`https://api.bk9.dev/download/apk?id=${kyuu.BK9[0].id}`);
      await client.sendMessage(m.chat, {
        document: { url: tylor.BK9.dllink },
        fileName: tylor.BK9.name,
        mimetype: 'application/vnd.android.package-archive',
        contextInfo: {
          externalAdReply: {
            title: 'SMILEY CYMOR MD BOT',
            body: `${tylor.BK9.name}`,
            thumbnailUrl: `${tylor.BK9.icon}`,
            sourceUrl: `${tylor.BK9.dllink}`,
            mediaType: 2,
            showAdAttribution: true,
            renderLargerThumbnail: false
          }
        }
      }, { quoted: m });
    }
  },

];
