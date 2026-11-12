const __V = require('../lib/style').voice;
module.exports = [
    {
    command: ['hack'],
    aliases: ['prank'],
    description: 'Fake hacking animation',
    category: 'others',
    handler: async (client, m, { reply, quoted, pushname }) => {
      try {
        // ── helpers ────────────────────────────────────────────────────────
        const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const ip  = () => `${rnd(1,254)}.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,254)}`;
        const mac = () => Array.from({length:6}, () => rnd(0,255).toString(16).padStart(2,'0')).join(':');
        const hex = (len) => Array.from({length:len}, () => rnd(0,255).toString(16).padStart(2,'0')).join('');
        const port = () => [21,22,23,25,80,443,3306,5432,8080,8443][rnd(0,9)];
        const pick = arr => arr[rnd(0, arr.length - 1)];

        const target     = m.mentionedJid?.[0]?.replace('@s.whatsapp.net','') || pushname || 'Target';
        const targetIp   = ip();
        const attackerIp = ip();
        const targetMac  = mac();
        const sessionKey = hex(16);
        const pass       = pick(['P@$$w0rd!','Tr0ub4dor&3','c0rr3ct-h0rs3','S3cur3#2024','hunter2★','CymorM@trix9']);

        const sleep = ms => new Promise(r => setTimeout(r, ms));

        // ── send initial message then edit it ─────────────────────────────
        const sent = await client.sendMessage(m.chat, {
          text: '```[SMILEY CYMOR MD] Initializing attack sequence...```'
        }, { quoted: m });

        const edit = async (text) => {
          await client.sendMessage(m.chat, { text, edit: sent.key });
          await sleep(1800);
        };

        // ── Phase 1: Reconnaissance ────────────────────────────────────────
        await edit(
`\`\`\`
[SMILEY CYMOR MD v3.0] Attack Console
══════════════════════════════
[*] Target    : ${target}
[*] Target IP : ${targetIp}
[*] Attacker  : ${attackerIp}
[*] Status    : SCANNING...
\`\`\``);

        await edit(
`\`\`\`
[RECON] Port scanning ${targetIp}...
> nmap -sV -p- ${targetIp}

PORT     STATE  SERVICE   VERSION
${port()}/tcp  open   ssh       OpenSSH 8.2
${port()}/tcp  open   http      Apache 2.4.41
${port()}/tcp  open   mysql     MySQL 8.0.27
3306/tcp open   mysql     MySQL 8.0.27

[+] 4 open ports found
\`\`\``);

        await edit(
`\`\`\`
[RECON] Fingerprinting device...
> arp-scan ${targetIp}

MAC Address : ${targetMac}
Device OS   : Android 13 (Tiramisu)
Vendor      : ${pick(['Samsung','Xiaomi','Tecno','Infinix','OnePlus','Motorola'])}
Signal      : ${rnd(60,99)}%
[+] Device fingerprint captured
\`\`\``);

        // ── Phase 2: Exploitation ──────────────────────────────────────────
        await edit(
`\`\`\`
[EXPLOIT] Injecting payload...
> msf > use exploit/android/browser/webview_rce
> set RHOST ${targetIp}
> set LHOST ${attackerIp}
> run

[*] Started reverse handler on ${attackerIp}:4444
[*] Sending stage to ${targetIp}...
[*] Meterpreter session opened ✓
\`\`\``);

        await edit(
`\`\`\`
[SESSION] Establishing tunnel...
> Encrypting channel... AES-256
> Session key : ${sessionKey}
> Ping        : ${rnd(12,89)}ms

[████████████████████] 100%
[+] Secure tunnel established ✓
\`\`\``);

        // ── Phase 3: Data extraction ───────────────────────────────────────
        await edit(
`\`\`\`
[EXTRACT] Dumping credentials...
> hashdump

Username    : ${target.toLowerCase().replace(/\s/g,'')}
Password    : ${pass}
Hash (MD5)  : ${hex(16)}
Last login  : ${new Date().toISOString().slice(0,10)}

[+] Credentials extracted ✓
\`\`\``);

        await edit(
`\`\`\`
[EXTRACT] Accessing file system...
> ls /sdcard/

📁 DCIM/Camera   [${rnd(200,999)} files, ${rnd(1,9)}.${rnd(1,9)}GB]
📁 WhatsApp/     [${rnd(50,300)} chats, ${rnd(100,500)} media]
📁 Downloads/    [${rnd(10,80)} files]
📄 contacts.vcf  [${rnd(50,500)} contacts]
📄 passwords.txt ← 👀

[+] File system mapped ✓
\`\`\``);

        await edit(
`\`\`\`
[EXTRACT] Cloning WhatsApp session...
> wa-clone --target ${targetIp} --session

Copying msgstore.db    ████████ ✓
Copying wa.db          ████████ ✓  
Copying media files    ████████ ✓
Exfiltrating to C2...  ████████ ✓

[+] ${rnd(1000,9999)} messages extracted ✓
\`\`\``);

        // ── Phase 4: Cover tracks ──────────────────────────────────────────
        await edit(
`\`\`\`
[CLEANUP] Covering tracks...
> clearlog --all --force

Wiping bash history    ✓
Flushing ARP cache     ✓
Removing temp files    ✓
Closing tunnels        ✓
Spoofing timestamps    ✓

[+] All traces removed ✓
\`\`\``);

        // ── Final report ───────────────────────────────────────────────────
        await client.sendMessage(m.chat, {
          text: `*[SMILEY CYMOR MD] HACK COMPLETE* 💀\n\n` +
                `┌─────────────────────────┐\n` +
                `│  🎯 Target   : ${target}\n` +
                `│  🌐 IP       : ${targetIp}\n` +
                `│  🔑 Password : ${pass}\n` +
                `│  📱 MAC      : ${targetMac}\n` +
                `│  💬 Messages : ${rnd(1000,9999)} stolen\n` +
                `│  📸 Photos   : ${rnd(200,999)} stolen\n` +
                `│  ⏱️ Duration  : ${rnd(8,30)}s\n` +
                `└─────────────────────────┘\n\n` +
                `_This is a prank — no actual hacking occurred_ 😂`
        }, { quoted: m });

      } catch (err) {
        reply('❌ Hack failed: ' + err.message);
      }
    }
  },

  {
    command: ['inspect'],
    aliases: ['source'],
    description: 'Inspect a website — fetch its HTML, CSS, and JS',
    category: 'others',
    handler: async (client, m, { reply, text }) => {
      const cheerio = require('cheerio');
      if (!text) return m.reply('Provide a valid web link to fetch!');
      if (!/^https?:\/\//i.test(text)) return m.reply('Please provide a URL starting with http:// or https://');
      try {
        const response = await fetch(text);
        const html = await response.text();
        const $ = cheerio.load(html);
        const cssFiles = [];
        $('link[rel="stylesheet"]').each((_, el) => { let href = $(el).attr('href'); if (href) cssFiles.push(href); });
        const jsFiles = [];
        $('script[src]').each((_, el) => { let src = $(el).attr('src'); if (src) jsFiles.push(src); });
        await m.reply(`**Full HTML Content**:\n\n${html}`);
        if (cssFiles.length > 0) {
          for (const cssFile of cssFiles) {
            const cssResponse = await fetch(new URL(cssFile, text));
            const cssContent = await cssResponse.text();
            await m.reply(`**CSS File Content**:\n\n${cssContent}`);
          }
        } else {
          await m.reply('No external CSS files found.');
        }
        if (jsFiles.length > 0) {
          for (const jsFile of jsFiles) {
            const jsResponse = await fetch(new URL(jsFile, text));
            const jsContent = await jsResponse.text();
            await m.reply(`**JavaScript File Content**:\n\n${jsContent}`);
          }
        } else {
          await m.reply('No external JavaScript files found.');
        }
      } catch (err) {
        m.reply('Failed to inspect the URL: ' + err.message);
      }
    }
  },

  {
    command: ['dlt'],
    aliases: ['dil'],
    description: "Delete the bot's own quoted message",
    category: 'others',
    handler: async (client, m, { reply }) => {
      if (!m.quoted) return reply('No message quoted for deletion');
      let { isBaileys } = m.quoted;
      if (isBaileys) return reply('I cannot delete. Quoted message is my message or another bot message.');
      client.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: true, id: m.quoted.id, participant: m.quoted.sender } });
    }
  },
  
  {
    command: ['news'],
    aliases: ['technews'],
    description: 'Get a random BBC tech news article',
    category: 'others',
    handler: async (client, m, { reply }) => {
      try {
        const cheerio = require('cheerio');
        const rssRes = await global.axios.get('https://feeds.bbci.co.uk/news/technology/rss.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(rssRes.data, { xmlMode: true });
        const items = [];
        $('item').each((_, el) => {
          const title       = $(el).find('title').text();
          const description = $(el).find('description').text();
          const link        = $(el).find('link').text();
          const pubDate     = $(el).find('pubDate').text();
          const thumbnail   = $(el).find('media\\:thumbnail, thumbnail').attr('url') || 'https://news.bbcimg.co.uk/nol/shared/img/bbc_news_120x60.gif';
          if (title) items.push({ title, description, link, pubDate, thumbnail });
        });
        if (!items.length) return reply('❌ Could not fetch news right now. Try again later.');
        const article = items[Math.floor(Math.random() * items.length)];
        const caption =
          `📰 *${article.title}*\n\n${article.description}\n\n🗓️ ${article.pubDate}\n🔗 ${article.link}`;
        await client.sendMessage(m.chat, { image: { url: article.thumbnail }, caption }, { quoted: m });
      } catch (err) {
        reply('❌ Failed to fetch news. Please try again.');
      }
    }
  },

  {
    command: ['anime'],
    aliases: ['random-anime'],
    description: 'Get a random anime',
    category: 'others',
    handler: async (client, m, { reply }) => {
      try {
        const response = await global.axios.get('https://api.jikan.moe/v4/random/anime');
        const data = response.data.data;
        const title = data.title;
        const synopsis = data.synopsis;
        const imageUrl = data.images.jpg.image_url;
        const episodes = data.episodes;
        const status = data.status;
        const message = `📺 Title: ${title}\n🎬 Épisodes: ${episodes}\n📡 Status: ${status}\n📝 Synopsis: ${synopsis}\n🔗 URL: ${data.url}`;
        await client.sendMessage(m.chat, { image: { url: imageUrl }, caption: message }, { quoted: m });
      } catch {
        m.reply('𝗢𝗼𝗽𝘀 𝗘𝗿𝗿𝗼𝗿!');
      }
    }
  },

  {
    command: ['mail'],
    aliases: ['tempmail', 'getmail'],
    description: 'Create a temporary email address',
    category: 'others',
    handler: async (client, m, { reply }) => {
      try {
        const res = await global.axios.get('https://apis.xcasper.space/api/tempmail?action=create');
        if (!res.data.success) return m.reply('Failed to create temp email. Try again.');
        const { email, token } = res.data;
        const tokenMsg = await client.sendMessage(m.chat, { text: token }, { quoted: m });
        await client.sendMessage(m.chat, {
          text: `📧 *Temp Email Created*\n\n*Email:* ${email}\n\n_Quoted message is your token._\nTo check your inbox use:\n*.inbox ${email} <your-token>*`
        }, { quoted: tokenMsg });
      } catch (e) {
        m.reply('Failed to generate temp email. Try again later.');
      }
    }
  },

  {
    command: ['inbox'],
    aliases: ['chekmail'],
    description: 'Check your temporary email inbox',
    category: 'others',
    handler: async (client, m, { reply, text }) => {
      if (!text) return m.reply('Usage: .inbox <email> <token>');
      const parts = text.trim().split(' ');
      if (parts.length < 2) return m.reply('Usage: .inbox <email> <token>\n\nBoth email and token are required.');
      const [inboxEmail, inboxToken] = parts;
      try {
        const res = await global.axios.get(`https://apis.xcasper.space/api/tempmail?action=check&email=${encodeURIComponent(inboxEmail)}&token=${encodeURIComponent(inboxToken)}`);
        if (!res.data.success) return m.reply('Failed to check inbox. Make sure email and token are correct.');
        const messages = res.data.messages;
        if (!messages || messages.length === 0) return m.reply('📭 Your inbox is empty. No messages yet.');
        for (const msg of messages) {
          const from = msg.from?.address || msg.from || 'Unknown';
          const subject = msg.subject || '(no subject)';
          const date = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Unknown';
          const intro = msg.intro || msg.text || '(no preview)';
          await m.reply(`📩 *New Message*\n\n👤 *From:* ${from}\n📝 *Subject:* ${subject}\n🕐 *Date:* ${date}\n\n${intro}`);
        }
      } catch (e) {
        m.reply('Failed to fetch inbox. Try again later.');
      }
    }
  },
  
{
  command: ['system'],
  aliases: ['sysinfo'],
  description: 'Show system info — platform, RAM, storage, hostname',
  category: 'others',
  handler: async (client, m, { reply }) => {

    const os = require('os');
    const fs = require('fs');
    const { execSync } = require('child_process');

    // ── RAM ─────────────────────────────────────────────────────────────
    const totalRam = os.totalmem();
    const freeRam  = os.freemem();
    const usedRam  = totalRam - freeRam;
    const ramPct   = ((usedRam / totalRam) * 100).toFixed(1);

    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
    const toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';

    // ── Storage ──────────────────────────────────────────────────────────
    let totalDisk = 'N/A', usedDisk = 'N/A', freeDisk = 'N/A';
    try {
      const df = execSync("df -k / | tail -1").toString().trim().split(/\s+/);
      totalDisk = toGB(parseInt(df[1]) * 1024);
      usedDisk  = toGB(parseInt(df[2]) * 1024);
      freeDisk  = toGB(parseInt(df[3]) * 1024);
    } catch (_) {}

    // ── CPU ──────────────────────────────────────────────────────────────
    const cpus    = os.cpus();
    const cpuName = cpus[0]?.model?.trim() || 'Unknown';
    const cores   = cpus.length;

    // ── Uptime ───────────────────────────────────────────────────────────
    const uptimeSec = os.uptime();
    const hrs  = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = Math.floor(uptimeSec % 60);
    const uptime = `${hrs}h ${mins}m ${secs}s`;

    // ── Process (bot) memory ─────────────────────────────────────────────
    const botMem = process.memoryUsage();

    // ── Network interfaces ───────────────────────────────────────────────
    const nets = os.networkInterfaces();
    let ip = 'N/A';
    for (const iface of Object.values(nets)) {
      const ext = iface?.find(i => i.family === 'IPv4' && !i.internal);
      if (ext) { ip = ext.address; break; }
    }

    const msg =
      `╔══════════════════════╗\n` +
      `║   💻 SMILEY CYMOR MD SYSTEM  INFO      \n` +
      `╚══════════════════════╝\n\n` +
      `*🖥️ Host*\n` +
      `┣ Hostname : ${os.hostname()}\n` +
      `┣ Platform : ${os.platform()} (${os.type()})\n` +
      `┣ Arch     : ${os.arch()}\n` +
      `┣ Release  : ${os.release()}\n` +
      `┗ IP Addr  : ${ip}\n\n` +
      `*⚙️ CPU*\n` +
      `┣ Model : ${cpuName}\n` +
      `┗ Cores : ${cores}\n\n` +
      `*🧠 RAM*\n` +
      `┣ Total : ${toGB(totalRam)}\n` +
      `┣ Used  : ${toMB(usedRam)} (${ramPct}%)\n` +
      `┗ Free  : ${toMB(freeRam)}\n\n` +
      `*💾 Storage (/*\n` +
      `┣ Total : ${totalDisk}\n` +
      `┣ Used  : ${usedDisk}\n` +
      `┗ Free  : ${freeDisk}\n\n` +
      `*🤖 Bot Process*\n` +
      `┣ Heap Used  : ${toMB(botMem.heapUsed)}\n` +
      `┣ Heap Total : ${toMB(botMem.heapTotal)}\n` +
      `┗ RSS        : ${toMB(botMem.rss)}\n\n` +
      `*⏱️ Uptime*\n` +
      `┣ System : ${uptime}\n` +
      `┗ Node   : v${process.version.replace('v', '')}`;

    reply(msg);
  }
},

  {
    command: ['support'],
    description: 'Get support links',
    category: 'others',
    handler: async (client, m) => {
      const links = {
        channel: require('../brand').channel,
        developer: require('../brand').ownerChat
      };
      const banner = require('path').join(__dirname, '..', 'media', 'menu.jpg');
      await client.sendPresenceUpdate('composing', m.chat);
      const supportMessage =
        `▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄\n` +
        `█                             █\n` +
        `█   🅂🄼🄸🄻🄴🅈 🄲🅈🄼🄾🅁 🅂🅄🄿🄿🄾🅁🅃   █\n` +
        `█                             █\n` +
        `▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n\n` +
        `✧ 𝘾𝙃𝘼𝙉𝙉𝙀𝙇 » ${links.channel}\n\n` +
        `✧ 𝘿𝙀𝙑𝙀𝙇𝙊𝙋𝙀𝙍 » ${links.developer}\n\n` +
        `▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄\n` +
        `█  NO ONE DOES IT BETTER THAN ME  █\n` +
        `▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`;
      await client.sendMessage(m.chat, {
        image: require('fs').readFileSync(banner),
        caption: supportMessage,
        contextInfo: {
          externalAdReply: {
            title: '🅿🆁🅴🅼🅸🆄🅼 🆂🆄🅿🅿🅾🆁🆃',
            body: 'SMILEY CYMOR MD | No one does it better than me',
            thumbnail: require('fs').readFileSync(banner),
            sourceUrl: links.channel
          }
        }
      });
    }
  },

  {
    command: ['cymor'],
    aliases: ['about', 'smiley'],
    description: 'About SMILEY CYMOR MD',
    category: 'others',
    handler: async (client, m) => {
      const b = require('../brand');
      m.reply(
        `*😄 ${b.name}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_${b.motto}_\n\n` +
        `👑 *Owner:* ${b.owner}\n` +
        `📞 *WhatsApp:* ${b.ownerChat}\n` +
        `📣 *Channel:* ${b.channel}\n` +
        (b.pairUrl ? `🔗 *Pair / Session ID:* ${b.pairUrl}\n` : '') +
        `\n⚡ ${__V.sig('brewed')}`
      );
    }
  }

  ];
