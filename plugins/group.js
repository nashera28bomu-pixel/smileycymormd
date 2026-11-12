'use strict';
const __V = require('../lib/style').voice;

module.exports = [

  {
    command: ['disp-1'],
    description: 'Turn on disappearing messages (24 hours)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupToggleEphemeral(m.chat, 1 * 24 * 3600);
      m.reply('Disappearing messages successfully turned on for 24hrs!');
    }
  },

  {
    command: ['disp-7'],
    description: 'Turn on disappearing messages (7 days)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupToggleEphemeral(m.chat, 7 * 24 * 3600);
      m.reply('Disappearing messages successfully turned on for 7 days!');
    }
  },

  {
    command: ['disp-90'],
    description: 'Turn on disappearing messages (90 days)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupToggleEphemeral(m.chat, 90 * 24 * 3600);
      m.reply('Disappearing messages successfully turned on for 90 days!');
    }
  },

  {
    command: ['disp-off'],
    description: 'Turn off disappearing messages',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupToggleEphemeral(m.chat, 0);
      m.reply('Disappearing messages successfully turned off!');
    }
  },

  {
    command: ['icon'],
    aliases: ['setgcicon', 'setpp'],
    description: 'Change group icon',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, quoted, mime, prefix, command }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      if (!quoted) return reply(`Send or tag an image with the caption ${prefix + command}`);
      if (!/image/.test(mime)) return reply(`Send or tag an image with the caption ${prefix + command}`);
      if (/webp/.test(mime)) return reply(`Send or tag an image with the caption ${prefix + command}`);
      let media = await client.downloadAndSaveMediaMessage(quoted);
      await client.updateProfilePicture(m.chat, { url: media }).catch(() => {});
      reply('Group icon updated');
    }
  },

  {
    command: ['revoke'],
    aliases: ['newlink', 'reset'],
    description: 'Reset group invite link',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, groupMetadata }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      await client.groupRevokeInvite(m.chat);
      await client.sendMessage(m.chat, { text: 'Group link revoked!' }, { quoted: m });
      let response = await client.groupInviteCode(m.chat);
      await client.sendMessage(m.sender, { text: `https://chat.whatsapp.com/${response}\n\nHere is the new group link for ${groupMetadata.subject}` }, { quoted: m });
      client.sendMessage(m.chat, { text: 'Sent you the new group link in your inbox!' }, { quoted: m });
    }
  },

  {
    command: ['link'],
    aliases: ['gclink', 'grouplink'],
    description: 'Get group invite link',
    category: 'group',
    handler: async (client, m, { reply, group, botAdmin, isBotAdmin, groupMetadata }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      let response = await client.groupInviteCode(m.chat);
      await client.sendMessage(m.chat, { text: `https://chat.whatsapp.com/${response}\n\nGroup link for ${groupMetadata.subject}` }, { quoted: m });
    }
  },

  {
    command: ['delete'],
    aliases: ['del'],
    description: 'Delete a quoted message',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!m.quoted) return reply('No message quoted for deletion');
      let { isBaileys } = m.quoted;
      if (isBaileys) return reply('I cannot delete. Quoted message is my message or another bot message.');
      client.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.quoted.id, participant: m.quoted.sender } });
    }
  },

  {
    command: ['leave'],
    aliases: ['leavegc'],
    description: 'Make bot leave the group',
    category: 'group',
    handler: async (client, m, { Owner, NotOwner, participants }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!m.isGroup) return m.reply('This command is meant for groups');
      await client.sendMessage(m.chat, { text: '𝗚𝗼𝗼𝗱𝗯𝘆𝗲 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲👋. SMILEY CYMOR MD 𝗶𝘀 𝗟𝗲𝗮𝘃𝗶𝗻𝗴 𝘁𝗵𝗲 𝗚𝗿𝗼𝘂𝗽 𝗻𝗼𝘄...', mentions: participants.map(a => a.id) }, { quoted: m });
      await client.groupLeave(m.chat);
    }
  },

  {
    command: ['subject'],
    aliases: ['gcname', 'changesubject'],
    description: 'Change group subject/name',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, text }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!text) return reply('Provide the text for the group subject.');
      await client.groupUpdateSubject(m.chat, text);
      m.reply('Group name successfully updated! 💀');
    }
  },

  {
    command: ['desc'],
    aliases: ['setdesc'],
    description: 'Change group description',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, text }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!text) return reply('Provide the text for the group description');
      await client.groupUpdateDescription(m.chat, text);
      m.reply('Group description successfully updated! 🥶');
    }
  },

  {
    command: ['hidetag'],
    aliases: ['tag'],
    description: 'Tag all members silently',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, q }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      let groupMeta = await client.groupMetadata(m.chat);
      let mentionIds = groupMeta.participants.map(p => p.id);
      await client.sendMessage(m.chat, { text: q ? q : '@all', mentions: mentionIds }, { quoted: m });
    }
  },

  {
    command: ['tagall'],
    aliases: ['all'], 
    description: 'Tag all members with list',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, q }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      let groupMeta = await client.groupMetadata(m.chat);
      let members = groupMeta.participants;
      let teks = `🚀 *SMILEY CYMOR MD TAG ALL*\n\nMessage: ${q ? q : 'No message'}\n\n`;
      for (let mem of members) teks += `𓅂 @${mem.id.split('@')[0]}\n`;
      await client.sendMessage(m.chat, { text: teks, mentions: members.map(a => a.id) }, { quoted: m });
    }
  },

  {
    command: ['gcprofile'],
    aliases: ['gcinfo'],
    description: 'Show group profile info',
    category: 'group',
    handler: async (client, m, { reply, convertTimestamp }) => {
      if (!m.isGroup) return reply('This command is meant for groups');
      
      let info = await client.groupMetadata(m.chat);
      let ts = await convertTimestamp(info.creation);
      let pp;
      try { pp = await client.profilePictureUrl(m.chat, 'image'); }
      catch { pp = require('path').join(__dirname, '..', 'media', 'logo-small.jpg'); }
      await client.sendMessage(m.chat, {
        image: { url: pp },
        caption:
          `_Name_ : *${info.subject}*\n\n` +
          `_ID_ : *${info.id}*\n\n` +
          `_Group owner_ : ${'@' + (info.owner || '').split('@')[0]}\n\n` +
          `_Group created_ : *${ts.day}, ${ts.date} ${ts.month} ${ts.year}, ${ts.time}*\n\n` +
          `_Participants_ : *${info.size}*\n` +
          `_Members_ : *${info.participants.filter(p => p.admin == null).length}*\n\n` +
          `_Admins_ : *${info.participants.length - info.participants.filter(p => p.admin == null).length}*\n\n` +
          `_Who can send message_ : *${info.announce ? 'Admins' : 'Everyone'}*\n\n` +
          `_Who can edit group info_ : *${info.restrict ? 'Admins' : 'Everyone'}*\n\n` +
          `_Who can add participants_ : *${info.memberAddMode ? 'Everyone' : 'Admins'}*`
      }, { quoted: m });
    }
  },

