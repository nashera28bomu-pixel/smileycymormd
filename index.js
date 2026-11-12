// SMILEY CYMOR MD v1 — "No one does it better than me"

require('dotenv').config({ path: './.Env' });
const {
  default: ravenConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  jidNormalizedUser,
  getContentType,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require('path');
const express = require("express");
const chalk = require("chalk");
const FileType = require("file-type");
const figlet = require("figlet");
const app = express();
const logger = pino({ level: 'silent' });
const { fetchCore } = require('./fetchCore');
const { session, port } = require("./set.js");    
const makeInMemoryStore = require('./store/store.js'); 
const store = makeInMemoryStore({ logger: logger.child({ stream: 'store' }) });
const color = (text, color) => !color ? chalk.green(text) : chalk.keyword(color)(text);
const brand = require('./brand');
const zlib = require('zlib');

async function authentication() {
  try {
    const sessionDir = path.join(__dirname, 'session');
    const credPath = path.join(sessionDir, 'creds.json');

    if (!session || typeof session !== 'string' || session.trim() === '') {
      throw new Error('SESSION env variable is missing or empty. Get a session ID from the SMILEY CYMOR MD pair page and set it as SESSION.');
    }

    // Session format: cymor~<base64 of gzipped creds.json>   (separator ~ : _ - accepted)
    const m = session.trim().match(/^cymor[~:_\-]*(.+)$/is);
    if (!m) {
      throw new Error('Invalid session ID. It must start with "cymor". Generate one on the SMILEY CYMOR MD pair page.');
    }
    const payload = m[1].replace(/\s+/g, '').replace(/^[~:_\-]+/, '');
    if (!payload) throw new Error('Session ID is empty after the "cymor" prefix.');

    let credsJson;
    try {
      const raw = Buffer.from(payload, 'base64');
      credsJson = zlib.gunzipSync(raw).toString('utf8');
      JSON.parse(credsJson);
    } catch (_) {
      throw new Error('Session ID is corrupted or incomplete (copy the WHOLE id). Re-generate it on the pair page.');
    }

    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(credPath, credsJson, 'utf8');
    console.log('✅ Session decoded and loaded successfully');
  } catch (error) {
    console.error('❌ Session Error:', error.message);
    process.exit(1);
  }
}

async function startRaven() {
  const Events                   = require('./action/events');
  const { smsg }                 = require('./lib/ravenfunc');
  const { initializeDatabase }   = require('./database/config');
  const fetchSettings            = require('./database/fetchSettings');
  const { startPeriodicCleanup } = require('./lib/antidelete');
  const { fetchPlugins }         = require('./lib/fetchPlugins');

  try {
        await initializeDatabase();
        console.log("✅ Database initialized successfully.");
      } catch (err) {
        console.error("❌ Failed to initialize database:", err.message || err);
  }
  
  let autobio, autolike, autoview, mode, prefix, anticall;

  try {
    const settings = await fetchSettings();
    console.log("😴 settings object:", settings);
    ({ autobio, autolike, autoview, mode, prefix, anticall } = settings);
    console.log("✅ Settings loaded successfully.... indexfile");
  } catch (error) {
    console.error("❌ Failed to load settings:...indexfile", error.message || error);
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState('session');
  await fetchPlugins();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
  console.log(
    color(
      figlet.textSync("SMILEY CYMOR", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
        whitespaceBreak: false,
      }),
      "green"
    )
  );

  const client = ravenConnect({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["SMILEY CYMOR MD", "Safari", "5.1.7"],
    auth: state,
    syncFullHistory: false,
  });

  store.bind(client.ev);

  // ── house voice: restyle stock phrases that every bot uses so replies have their own look ──
  {
    const St = require('./lib/style');
    const PHRASES = [
      [/^❌ Error: /, () => `⚠️ ${St.scriptLite('Oops')} — `],
      [/^❌ Error\b/, () => `⚠️ ${St.scriptLite('Oops')}`],
      [/^⏳ Please wait, fetching your video\.\.\./, () => St.voice.wait('your video')],
      [/^🔍 Searching images for: /, () => `🔎 ${St.italic('Hunting pictures for')}: `],
      [/^❌ Failed to download/, () => `⚠️ ${St.scriptLite('Download slipped away')} —  couldn't fetch`],
      [/^❌ Conversion failed\./, () => `⚠️ ${St.scriptLite('Reshape failed')} — try another file.`],
    ];
    const restyle = (t) => { for (const [re, fn] of PHRASES) if (re.test(t)) return t.replace(re, fn); return t; };
    const rawSend = client.sendMessage.bind(client);
    client.sendMessage = (jid, content, ...rest) => {
      try { if (content && typeof content.text === 'string') content = { ...content, text: restyle(content.text) }; } catch (_) {}
      return rawSend(jid, content, ...rest);
    };
  }
  
setInterval(() => {
  try {
    store.pruneAll(50);
  } catch (e) {
    console.error('store prune error:', e.message);
  }
}, 10 * 60 * 1000);
  
  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        startRaven();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");
        startRaven();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Delete Session_id and Scan Again.`);
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        startRaven();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        startRaven();
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        startRaven();
      }
    } else if (connection === 'open') {
  
      // every connected account follows the SMILEY CYMOR MD USERS channel (turn off with AUTO_FOLLOW_CHANNEL=false)
      require('./lib/channel').followChannel(client).catch(() => {});

      startPeriodicCleanup();
      console.log(color("Congrats, SMILEY CYMOR MD has successfully connected to this server", "green"));
      console.log(color("Owner: " + brand.owner + " | " + brand.channel, "red"));
      console.log(color("Text the bot number with menu to check my command list"));
      const St = require('./lib/style');
      const Texxt = `╭━━❰ 😄 ${St.script('Smiley Cymor MD')} ❱━━╮\n` +
                    `┃ ✅ ${St.scriptLite('Online and ready')}\n` +
                    `┃ ${St.small('mode')}   ❯ ${mode}\n` +
                    `┃ ${St.small('prefix')} ❯ ${prefix}\n` +
                    `┃ ${St.small('owner')}  ❯ ${brand.owner}\n` +
                    `╰━━━━━━━━━━━━━━━━━━━╯\n` +
                    `${St.italic(brand.motto)} 💫\n\n` +
                    `📢 ${brand.channel}`;
      client.sendMessage(client.user.id, { text: Texxt });
    }
  });
  
  client.ev.on("creds.update", saveCreds);
  
  setInterval(async () => {
    try {
      const liveSettings = await fetchSettings();
      if (liveSettings.autobio === 'on') {
        const date = new Date();
        client.updateProfileStatus(
          `${date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} It's a ${date.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Nairobi' })}.`
        );
      }
    } catch (e) {
      console.error('autobio interval error:', e.message);
    }
  }, 10 * 1000);

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      if (!chatUpdate.messages || !chatUpdate.messages[0]) return;

      let mek = chatUpdate.messages[0];
      if (!mek.message) return;

      mek.message = getContentType(mek.message) === "ephemeralMessage"
        ? mek.message.ephemeralMessage.message
        : mek.message;

      const isStatus = mek.key.remoteJid === "status@broadcast";

      // view-once: remember arrivals; owner reacting with an emoji saves the media to their DM
      const VO = require('./lib/viewonce');
      VO.remember(mek);
      if (mek.message.reactionMessage) { await VO.handleReaction(client, mek, store); return; }

      if (isStatus) {
        try {
          const liveSettings = await fetchSettings();
          const participantToUse = mek.key.participantPn || mek.key.participant;
          if (!participantToUse) return;

          const botJid = jidNormalizedUser(client.user.id);
          const baseKey = {
            remoteJid: mek.key.remoteJid,
            id: mek.key.id,
            fromMe: mek.key.fromMe,
            participant: participantToUse,
          };

          if (liveSettings.autoview === "on") {
            await client.readMessages([baseKey]);
          }

          if (liveSettings.autolike === "on") {
            const emojis = ['💚', '🗿', '⌚️', '💠', '👣', '💙', '✅', '🤍', '🛰️', '💫', '♥️'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            await client.sendMessage(
              mek.key.remoteJid,
              { react: { key: baseKey, text: randomEmoji } },
              { statusJidList: [participantToUse, botJid] }
            );
          }
        } catch (error) {
          console.error("Status handling error:", error);
        }
      }

      if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;

      let m = smsg(client, mek, store);
      const raven = require("./cymor");
      raven(client, m, chatUpdate, store);

    } catch (err) {
      console.log("Error in messages.upsert:", err);
    }
  });
  
  const unhandledRejections = new Map();
  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("rejectionHandled", (promise) => {
    unhandledRejections.delete(promise);
  });
  process.on("uncaughtException", function (err) {
    console.log("Caught exception: ", err);
  });

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });
  
  client.ev.on("contacts.upsert", (contacts) => {
    for (let contact of contacts) {
      const id = jidNormalizedUser(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify || contact.name || "" };
    }
  });

  client.ev.on("group-participants.update", async (update) => {
    Events(client, update);
  });
  
  let lastTextTime = 0;
  const messageDelay = 5000;
  
  client.ev.on('call', async (callData) => {
    try {
      const liveSettings = await fetchSettings();
      if (liveSettings.anticall === 'on') {
        const callId = callData[0].id;
        const callerId = callData[0].from;
        const isGroup = callData[0].isGroup;
        if (isGroup) return;
        await client.rejectCall(callId, callerId);
        const currentTime = Date.now();
        if (currentTime - lastTextTime >= messageDelay) {
          await client.sendMessage(callerId, {
            text: "🚫 Anticall is active! Only text messages are allowed"
          });
          lastTextTime = currentTime;
        } else {
          console.log('Message skipped to prevent overflow');
        }
      }
    } catch (e) {
      console.error('anticall handler error:', e.message);
    }
  });
      
  client.getName = (jid, withoutContact = false) => {
    let id = jidNormalizedUser(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v = id === "0@s.whatsapp.net"
        ? { id, name: "WhatsApp" }
        : id === jidNormalizedUser(client.user.id)
          ? client.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName ||
      PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  client.public = true;
  client.serializeM = (m) => smsg(client, m, store);

  client.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
  };

  client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    let type = await FileType.fromBuffer(buffer);
    if (!type) throw new Error(`Could not detect file type for: ${messageType}`);
    let baseName = filename || `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let trueFileName = attachExtension ? (baseName + '.' + type.ext) : baseName;
    fs.writeFileSync(trueFileName, buffer);
    return trueFileName;
  };

  client.sendText = (jid, text, quoted = "", options) =>
    client.sendMessage(jid, { text: text, ...options }, { quoted });

  return client;
}

app.use(express.static("pixel"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.get("/settings", async (req, res) => {
 try {
    const { botname, dev } = require('./set.js');
    const fetchSettings = require('./database/fetchSettings');
    const db = await fetchSettings();
    res.json({
      botname,
      dev,
      wapresence: db.wapresence || 'recording',
      menutype: db.menutype || 'video',
      mode:   db.mode   || 'public',
      prefix: db.prefix || '.'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
      }
  });
app.get("/uptime", (req, res) => {
  res.json({ uptime: Math.floor(process.uptime()) });
});
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

authentication()
  .then(() => fetchCore())
  .then(() => startRaven());

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
