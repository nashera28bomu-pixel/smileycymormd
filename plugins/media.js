'use strict';
const __V = require('../lib/style').voice;

const fs = require('fs');
const Jimp = require('jimp') 
const fetch = require('node-fetch')
const axios = global.axios || require('axios');
const { uploadToUguu, upscaleImage } = require('../lib/uploads');

// ── view-once helpers (images, videos AND voice notes / audio) ──
const unwrapViewOnce = (q) => q?.viewOnceMessageV2Extension?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessage?.message || q;

async function getMediaBuffer(client, node, type) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return downloadMediaMessage(
    { message: { [type]: node } },
    'buffer',
    {},
    { reuploadRequest: client.updateMediaMessage, logger: console }
  );
}

const VO = require('../lib/viewonce');

module.exports = [
{
  command: ['sticker'],
  aliases: ['stik', 's', 'stikpack'],
  description: 'Create sticker from quoted image or video',
  category: 'media',

  handler: async (
    client,
    m,
    {
      msgR: quotedMsg,
      pushname: pushName,
      author,
      reply,
      text: cmdText,
      args: cmdArgs
    }
  ) => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { execSync } = require('child_process');
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const {
      Sticker,
      StickerTypes
    } = require('../lib/stickerlite');

    const ffmpegPath = require('../lib/stickerlite').ffmpegBin();
    const from = m.chat;
    const mek = m;

    if (!quotedMsg) {
      return reply('Quote an image or a short video.');
    }

    let media;
    let isVideo = false;

    if (quotedMsg.imageMessage) {
      media = quotedMsg.imageMessage;
    } else if (quotedMsg.videoMessage) {
      media = quotedMsg.videoMessage;
      isVideo = true;
    } else {
      return reply('That is neither an image nor a short video.');
    }

    if (isVideo) {
      const sizeMB =
        (media.fileLength || 0) / (1024 * 1024);

      const seconds = media.seconds || 0;

      if (sizeMB > 8) {
        return reply(
          `Video too large (${sizeMB.toFixed(1)} MB). Max is 8 MB.`
        );
      }

      if (seconds > 30) {
        return reply(
          `Video too long (${seconds}s). Max is 30 seconds.`
        );
      }
    }

    try {
      const mediaType = isVideo
        ? 'videoMessage'
        : 'imageMessage';

      const buffer = await downloadMediaMessage(
        {
          message: {
            [mediaType]: media
          }
        },
        'buffer',
        {},
        {
          reuploadRequest: client.updateMediaMessage,
          logger: console
        }
      );

      let stickerBuffer;

      if (isVideo) {
        const makeVideoSticker = async (
          inputBuffer,
          fps,
          quality
        ) => {
          const id = Date.now();
          const tmpDir = os.tmpdir();

          const inputPath = path.join(
            tmpDir,
            `stk_video_${id}.mp4`
          );

          const processedPath = path.join(
            tmpDir,
            `stk_${id}_${fps}fps.mp4`
          );

          fs.writeFileSync(inputPath, inputBuffer);

          try {
            execSync(
              `"${ffmpegPath}" -y -i "${inputPath}" -t 6 ` +
                `-vf "scale=512:512:force_original_aspect_ratio=increase,fps=${fps},` +
                `crop=min(iw\\,ih):min(iw\\,ih),scale=512:512" ` +
                `-an -c:v libx264 -crf 28 -preset ultrafast "${processedPath}"`,
              {
                timeout: 30000,
                stdio: 'pipe'
              }
            );
          } catch {
            fs.copyFileSync(inputPath, processedPath);
          }

          const sticker = new Sticker(
            fs.readFileSync(processedPath),
            {
              pack: pushName || 'Sticker',
              author: author || 'Bot',
              type: StickerTypes.CROPPED,
              quality
            }
          );

          const result = await sticker.toBuffer();

          try {
            fs.unlinkSync(inputPath);
          } catch {}

          try {
            fs.unlinkSync(processedPath);
          } catch {}

          return result;
        };

        try {
          stickerBuffer = await makeVideoSticker(
            buffer,
            10,
            40
          );

          if (
            !stickerBuffer ||
            stickerBuffer.length < 500
          ) {
            throw new Error('Output buffer empty');
          }

          if (stickerBuffer.length > 950 * 1024) {
            const retryBuffer = await makeVideoSticker(
              buffer,
              5,
              25
            );

            if (
              retryBuffer &&
              retryBuffer.length >= 500
            ) {
              stickerBuffer = retryBuffer;
            }
          }

          if (stickerBuffer.length > 1024 * 1024) {
            return reply(
              'Sticker too large. Try a shorter clip.'
            );
          }
        } catch (videoErr) {
          return reply(
            `Video sticker failed.\n${videoErr.message}`
          );
        }
      } else {
        // ── IMAGE: fill the square by default; ".s full" keeps the whole picture ──
        const opt = String(cmdText || (Array.isArray(cmdArgs) ? cmdArgs.join(' ') : '') || '').toLowerCase();
        const keepWhole = /\b(full|whole|fit|contain)\b/.test(opt);

        const sticker = new Sticker(buffer, {
          pack: pushName || 'Sticker',
          author: author || 'Bot',
          type: keepWhole ? StickerTypes.FULL : StickerTypes.CROPPED,
          categories: ['🤩', '🎉'],
          quality: 90
        });

        stickerBuffer = await sticker.toBuffer();
      }

      await client.sendMessage(
        from,
        { sticker: stickerBuffer },
        { quoted: mek }
      );
    } catch (err) {
      console.error('sticker error:', err);
      await reply(`Failed: ${err.message}`);
    }
  }
},
  
  {
  command: ['take'],
  aliases: ['steal'],
  description: 'Retake/rewatermark a sticker',
  category: 'media',
  handler: async (client, m, { reply, msgR }) => {
    const { Sticker, StickerTypes } = require('../lib/stickerlite');
    const Jimp = require('jimp');
    const fs = require('fs');
    const pushname = m.pushName || 'No Name';

    if (!msgR) return m.reply('Quote an image, a short video or a sticker to change watermark.');

    let media;
    let isVideo = false;
    let isAnimatedSticker = false;

    if (msgR.imageMessage) media = msgR.imageMessage;
    else if (msgR.videoMessage) { media = msgR.videoMessage; isVideo = true; }
    else if (msgR.stickerMessage) {
      media = msgR.stickerMessage;
      isAnimatedSticker = !!msgR.stickerMessage.isAnimated;
    }
    else return m.reply('This is neither a sticker, image nor a video...');

    let result = await client.downloadAndSaveMediaMessage(media);

    try {
      let buf;

      if (isVideo) {
        const { execSync } = require('child_process');
        const os = require('os');
        const path = require('path');
        let ffmpegPath;
        ffmpegPath = require('../lib/stickerlite').ffmpegBin();

        const id = Date.now();
        const tmpDir = os.tmpdir();

        const makeSticker = async (inputPath, fps, q) => {
          const processedPath = path.join(tmpDir, `take_${id}_${fps}fps.mp4`);
          try {
            execSync(
              `"${ffmpegPath}" -y -i "${inputPath}" -t 6 ` +
              `-vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=${fps}" ` +
              `-an -c:v libx264 -crf 28 -preset ultrafast "${processedPath}"`,
              { timeout: 30000, stdio: 'pipe' }
            );
          } catch (e) {
            fs.copyFileSync(inputPath, processedPath);
          }
          const sticker = new Sticker(fs.readFileSync(processedPath), {
            pack: pushname,
            author: 'SMILEY CYMOR MD',
            type: StickerTypes.CROPPED,
            quality: q,
          });
          const out = await sticker.toBuffer();
          try { fs.unlinkSync(processedPath); } catch {}
          return out;
        };

        buf = await makeSticker(result, 10, 40);
        if (!buf || buf.length < 500) return reply('❌ Video sticker failed — ffmpeg may be unavailable on this server.');

        if (buf.length > 950 * 1024) {
          const retryBuf = await makeSticker(result, 5, 25);
          if (retryBuf && retryBuf.length >= 500) buf = retryBuf;
        }

        if (buf.length > 1024 * 1024) {
          return reply(
            `❌ Sticker still too large (${(buf.length / 1024 / 1024).toFixed(2)} MB) after compression.\n` +
            `💡 *Tip:* Try a shorter clip (< 4s) or send an image instead.`
          );
        }

      } else if (isAnimatedSticker) {
        const sticker = new Sticker(fs.readFileSync(result), {
          pack: pushname,
          author: 'SMILEY CYMOR MD',
          type: StickerTypes.FULL,
          quality: 70,
        });
        buf = await sticker.toBuffer();

        if (!buf || buf.length < 500) return reply('❌ Failed to re-pack animated sticker.');

        if (buf.length > 1024 * 1024) {
          return reply(
            `❌ Animated sticker too large (${(buf.length / 1024 / 1024).toFixed(2)} MB).\n` +
            `💡 *Tip:* WhatsApp stickers must be under 1 MB.`
          );
        }

      } else {
        const sticker = new Sticker(fs.readFileSync(result), {
          pack: pushname,
          author: 'SMILEY CYMOR MD',
          type: StickerTypes.CROPPED,
          categories: ['🤩', '🎉'],
          quality: 90,
        });
        buf = await sticker.toBuffer();
      }

      await client.sendMessage(m.chat, { sticker: buf }, { quoted: m });
    } catch (e) {
      reply('❌ Error: ' + e.message);
    } finally {
      try { fs.unlinkSync(result); } catch {}
    }
  }
},
  
  
{
    command: ['mix'],
    aliases: ['emojimix'],
    description: 'Mix two emojis into a sticker',
    category: 'media',
    handler: async (client, m, { reply, text }) => {
      const { Sticker, StickerTypes } = require('../lib/stickerlite');
      const { botname } = require('../set');
      if (!text) return m.reply('No emojis provided?');
      const emojis = text.split('+');
      if (emojis.length !== 2) return m.reply("Specify the emojis and separate with '+'");
      const emoji1 = emojis[0].trim();
      const emoji2 = emojis[1].trim();
      const getMixUrl = async () => {
        // 1) original API
        try {
          const r = await global.axios.get(
            `https://levanter.onrender.com/emix?q=${encodeURIComponent(emoji1 + emoji2)}`,
            { timeout: 15000 }
          );
          if (r.data && r.data.status === true && r.data.result) return r.data.result;
        } catch {}
        // 2) fallback: Google Emoji Kitchen (via Tenor)
        try {
          const key = 'AIzaSyACvEq5cbgoUGQ3Y3YfcYLqb-VPV1hbBD0';
          const url = `https://tenor.googleapis.com/v2/featured?key=${key}&contentfilter=high` +
            `&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5` +
            `&q=${encodeURIComponent(emoji1 + '_' + emoji2)}`;
          const r = await global.axios.get(url, { timeout: 15000 });
          const hit = r.data && r.data.results && r.data.results[0];
          return (hit && hit.media_formats && hit.media_formats.png_transparent && hit.media_formats.png_transparent.url) || null;
        } catch {}
        return null;
      };

      try {
        const mixUrl = await getMixUrl();
        if (!mixUrl) return m.reply('Unable to create emoji mix. Try a different pair of emojis.');
        const stickerMess = new Sticker(mixUrl, {
          pack: botname || 'SMILEY CYMOR MD',
          author: 'SMILEY CYMOR MD',
          type: StickerTypes.DEFAULT,
          categories: ['🤩', '🎉'],
          quality: 80
        });
        const stickerBuffer = await stickerMess.toBuffer();
        await client.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
      } catch (error) {
        m.reply('An error occurred while creating the emoji mix. ' + error.message);
      }
    }
  },

  {
  command: ['smeme'],
  aliases: ['write'],
  description: 'Add words to a sticker',
  category: 'media',
  handler: async (client, m, { reply, text, mime, pushname, qmsg }) => {
    const respond = `Quote an image or sticker with text separated by |\nExample: .smeme top text|bottom text`;
    if (!/image|webp/.test(mime)) return reply(respond);
    if (!text) return reply(respond);

    const atas = text.split('|')[0]?.trim() || '';
    const bawah = text.split('|')[1]?.trim() || '';

    const { Sticker, StickerTypes, toPng } = require('../lib/stickerlite');
    const fs = require('fs');

    let dwnld = await client.downloadAndSaveMediaMessage(qmsg);

    try {
      let img;
      try {
        const pngBuf = await toPng(fs.readFileSync(dwnld));
        img = await Jimp.read(pngBuf);
      } catch (e) {
        return reply('❌ Could not read the image: ' + e.message);
      }

      img.contain(512, 512);

      const total = (atas + bawah).length;
      const fontWhite = await Jimp.loadFont(total <= 14 ? Jimp.FONT_SANS_64_WHITE : Jimp.FONT_SANS_32_WHITE);
      const fontBlack = await Jimp.loadFont(total <= 14 ? Jimp.FONT_SANS_64_BLACK : Jimp.FONT_SANS_32_BLACK);
      const maxW = 480;
      const margin = 16;

      const drawText = (txt, atBottom) => {
        if (!txt) return;
        const t = txt.toUpperCase();
        const textH = Jimp.measureTextHeight(fontWhite, t, maxW);
        const y = atBottom ? 512 - 8 - textH : 8;
        const opts = { text: t, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER };
        for (const [dx, dy] of [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]]) {
          img.print(fontBlack, margin + dx, y + dy, opts, maxW);
        }
        img.print(fontWhite, margin, y, opts, maxW);
      };

      drawText(atas, false);
      drawText(bawah, true);

      const resized = await img.getBufferAsync(Jimp.MIME_PNG);

      const sticker = new Sticker(resized, {
        pack: pushname,
        author: 'SMILEY CYMOR MD',
        type: StickerTypes.DEFAULT,
        quality: 90,
      });
      const stickerBuffer = await sticker.toBuffer();
      await client.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
    } catch (e) {
      reply('❌ Error: ' + e.message);
    } finally {
      try { fs.unlinkSync(dwnld); } catch {}
    }
  }
},

  
                
  {
    command: ['vv'],
    aliases: ['retrieve', 'unlock', 'reveal'],
    description: 'Unlock a view-once message here in the chat',
    category: 'media',
    handler: async (client, m) => {
      if (!m.quoted) return m.reply('↩️ Reply to a view-once message with this command.');
      const quotedMessage = m.msg?.contextInfo?.quotedMessage;
      if (!quotedMessage) return m.reply('Could not find the viewonce message.');
      try {
        const ok = await VO.saveQuoted(client, m, m.chat, quotedMessage, m);
        if (!ok) return m.reply('🫥 That is not a view-once photo, video or voice note.');
      } catch (e) {
        m.reply('⚠️ Could not unlock it — ' + e.message);
      }
    }
  },

  {
    command: ['vv2'],
    aliases: ['mmh', 'uhm'], 
    noprefix: ['😂', '😍', '🌚', '🌝', '😊', '😉', '🙄', '☑️', '💯', '😅', '🫠', '🙂', '🥰', '😘', '🤩', '😙', '🤢', '🤔', '🫣', '❤️', '❤', '💖', '💗', '💕', '🔥', '👍', '😮', '🤭', '😎', '🙈', '💙', '💚', '💜', '🧡', '💛', '🖤', '🤍', '😻', '✨', '⭐', '👀'],
    description: 'Save a view-once message to your own DM (reply with a command or an emoji)',
    category: 'media',
    handler: async (client, m, { Owner }) => {
      if (!m.quoted) return;
      if (!Owner) return;
      const quotedMessage = m.msg?.contextInfo?.quotedMessage;
      if (!quotedMessage) return client.sendMessage(client.user.id, { text: 'Could not find the viewonce message.' });
      try {
        await VO.saveQuoted(client, m, client.user.id, quotedMessage);
      } catch (e) {
        await client.sendMessage(client.user.id, { text: '⚠️ Could not unlock it — ' + e.message });
      }
    }
  },

  {
    command: ['botpp'],
    aliases: ['botdp'],
    description: 'Get or change the bot profile picture',
    category: 'media',
    handler: async (client, m, { Owner, NotOwner, quoted, mime, reply }) => {
      if (!Owner) return reply(NotOwner);
      if (!quoted) {
        let pp;
        try { pp = await client.profilePictureUrl(client.user.id, 'image'); }
        catch { pp = 'https://tinyurl.com/yx93l6da'; }
        return client.sendMessage(m.chat, { image: { url: pp }, caption: "Bot's current profile picture" }, { quoted: m });
      }
      if (!/image/.test(mime)) return reply('Send an image to change the bot profile picture');
      let media = await client.downloadAndSaveMediaMessage(quoted);
      await client.updateProfilePicture(client.user.id, { url: media }).catch(() => {});
      reply('Bot profile picture updated!');
    }
  },

  {
    command: ['getpfp'],
    aliases: ['dp', 'getpp'],
    description: 'Get the profile picture of any number',
    category: 'media',
    handler: async (client, m, { reply, text }) => {
      let jid = text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.quoted?.sender || m.sender;
      let pp;
      try { pp = await client.profilePictureUrl(jid, 'image'); }
      catch { return reply('Could not fetch profile picture. The number has hidden their profile picture or not registered on WhatsApp.'); }
      client.sendMessage(m.chat, { image: { url: pp }, caption: `Profile picture of @${jid.split('@')[0]}` }, { quoted: m });
    }
  },
  
  {
    command: ['removebg'],
    aliases: ['rbg'],
    description: 'remove background of a picture',
    category: 'media',
    handler: async (client, m, { reply, api }) => {
    try {
      const mime = m.quoted.mimetype || '';
      if (!m.quoted) return m.reply('Reply to an image to remove its background.');
      if (!/image/.test(mime)) return m.reply('That is not an image. Quote an image and try again.');

      m.reply('A moment, removing the background...');

      const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
      const uploaded = await uploadToUguu(filePath);
      try { require('fs').unlinkSync(filePath); } catch(e) {}

      const res = await axios.get(`${api}/ai/removebg?url=${encodeURIComponent(uploaded)}`);
      if (!res.data || !res.data.result) return m.reply('Failed to remove background. Try again.');

      await client.sendMessage(m.chat, {
        image: { url: res.data.result },
        caption: __V.edited()
      }, { quoted: m });

    } catch (err) {
      m.reply('An error occurred: ' + err.message);
    }
  }
  },
  
  {
  command: ['similarimage'],
  aliases: ['reverseimage', 'ri'],
  description: 'Find similar images using reverse image search',
  category: 'media',
  handler: async (client, m, { reply, from, api, mime }) => {
    if (!m.quoted) return m.reply('Reply to an image only.');
    if (!/image/.test(mime)) return reply('📌 That is not an image!');
    try {
      await reply('🔎 Searching for similar images...');
      
      const buf = await client.downloadAndSaveMediaMessage(m.quoted);
      
      const imageUrl = await uploadToUguu(buf);
      
      const res = await global.axios.get(`${api}/search/reverseimage?url=${encodeURIComponent(imageUrl)}`);
      const data = res.data;
      if (!data?.result?.similarImages?.length) return reply('❌ No similar images found.');
      const similarImages = data.result.similarImages.slice(0, 10);
      
      const album = [];
      for (let i = 0; i < similarImages.length; i++) {
        const img = similarImages[i];
        const url = img.thumbnailUrl || img.url;
        if (url) {
          album.push({
            image: { url },
            caption: i === 0 ? `🔍 *Similar Images Found*\n📸 ${similarImages.length} results` : undefined
          });
        }
      }
      if (!album.length) return reply('❌ Failed to load similar images.');
      await client.sendMessage(from, { album }, { quoted: m });
    } catch (err) {
      await reply('❌ Error: ' + err.message);
    }
  }
},
  
  {
  command: ['remini'],
  aliases: ['upscale', 'enhance', 'hd'],
  description: 'Enhance a quoted image using AI (Remini)',
  category: 'media',
  handler: async (client, m, { reply, mime }) => {
    if (!m.quoted) return reply('📌 Reply to an image with the command to enhance it.');
    if (!/image/.test(m.quoted.mimetype || mime || '')) return reply('❌ Only image messages can be enhanced. Reply to a photo.');

    try {
      reply('⏳ Enhancing your image with AI... Please wait.');

      const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
      if (!filePath || !fs.existsSync(filePath)) return reply('❌ Failed to download image.');

      const imageUrl = await uploadToUguu(filePath);
      try { fs.unlinkSync(filePath); } catch (_) {}

      const res = await fetch(`https://apis.davidcyril.name.ng/remini?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) return reply('❌ Failed to enhance image. Try again.');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image')) return reply('❌ API did not return an image. Try again.');
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      await client.sendMessage(m.chat, {
        image: buffer,
        mimetype: 'image/png',
        caption: `✨ *Upscaled to HD*\n${__V.edited()}`,
      }, { quoted: m });

    } catch (err) {
      reply('❌ Failed to enhance image. Make sure you replied to a clear photo and try again.');
    }
  }
},

{
    command: ['remini2'],
    aliases: ['upscale2', 'enhance2', 'hd2'],
    description: 'Upscale a quoted image to HD (4x)',
    category: 'media',
    handler: async (client, m, { reply, msgR }) => {

      if (!msgR) return reply(`📌 Reply to an image with ${m.prefix}hd to upscale it.`);

      const imageMsg = msgR.imageMessage || null;
      if (!imageMsg) return reply('❌ Only image messages can be upscaled. Reply to a photo.');

      let filePath;
      try {
    filePath = await client.downloadAndSaveMediaMessage(imageMsg);
    
    const buffer = require('fs').readFileSync(filePath);
    const upscaledUrl = await upscaleImage(buffer);

    await client.sendMessage(m.chat, { image: { url: upscaledUrl }, caption: "🔼 Image Upscaled to HD" }, { quoted: m });

  } catch (err) {
        
    console.error("HD Upscale error:", err);
        
    await reply("❌ Failed to upscale image. Try again.");
        
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
 }
},
  
  {
    command: ['save'],
    aliases: ['forward'],
    description: 'Save a status message to DM',
    category: 'media',
    handler: async (client, m, { reply }) => {
      try {
        const quotedMessage = m.msg?.contextInfo?.quotedMessage;
        if (!quotedMessage) return m.reply('❌ Please reply to a status message');
        if (!m.quoted?.chat?.endsWith('@broadcast')) return m.reply('⚠️ That message is not a status! Please reply to a status message.');
        const mediaBuffer = await client.downloadMediaMessage(m.quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) return m.reply('🚫 Could not download the status media. It may have expired.');
        let payload;
        let mediaType;
        if (quotedMessage.imageMessage) {
          mediaType = 'image';
          payload = { image: mediaBuffer, caption: quotedMessage.imageMessage.caption || '📸 Saved status image', mimetype: 'image/jpeg' };
        } else if (quotedMessage.videoMessage) {
          mediaType = 'video';
          payload = { video: mediaBuffer, caption: quotedMessage.videoMessage.caption || '🎥 Saved status video', mimetype: 'video/mp4' };
        } else {
          return m.reply('❌ Only image and video statuses can be saved!');
        }
        await client.sendMessage(m.sender, payload, { quoted: m });
        return m.reply(`✅  ${mediaType} 𝐬𝐚𝐯𝐞𝐝! Check Dm`);
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) return m.reply('⚠️ The status may have expired or been deleted.');
        return m.reply('❌ Failed to save status. Error: ' + error.message);
      }
    }
  },

];