{
    command: ['add'],
    description: 'Add a member to the group',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, text, args }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!text) return reply('Please provide a number to add.\n\nExample: .add 254113821327');
      const rawNum = text.replace(/[^0-9]/g, '').trim();
      if (!rawNum) return reply('❌ Invalid number. Use digits only, e.g. .add 254113821327');
      const targetJid = rawNum + '@s.whatsapp.net';

      const sendInviteDM = async (reason) => {
        try {
          const code = await client.groupInviteCode(m.chat);
          const link = `https://chat.whatsapp.com/${code}`;
          const groupName = (await client.groupMetadata(m.chat)).subject;
          await client.sendMessage(targetJid, {
            text: `👋 Hi! You've been invited to join *${groupName}* on WhatsApp.\n\n📩 *Tap the link below to join:*\n${link}\n\n${__V.sig('invited')}`
          });
          await client.sendMessage(m.chat, {
            text: `⚠️ Couldn't add @${rawNum} directly${reason ? ` (${reason})` : ''}.\n\n📩 Invite link sent directly to their DM.`,
            mentions: [targetJid]
          }, { quoted: m });
        } catch (inviteErr) {
          try {
            const code = await client.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${code}`;
            await client.sendMessage(m.chat, {
              text: `⚠️ Couldn't add @${rawNum}${reason ? ` (${reason})` : ''} and DM delivery failed.\n\n📩 *Group invite link:*\n${link}\n\n_Share this with them manually._`,
              mentions: [targetJid]
            }, { quoted: m });
          } catch {
            reply(`❌ Failed to add @${rawNum} and couldn't generate an invite link.`);
          }
        }
      };

      try {
        const result = await client.groupParticipantsUpdate(m.chat, [targetJid], 'add');
        const status = String(result?.[0]?.status || '');
        if (status === '200') {
          await client.sendMessage(m.chat, {
            text: `✅ Successfully added @${rawNum} to the group.`,
            mentions: [targetJid]
          }, { quoted: m });
        } else if (status === '403') {
          await sendInviteDM('their privacy settings block being added');
        } else if (status === '408') {
          await client.sendMessage(m.chat, {
            text: `❌ @${rawNum} is not registered on WhatsApp.`,
            mentions: [targetJid]
          }, { quoted: m });
        } else if (status === '409') {
          await client.sendMessage(m.chat, {
            text: `ℹ️ @${rawNum} is already a member of this group.`,
            mentions: [targetJid]
          }, { quoted: m });
        } else if (status === '401') {
          await sendInviteDM('they have blocked being added to groups');
        } else {
          await sendInviteDM(`status ${status || 'unknown'}`);
        }
      } catch (err) {
        await sendInviteDM(`error: ${err.message}`);
      }
    }
  },

  {
    command: ['approve'],
    aliases: ['approveall', 'approve-all'],
    description: 'Approve pending join requests',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      const responseList = await client.groupRequestParticipantsList(m.chat);
      if (!responseList.length) return m.reply('𝗛𝘂𝗵, 𝗡𝗼 𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗷𝗼𝗶𝗻 𝗿𝗲𝗾𝘂𝗲𝘀𝘁𝘀 𝘁𝗵𝗶𝘀 𝘁𝗶𝗺𝗲!');
      for (const participan of responseList) {
        await client.groupRequestParticipantsUpdate(m.chat, [participan.jid], 'approve');
      }
      m.reply('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁𝘀 𝗵𝗮𝘃𝗲 𝗯𝗲𝗲𝗻 𝗮𝗽𝗽𝗿𝗼𝘃𝗲𝗱 𝘀𝘂𝗰𝗰𝗲𝘀𝗳𝘂𝗹𝗹𝘆✅');
    }
  },

  {
    command: ['reject'],
    aliases: ['rejectall', 'reject-all'],
    description: 'Reject pending join requests',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      const responseList = await client.groupRequestParticipantsList(m.chat);
      if (!responseList.length) return m.reply('𝗛𝘂𝗵, 𝗡𝗼 𝗽𝗲𝗻𝗱𝗶𝗻𝗴 𝗷𝗼𝗶𝗻 𝗿𝗲𝗾𝘂𝗲𝘀𝘁𝘀 𝘁𝗵𝗶𝘀 𝘁𝗶𝗺𝗲');
      for (const participan of responseList) {
        await client.groupRequestParticipantsUpdate(m.chat, [participan.jid], 'reject');
      }
      m.reply('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁𝘀 𝗵𝗮𝘃𝗲 𝗯𝗲𝗲𝗻 𝗿𝗲𝗷𝗲𝗰𝘁𝗲𝗱!');
    }
  },

  {
    command: ['remove'],
    aliases: ['kick', 'k'],
    description: 'Kick a specific member',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, botNumber }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) return m.reply('Who should i remove !?');
      let users = m.mentionedJid?.[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
      const parts = users.split('@')[0];
      if (users === '254113821327@s.whatsapp.net') return m.reply("It's an Owner Number! 😡");
      const { jidNormalizedUser } = require('@whiskeysockets/baileys');
      if (users === jidNormalizedUser(client.user.id)) return reply('I cannot remove Myself 😡');
      await client.sendMessage(m.chat, {
        text: `@${parts}, Goodbye idiot🤧`,
        mentions: [users]
      }, { quoted: m });
      await client.groupParticipantsUpdate(m.chat, [users], 'remove');
    }
  },

  {
    command: ['promote'],
    aliases: ['p'],
    description: 'Promote a member to admin',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, text }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!m.quoted && !m.mentionedJid?.length) return reply('Tag someone with the command!');
      let users = m.mentionedJid?.[0] ? m.mentionedJid : m.quoted ? [m.quoted.sender] : [text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      await client.groupParticipantsUpdate(m.chat, users, 'promote');
      m.reply('Successfully promoted! 🦄');
    }
  },

  {
    command: ['demote'],
    aliases: ['d'],
    description: 'Demote an admin to member',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, text }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      if (!m.quoted && !m.mentionedJid?.length) return reply('Tag someone with the command!');
      let users = m.mentionedJid?.[0] ? m.mentionedJid : m.quoted ? [m.quoted.sender] : [text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      await client.groupParticipantsUpdate(m.chat, users, 'demote');
      m.reply('Successfully demoted! 😲');
    }
  },

  {
    command: ['close'],
    aliases: ['mute'],
    description: 'Lock group (only admins can send)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupSettingUpdate(m.chat, 'announcement');
      m.reply('Group successfully locked!');
    }
  },

  {
    command: ['open'],
    aliases: ['unmute'],
    description: 'Unlock group (everyone can send)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);
      await client.groupSettingUpdate(m.chat, 'not_announcement');
      m.reply('Group successfully unlocked!');
    }
  },

  {
    command: ['closetime'],
    aliases: ['mutetime'],
    description: 'Close group after a set time',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, args, q }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      let timer;
      if (args[1] === 'second') timer = args[0] * 1000;
      else if (args[1] === 'minute') timer = args[0] * 60000;
      else if (args[1] === 'hour') timer = args[0] * 3600000;
      else if (args[1] === 'day') timer = args[0] * 86400000;
      else return reply('*select:*\nsecond\nminute\nhour\nday\n\n*Example*\n10 second');
      reply(`Countdown of ${q} starting from now to close the group`);
      setTimeout(() => {
        client.groupSettingUpdate(m.chat, 'announcement');
        reply('𝗚𝗿𝗼𝘂𝗽 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝗰𝗹𝗼𝘀𝗲𝗱');
      }, timer);
    }
  },

  {
    command: ['opentime'],
    aliases: ['unmutetime'],
    description: 'Open group after a set time',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, args, q }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      let timer;
      if (args[1] === 'second') timer = args[0] * 1000;
      else if (args[1] === 'minute') timer = args[0] * 60000;
      else if (args[1] === 'hour') timer = args[0] * 3600000;
      else if (args[1] === 'day') timer = args[0] * 86400000;
      else return reply('*select:*\nsecond\nminute\nhour\nday\n\n*example*\n10 second');
      reply(`Countdown of ${q} starting from now to open the group`);
      setTimeout(() => {
        client.groupSettingUpdate(m.chat, 'not_announcement');
        reply('𝗚𝗿𝗼𝘂𝗽 𝗼𝗽𝗲𝗻𝗲𝗱 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆');
      }, timer);
    }
  },

  {
    command: ['admin'],
    aliases: ['mh', 'oio', 'rrh'],
    noprefix: ['☣️', '💚', '🚫', '🐐'],
    description: 'Promote yourself to admin (Owner only)',
    category: 'group',
    handler: async (client, m, { Owner, group, isBotAdmin }) => {
      if (!m.isGroup) return m.reply(group);
      if (!isBotAdmin) return;
      if (!Owner) return;
      await client.groupParticipantsUpdate(m.chat, [m.sender], 'promote');
    }
  },

  {
    command: ['kill'],
    aliases: ['kickall', 'kick-all'],
    description: 'Nuclear kick — mutes, strips group info, removes all, leaves (Owner only)',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, Owner, NotOwner, groupMetadata }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!Owner) return m.reply(NotOwner);
      const { jidNormalizedUser } = require('@whiskeysockets/baileys');
      
      const botJid = jidNormalizedUser(client.user.id);
      
      const raveni = groupMetadata.participants.filter(p => jidNormalizedUser(p.id) !== botJid);
      m.reply('Initializing Kill command💀...');
      await client.groupSettingUpdate(m.chat, 'announcement');
      await client.removeProfilePicture(m.chat).catch(() => {});
      await client.groupUpdateSubject(m.chat, '𝗧𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗶𝘀 𝗻𝗼 𝗹𝗼𝗻𝗴𝗲𝗿 𝗮𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 🚫');
      await client.groupUpdateDescription(m.chat, 'I was onced a good person 😔!');
      await client.groupRevokeInvite(m.chat);
      setTimeout(async () => {
        await client.sendMessage(m.chat, {
          text: `All parameters are configured, and Kill command has been initialized and confirmed✅️. Now, all ${raveni.length} group participants will be removed in the next second.\n\nGoodbye Everyone 👋\n\nTHIS PROCESS IS IRREVERSIBLE ⚠️`
        }, { quoted: m });
      
        const ids = raveni.map(p => p.id);
        const batchSize = 20;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          try {
            await client.groupParticipantsUpdate(m.chat, batch, 'remove');
          } catch (e) {}
          await new Promise(r => setTimeout(r, 1500));
        }
        await client.sendMessage(m.chat, {
          text: 'Successfully removed all group participants✅️.\n\nGoodbye group owner 👋, its too cold in here 🥶.'
        });
        await client.groupLeave(m.chat);
      }, 1000);
    }
  }, 

  {
    command: ['kill2', 'kickall2'],
    aliases: ['kickall2', 'kick-all2'],
    description: 'Nuclear kick a remote group by invite link (Owner only)',
    category: 'group',
    handler: async (client, m, { reply, Owner, NotOwner, text, args }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!text) return m.reply('Provide a valid group link. Ensure the bot is in that group with admin privileges!');
      let groupId, groupName;
      try {
        let inviteCode = args[0].split('https://chat.whatsapp.com/')[1];
        const groupInfo = await client.groupGetInviteInfo(inviteCode);
        ({ id: groupId, subject: groupName } = groupInfo);
      } catch {
        return m.reply('Why are you giving me an invalid group link?');
      }
      try {
        const { jidNormalizedUser } = require('@whiskeysockets/baileys');
        const groupMetadata = await client.groupMetadata(groupId);
        const botJid = jidNormalizedUser(client.user.id);
        const nicko = groupMetadata.participants.filter(p => p.id !== botJid).map(p => p.id);
        await m.reply(`☠️Initializing and Preparing to kill☠️ ${groupName}`);
        await client.groupSettingUpdate(groupId, 'announcement');
        await client.removeProfilePicture(groupId);
        await client.groupUpdateSubject(groupId, '𝗧𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗶𝘀 𝗻𝗼 𝗹𝗼𝗻𝗴𝗲𝗿 𝗮𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 🚫');
        await client.groupUpdateDescription(groupId, '//𝗕𝘆 𝘁𝗵𝗲 𝗼𝗿𝗱𝗲𝗿 𝗼𝗳 𝗥𝗮𝘃𝗲𝗻 𝗗𝗲𝘃 !');
        await client.groupRevokeInvite(groupId);
        await client.sendMessage(groupId, {
          text: `At this time, My owner has initiated kill command remotely.\nThis has triggered me to remove all ${nicko.length} group participants in the next second.\n\nGoodbye Everyone! 👋\n\n⚠️THIS PROCESS CANNOT BE TERMINATED⚠️`,
          mentions: nicko
        });
        await client.groupParticipantsUpdate(groupId, nicko, 'remove');
        await client.sendMessage(groupId, { text: 'Goodbye Group owner👋\nIt\'s too cold in Here🥶' });
        await client.groupLeave(groupId);
        await m.reply('```Successfully Killed💀```');
      } catch {
        m.reply('```Kill command failed, bot is either not in that group, or not an admin```.');
      }
    }
  },

    {
    command: ['foreigners'],
    description: 'List or remove members with foreign country codes',
    category: 'group',
    handler: async (client, m, { reply, admin, group, botAdmin, isAdmin, isBotAdmin, groupMetadata, args }) => {
      if (!m.isGroup) return reply(group);
      if (!isAdmin) return reply(admin);
      if (!isBotAdmin) return reply(botAdmin);
      const { jidNormalizedUser } = require('@whiskeysockets/baileys');
      const { mycode } = require('../set');
      const botJid = jidNormalizedUser(client.user.id);
      const code = mycode || '254';

      const foreigners = groupMetadata.participants
        .filter(p => !p.admin)
        .filter(p => {
          if (!p.id) return false;
          if (jidNormalizedUser(p.id) === botJid) return false;
          const phone = p.pn ? String(p.pn) : p.id.split('@')[0].split(':')[0];
          return !phone.startsWith(code);
        });

      const foreignerIds = foreigners.map(p => p.id);

      if (!args || !args[0]) {
        if (foreigners.length === 0) return m.reply(`No foreigners detected. (Country code: ${code})`);
        let msg = `𝗙𝗼𝗿𝗲𝗶𝗴𝗻𝗲𝗿𝘀 𝗮𝗿𝗲 𝗺𝗲𝗺𝗯𝗲𝗿𝘀 𝘄𝗵𝗼𝘀𝗲 𝗰𝗼𝘂𝗻𝘁𝗿𝘆 𝗰𝗼𝗱𝗲 𝗶𝘀 𝗻𝗼𝘁 ${code}. 𝗧𝗵𝗲 𝗳𝗼𝗹𝗹𝗼𝘄𝗶𝗻𝗴 ${foreigners.length} 𝗳𝗼𝗿𝗲𝗶𝗴𝗻𝗲𝗿𝘀 𝘄𝗲𝗿𝗲 𝗱𝗲𝘁𝗲𝗰𝘁𝗲𝗱:- \n`;
        for (const p of foreigners) {
          const phone = p.pn ? String(p.pn) : p.id.split('@')[0];
          msg += `𓅂 @${phone}\n`;
        }
        msg += `\n𝗧𝗼 𝗿𝗲𝗺𝗼𝘃𝗲 𝘁𝗵𝗲𝗺 𝘀𝗲𝗻𝗱 *foreigners -x*`;
        client.sendMessage(m.chat, { text: msg, mentions: foreignerIds }, { quoted: m });
      } else if (args[0] === '-x') {
        await client.sendMessage(m.chat, {
          text: `𝐒𝐌𝐈𝐋𝐄𝐘 𝐂𝐘𝐌𝐎𝐑 𝐌𝐃 𝘄𝗶𝗹𝗹 𝗻𝗼𝘄 𝗿𝗲𝗺𝗼𝘃𝗲 𝗮𝗹𝗹 ${foreigners.length} 𝗙𝗼𝗿𝗲𝗶𝗴𝗻𝗲𝗿𝘀 𝗳𝗿𝗼𝗺 𝘁𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗰𝗵𝗮𝘁.\n\n𝗚𝗼𝗼𝗱𝗯𝘆𝗲 𝗙𝗼𝗿𝗲𝗶𝗴𝗻𝗲𝗿𝘀 ⚠️`
        }, { quoted: m });
        const batchSize = 5;
        for (let i = 0; i < foreignerIds.length; i += batchSize) {
          const batch = foreignerIds.slice(i, i + batchSize);
          try { await client.groupParticipantsUpdate(m.chat, batch, 'remove'); } catch (e) {}
          await new Promise(r => setTimeout(r, 1500));
        }
        m.reply('𝗔𝗻𝘆 𝗿𝗲𝗺𝗮𝗶𝗻𝗶𝗻𝗴 𝗙𝗼𝗿𝗲𝗶𝗴𝗻𝗲𝗿 ?🌚.');
      }
    }
  },

    {
    command: ['listonline'],
    aliases: ['listactive', 'activeusers', 'online'],
    description: 'Show most active users in the group by message count',
    category: 'group',
    handler: async (client, m, { reply, group, isAdmin, admin, isBotAdmin, botAdmin, from, groupMetadata }) => {
      if (!m.isGroup) return reply(group);
      if (!isBotAdmin) return reply(botAdmin);
      if (!isAdmin) return reply(admin);

      const activeUsers = global.getActiveUsers(from, 15);

      if (!activeUsers.length) {
        return m.reply('📊 *No active users found yet.*\n\nMembers need to send messages first for tracking to build up!');
      }

      const groupName = groupMetadata?.subject || 'This Group';
      let message = `📊 *ACTIVE USERS — ${groupName}*\n\n`;

      for (let i = 0; i < activeUsers.length; i++) {
        const { jid, count } = activeUsers[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
        const p = groupMetadata?.participants?.find(p => p.id === jid);
        const phone = p?.pn ? String(p.pn) : jid.split('@')[0];
        message += `${medal} ${i + 1}. @${phone} — *${count} messages*\n`;
      }

      message += `\n📈 *Total Active users:* ${activeUsers.length}`;

      await client.sendMessage(m.chat, {
        text: message,
        mentions: activeUsers.map(u => u.jid)
      }, { quoted: m });
    }
  },

  {
    command: ['join'],
    aliases: ['joingc'],
    description: 'Join a group via invite link (Owner only)',
    category: 'group',
    handler: async (client, m, { Owner, NotOwner, reply, args, text }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!text) return reply('Provide a valid group link');
      let result = args[0].split('https://chat.whatsapp.com/')[1];
      await client.groupAcceptInvite(result)
        .then(res => reply(JSON.stringify(res)))
        .catch(() => reply('Link has a problem.'));
    }
  },
  
