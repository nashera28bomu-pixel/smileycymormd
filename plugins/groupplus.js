'use strict';
/**
 * SMILEY CYMOR MD — Squad Control extras + Owner privacy tools
 * New commands: warn, warnings, resetwarn, tagadmin, tagnotadmin, staff, topmembers, groupinfo,
 *               getprivacy, privacy, setbio, setname, listgc, iswa, getjid
 */
const S = require('../lib/style');
const db = require('../lib/jsondb');
const { target, tag, num } = require('../lib/cmdutil');

const WARN_LIMIT = Number(process.env.WARN_LIMIT || 3);
const warnsOf = (chat, jid) => { const d = db.load('warns'); return (d[chat] && d[chat][num(jid)]) || 0; };
const setWarns = (chat, jid, n) => { const d = db.load('warns'); d[chat] = d[chat] || {}; if (n > 0) d[chat][num(jid)] = n; else delete d[chat][num(jid)]; db.save('warns'); };

module.exports = [
  {
    command: ['warn'], category: 'group', description: 'Warn a member — kicked automatically at the limit',
    handler: async (client, m, { text, prefix, isAdmin, isBotAdmin, admin, group, botAdmin }) => {
      if (!m.isGroup) return m.reply(group);
      if (!isAdmin) return m.reply(admin);
      const t = target(m, text);
      if (!t) return m.reply(S.voice.usage(prefix + 'warn @user reason'));
      const reason = String(text || '').replace(/@\d+/g, '').trim() || 'no reason given';
      const n = warnsOf(m.chat, t) + 1;
      if (n >= WARN_LIMIT) {
        setWarns(m.chat, t, 0);
        if (!isBotAdmin) return client.sendMessage(m.chat, { text: `🚫 ${tag(t)} reached ${WARN_LIMIT} warnings but ${botAdmin}`, mentions: [t] }, { quoted: m });
        await client.sendMessage(m.chat, { text: `🚫 ${tag(t)} hit *${WARN_LIMIT}/${WARN_LIMIT}* warnings and is out.\n📝 ${reason}`, mentions: [t] }, { quoted: m });
        return client.groupParticipantsUpdate(m.chat, [t], 'remove').catch(() => {});
      }
      setWarns(m.chat, t, n);
      await client.sendMessage(m.chat, { text: `⚠️ ${S.scriptLite('Warning')} *${n}/${WARN_LIMIT}* for ${tag(t)}\n📝 ${reason}`, mentions: [t] }, { quoted: m });
    },
  },
  {
    command: ['warnings'], aliases: ['checkwarn'], category: 'group', description: 'See how many warnings someone has',
    handler: async (client, m, { text, group }) => {
      if (!m.isGroup) return m.reply(group);
      const t = target(m, text) || m.sender;
      await client.sendMessage(m.chat, { text: `📋 ${tag(t)} ${S.small('has')} *${warnsOf(m.chat, t)}/${WARN_LIMIT}* ${S.small('warnings')}`, mentions: [t] }, { quoted: m });
    },
  },
  {
    command: ['resetwarn'], aliases: ['clearwarn'], category: 'group', description: 'Clear a member\'s warnings',
    handler: async (client, m, { text, isAdmin, admin, group }) => {
      if (!m.isGroup) return m.reply(group);
      if (!isAdmin) return m.reply(admin);
      const t = target(m, text);
      if (!t) return m.reply(S.voice.usage('resetwarn @user'));
      setWarns(m.chat, t, 0);
      await client.sendMessage(m.chat, { text: `♻️ Warnings cleared for ${tag(t)}`, mentions: [t] }, { quoted: m });
    },
  },
  {
    command: ['tagadmin'], aliases: ['calladmins'], category: 'group', description: 'Ping every group admin',
    handler: async (client, m, { text, group, groupAdmin }) => {
      if (!m.isGroup) return m.reply(group);
      const ids = groupAdmin || [];
      if (!ids.length) return m.reply('🫥 No admins found.');
      await client.sendMessage(m.chat, { text: `🛎️ ${S.scriptLite('Admin call')}\n${text ? '💬 ' + text + '\n' : ''}\n${ids.map(j => '▪️ ' + tag(j)).join('\n')}`, mentions: ids }, { quoted: m });
    },
  },
  {
    command: ['tagnotadmin'], aliases: ['tagmembers'], category: 'group', description: 'Ping everyone who is not an admin',
    handler: async (client, m, { text, group, admin, isAdmin, participants, groupAdmin }) => {
      if (!m.isGroup) return m.reply(group);
      if (!isAdmin) return m.reply(admin);
      const ids = (participants || []).map(p => p.id || p).filter(j => !(groupAdmin || []).includes(j));
      if (!ids.length) return m.reply('🫥 Everyone here is an admin.');
      await client.sendMessage(m.chat, { text: `📣 ${S.scriptLite('Members only')}\n${text ? '💬 ' + text + '\n' : ''}\n${ids.map(j => '▪️ ' + tag(j)).join('\n')}`, mentions: ids }, { quoted: m });
    },
  },
  {
    command: ['staff'], category: 'group', description: 'List the group admins',
    handler: async (client, m, { group, groupAdmin, groupMetadata }) => {
      if (!m.isGroup) return m.reply(group);
      const ids = groupAdmin || [];
      const owner = groupMetadata && groupMetadata.owner;
      await client.sendMessage(m.chat, { text: `👮 ${S.scriptLite('Group staff')} (${ids.length})\n\n${ids.map(j => `${j === owner ? '👑' : '🛡️'} ${tag(j)}`).join('\n')}`, mentions: ids }, { quoted: m });
    },
  },
  {
    command: ['topmembers'], aliases: ['chatty'], category: 'group', description: 'Most active members since the bot started',
    handler: async (client, m, { group }) => {
      if (!m.isGroup) return m.reply(group);
      const top = (global.getActiveUsers ? global.getActiveUsers(m.chat, 10) : []);
      if (!top.length) return m.reply('🫥 Not enough chat activity yet.');
      const medals = ['🥇', '🥈', '🥉'];
      await client.sendMessage(m.chat, { text: `🔥 ${S.scriptLite('Chattiest members')}\n\n${top.map((u, i) => `${medals[i] || '▪️'} ${tag(u.jid)} — ${u.count} msgs`).join('\n')}`, mentions: top.map(u => u.jid) }, { quoted: m });
    },
  },
  {
    command: ['groupinfo'], aliases: ['ginfo'], category: 'group', description: 'Full group details',
    handler: async (client, m, { group, groupMetadata, groupAdmin }) => {
      if (!m.isGroup) return m.reply(group);
      const g = groupMetadata || await client.groupMetadata(m.chat);
      const created = g.creation ? new Date(g.creation * 1000).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric' }) : 'unknown';
      let pp; try { pp = await client.profilePictureUrl(m.chat, 'image'); } catch (_) {}
      const caption = `╭━━❰ 🏘️ ${S.scriptLite('Group card')} ❱━━╮\n┃ 🏷️ ${S.small('name')}    ❯ ${g.subject}\n┃ 👥 ${S.small('members')} ❯ ${g.participants.length}\n┃ 🛡️ ${S.small('admins')}  ❯ ${(groupAdmin || []).length}\n┃ 📅 ${S.small('created')} ❯ ${created}\n┃ 🔒 ${S.small('mode')}    ❯ ${g.announce ? 'admins only' : 'everyone can chat'}\n╰━━━━━━━━━━━━━━━━━━━╯${g.desc ? '\n\n📝 ' + g.desc : ''}`;
      if (pp) return client.sendMessage(m.chat, { image: { url: pp }, caption }, { quoted: m });
      m.reply(caption);
    },
  },

  // ── owner tools ──
  {
    command: ['getprivacy'], category: 'owner', description: 'Owner: view the bot account\'s privacy settings',
    handler: async (client, m, { Owner, NotOwner }) => {
      if (!Owner) return m.reply(NotOwner);
      const p = await client.fetchPrivacySettings(true);
      m.reply(`🔐 ${S.scriptLite('Privacy settings')}\n\n${Object.entries(p).map(([k, v]) => `▪️ ${S.small(k)} ❯ ${v}`).join('\n')}`);
    },
  },
  {
    command: ['privacy'], category: 'owner', description: 'Owner: change a privacy setting (lastseen, online, profile, status, readreceipts, groupadd)',
    handler: async (client, m, { Owner, NotOwner, args, prefix }) => {
      if (!Owner) return m.reply(NotOwner);
      const [what, val] = (args || []).map(a => a.toLowerCase());
      const map = {
        lastseen: ['updateLastSeenPrivacy', ['all', 'contacts', 'contact_blacklist', 'none']],
        online: ['updateOnlinePrivacy', ['all', 'match_last_seen']],
        profile: ['updateProfilePicturePrivacy', ['all', 'contacts', 'contact_blacklist', 'none']],
        status: ['updateStatusPrivacy', ['all', 'contacts', 'contact_blacklist', 'none']],
        readreceipts: ['updateReadReceiptsPrivacy', ['all', 'none']],
        groupadd: ['updateGroupsAddPrivacy', ['all', 'contacts', 'contact_blacklist']],
      };
      const e = map[what];
      if (!e || !e[1].includes(val)) {
        return m.reply(`${S.voice.usage(prefix + 'privacy <setting> <value>')}\n\n${Object.entries(map).map(([k, v]) => `▪️ *${k}* ❯ ${v[1].join(' | ')}`).join('\n')}`);
      }
      await client[e[0]](val);
      m.reply(`✅ *${what}* ${S.italic('is now')} *${val}*`);
    },
  },
  {
    command: ['setbio'], category: 'owner', description: 'Owner: change the bot\'s About text',
    handler: async (client, m, { Owner, NotOwner, text, prefix }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!text) return m.reply(S.voice.usage(prefix + 'setbio your new about'));
      await client.updateProfileStatus(text);
      m.reply('✅ About updated.');
    },
  },
  {
    command: ['setname'], category: 'owner', description: 'Owner: change the bot\'s profile name',
    handler: async (client, m, { Owner, NotOwner, text, prefix }) => {
      if (!Owner) return m.reply(NotOwner);
      if (!text) return m.reply(S.voice.usage(prefix + 'setname New Name'));
      await client.updateProfileName(text);
      m.reply('✅ Profile name updated.');
    },
  },
  {
    command: ['listgc'], aliases: ['mygroups'], category: 'owner', description: 'Owner: list every group the bot is in',
    handler: async (client, m, { Owner, NotOwner }) => {
      if (!Owner) return m.reply(NotOwner);
      const all = Object.values(await client.groupFetchAllParticipating());
      if (!all.length) return m.reply('🫥 Not in any group.');
      m.reply(`🏘️ ${S.scriptLite('Groups')} (${all.length})\n\n${all.map((g, i) => `${i + 1}. ${g.subject}\n   ╰ ${g.participants.length} members · ${g.id}`).join('\n')}`);
    },
  },
  {
    command: ['iswa'], aliases: ['onwa', 'checkwa'], category: 'utility', description: 'Check if numbers are on WhatsApp',
    handler: async (client, m, { text, prefix }) => {
      const nums = String(text || '').match(/\d{8,15}/g);
      if (!nums) return m.reply(S.voice.usage(prefix + 'iswa 254712345678'));
      const res = await client.onWhatsApp(...nums.slice(0, 15).map(n => n + '@s.whatsapp.net'));
      const ok = new Map((res || []).map(r => [num(r.jid), r.exists]));
      m.reply(`📲 ${S.scriptLite('WhatsApp check')}\n\n${nums.slice(0, 15).map(n => `${ok.get(n) ? '✅' : '❌'} ${n}`).join('\n')}`);
    },
  },
  {
    command: ['getjid'], aliases: ['jid'], category: 'utility', description: 'Show the JID of this chat, a user, or a channel link',
    handler: async (client, m, { text }) => {
      const link = String(text || '').match(/whatsapp\.com\/channel\/([\w-]+)/);
      if (link) {
        try { const meta = await client.newsletterMetadata('invite', link[1]); return m.reply(`📢 *${meta.name}*\n${meta.id}`); } catch (e) { return m.reply(S.voice.err('could not read that channel.')); }
      }
      const t = target(m, text);
      m.reply(`🆔 ${S.small('chat')} ❯ ${m.chat}\n${t ? `👤 ${S.small('user')} ❯ ${t}` : `👤 ${S.small('you')}  ❯ ${m.sender}`}`);
    },
  },
];
