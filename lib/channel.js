'use strict';
/**
 * Channel helpers for SMILEY CYMOR MD
 *  - sendWithChannelButton(): ONE message (media + text) with a "View Channel" button
 *  - followChannel(): make the connected account follow the channel
 */
const brand = require('../brand');

let _baileys;
const baileys = () => (_baileys = _baileys || require('@whiskeysockets/baileys'));

const channelJid = () => `${process.env.CHANNEL_JID || ''}`.trim() || null;

// "Forwarded from <channel>" header — this makes WhatsApp show the native "View channel" link
async function resolveChannelJid(client) {
  if (global.__cymorChannelJid) return global.__cymorChannelJid;
  const fixed = channelJid();
  if (fixed) return (global.__cymorChannelJid = fixed);
  try {
    const meta = await client.newsletterMetadata('invite', brand.channelCode);
    if (meta && meta.id) return (global.__cymorChannelJid = meta.id);
  } catch (_) {}
  return null;
}

async function newsletterContext(client) {
  const jid = await resolveChannelJid(client);
  if (!jid) return {};
  return {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: { newsletterJid: jid, newsletterName: brand.channelName, serverMessageId: 143 },
  };
}

/**
 * Sends a single message: [image | video | nothing] + body text + footer + "View Channel" URL button.
 * Strategy (all in ONE message):
 *   1. native-flow interactive message with a cta_url button  (real tappable button)
 *   2. if the account/WhatsApp build refuses it -> same media+caption as a normal message that is
 *      tagged as forwarded from the channel (WhatsApp then shows the channel header + View channel).
 * Set MENU_BUTTON=forward in the env to skip step 1 (use this if buttons don't show on your phone).
 */
async function sendWithChannelButton(client, jid, { image, video, gif, caption, footer }, quoted) {
  const url = brand.channel;
  const label = process.env.CHANNEL_BUTTON_TEXT || 'View Channel';
  const mode = String(process.env.MENU_BUTTON || 'native').toLowerCase();

  if (mode !== 'forward') {
    try {
      const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = baileys();
      let header = { title: '', subtitle: '', hasMediaAttachment: false };
      if (image || video) {
        const media = await prepareWAMessageMedia(
          image ? { image } : { video, gifPlayback: !!gif },
          { upload: client.waUploadToServer }
        );
        header = { title: '', subtitle: '', hasMediaAttachment: true, ...media };
      }
      const interactive = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create(header),
        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer || '' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: [
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: `📢 ${label}`, url, merchant_url: url }) },
          ],
          messageParamsJson: '',
        }),
      });
      const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: interactive,
          },
        },
      }, { quoted, userJid: client.user.id });

      const isGroup = String(jid).endsWith('@g.us');
      const additionalNodes = [{
        tag: 'biz', attrs: {},
        content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }],
      }];
      if (!isGroup) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });

      await client.relayMessage(jid, msg.message, { messageId: msg.key.id, additionalNodes });
      return { mode: 'native' };
    } catch (e) {
      console.error('[channel-button] interactive send failed, using forward style:', e.message);
    }
  }

  // fallback — still ONE message
  const contextInfo = await newsletterContext(client);
  const text = `${caption}${footer ? '\n\n' + footer : ''}\n\n📢 ${brand.channelName}\n${url}`;
  const payload = image ? { image, caption: text, contextInfo }
    : video ? { video, gifPlayback: !!gif, mimetype: 'video/mp4', caption: text, contextInfo }
      : { text, contextInfo };
  await client.sendMessage(jid, payload, { quoted });
  return { mode: 'forward' };
}

// make the connected account follow the channel (safe to call repeatedly)
async function followChannel(client) {
  if (String(process.env.AUTO_FOLLOW_CHANNEL || 'true').toLowerCase() === 'false') return false;
  try {
    const jid = await resolveChannelJid(client);
    if (!jid) return false;
    await client.newsletterFollow(jid);
    return true;
  } catch (e) {
    // already following or temporary failure — never block the bot
    return false;
  }
}

module.exports = { sendWithChannelButton, followChannel, newsletterContext, resolveChannelJid };