{
    command: ['poll'],
    description: 'Create a group poll',
    category: 'group',
    handler: async (client, m, { reply, text, group }) => {
      if (!m.isGroup) return reply(group);
      if (!text) return reply('Format: .poll Question | Option1 | Option2 | ...');
      const parts = text.split('|').map(p => p.trim());
      if (parts.length < 3) return reply('Provide at least a question and 2 options.\nE.g: .poll Best fruit? | Apple | Mango | Banana');
      const [question, ...options] = parts;
      await client.sendMessage(m.chat, { poll: { name: question, values: options, selectableCount: 1 } }, { quoted: m });
    }
  },

  {
    command: ['vcf'],
    aliases: ['groupvcf', 'group-vcf'],
    description: 'Export group contacts as VCF',
    category: 'group',
        handler: async (client, m, { reply, group, store }) => {
      if (!m.isGroup) return m.reply('Command meant for groups');
      const fs = require('fs');
      try {
        const metadata = await client.groupMetadata(m.chat);
        const participants = metadata.participants || [];
        let vcard = '';
        let no = 0;
        for (const p of participants) {
          let num = null;
          if (p.pn) {
            num = p.pn.replace(/[^0-9]/g, '');
          } else if (p.id && !p.id.includes('@lid')) {
            num = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
          }
          if (!num) continue;

          const jidKey  = num + '@s.whatsapp.net';
          const contact = store?.contacts?.[jidKey] || store?.contacts?.[p.id] || {};
          const name    = contact.name || contact.notify || `+${num}`;

          vcard +=
            `BEGIN:VCARD\n` +
            `VERSION:3.0\n` +
            `FN:${name}\n` +
            `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\n` +
            `END:VCARD\n`;
          no++;
        }
        const filePath = './contacts.vcf';
        await m.reply(`⏳ Compiling ${participants.length} contacts...`);
        fs.writeFileSync(filePath, vcard.trim());
        await client.sendMessage(m.chat, {
          document: fs.readFileSync(filePath),
          mimetype: 'text/vcard',
          fileName: 'Group Contacts.vcf',
                    caption: `📋 VCF for *${metadata.subject}*\n✅ ${no} contacts exported`
        }, { quoted: m });
        fs.unlinkSync(filePath);
      } catch (err) {
        m.reply('❌ Failed to generate VCF.');
      }
     }
  },

  {
    command: ['groupstatus'],
    aliases: ['togroupstatus', 'statusgroup', 'gcstatus'],
    noprefix: ['gss', 'gcs'],
    description: 'Send a message/media to group status',
    category: 'group',
    handler: async (client, m, { reply, Owner, NotOwner, group, text }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!m.isGroup) return reply(group);
      if (!text && !m.quoted) {
        return m.reply(
          '📌 Usage:\n' +
          '• togroupstatus <text>\n' +
          '• Reply to an image/video/audio/document/sticker with togroupstatus <caption>\n' +
          '• Or just togroupstatus to forward quoted media without caption'
        );
      }
      try {
        const fs = require('fs');
        let payload = { groupStatusMessage: {} };
        if (m.quoted) {
          const qtype = m.quoted.mtype || '';
          if (qtype === 'imageMessage') {
            const caption = text || m.quoted.msg?.caption || '';
            const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
            payload.groupStatusMessage.image = { url: filePath };
            if (caption) payload.groupStatusMessage.caption = caption;
          } else if (qtype === 'videoMessage') {
            const caption = text || m.quoted.msg?.caption || '';
            const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
            payload.groupStatusMessage.video = { url: filePath };
            if (caption) payload.groupStatusMessage.caption = caption;
          } else if (qtype === 'audioMessage') {
            const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
            const opusPath = filePath + '_converted.ogg';
            await new Promise((resolve, reject) => {
              require('fluent-ffmpeg')(filePath)
                .audioCodec('libopus')
                .audioBitrate(128)
                .toFormat('ogg')
                .on('end', resolve)
                .on('error', reject)
                .save(opusPath);
            });
            try { fs.unlinkSync(filePath); } catch (e) {}
            payload.groupStatusMessage.audio = { url: opusPath };
            payload._opusCleanup = opusPath;
          } else if (qtype === 'documentMessage') {
            const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
            payload.groupStatusMessage.document = { url: filePath };
          } else if (qtype === 'stickerMessage') {
            const filePath = await client.downloadAndSaveMediaMessage(m.quoted);
            payload.groupStatusMessage.sticker = { url: filePath };
          } else if (m.quoted.text) {
            payload.groupStatusMessage.text = m.quoted.text;
          }
          if (text && !payload.groupStatusMessage.caption) {
            payload.groupStatusMessage.caption = text;
          }
        } else {
          payload.groupStatusMessage.text = text;
        }
        const opusCleanup = payload._opusCleanup;
        delete payload._opusCleanup;
        await client.sendMessage(m.chat, payload, { quoted: m });
        if (opusCleanup) try { fs.unlinkSync(opusCleanup); } catch (e) {}
      } catch (err) {
        m.reply(`❌ Error sending group status: ${err.message}`);
      }
    }
  },
  
];
