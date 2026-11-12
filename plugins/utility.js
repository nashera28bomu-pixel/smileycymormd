const __V = require('../lib/style').voice;

module.exports = [

  {
    command: ['ping'],
    aliases: ['speed'],
    description: 'Check bot response speed',
    category: 'utility',
    handler: async (client, m, { reply, Rspeed }) => {
      m.reply(`𝗣𝗼𝗻𝗴!\n⚡️ *Speed:* ${Rspeed.toFixed(4)} 𝗠𝘀`);
    }
  },

  {
    command: ['uptime'],
    aliases: ['up'],
    description: 'Check bot uptime',
    category: 'utility',
    handler: async (client, m) => {
      const { runtime } = require('../lib/ravenfunc');
      m.reply(runtime(process.uptime()));
    }
  },

  {
    command: ['runtime'],
    aliases: ['stats'],
    description: 'Check bot runtime with rich card',
    category: 'utility',
    handler: async (client, m) => {
      const { runtime } = require('../lib/ravenfunc');
      const raven = `𝐒𝐌𝐈𝐋𝐄𝐘 𝐂𝐘𝐌𝐎𝐑 𝐌𝐃 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝗿𝘂𝗻𝗻𝗶𝗻𝗴 𝘀𝗶𝗻𝗰𝗲 ${runtime(process.uptime())}`;
      client.sendMessage(m.chat, {
        text: raven,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            title: '𝐒𝐌𝐈𝐋𝐄𝐘 𝐂𝐘𝐌𝐎𝐑 𝐌𝐃',
            body: require('../brand').channel,
            thumbnail: require('fs').readFileSync(require('path').join(__dirname, '..', 'media', 'logo-small.jpg')),
            sourceUrl: require('../brand').channel,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m });
    }
  },

  {
    command: ['owner'],
    aliases: ['dev'],
    description: 'Get owner contact',
    category: 'utility',
    handler: async (client, m, { from }) => {
      client.sendContact(from, [require('../brand').ownerNumber], m);
    }
  },

  {
    command: ['advice'],
    description: 'Get a random piece of advice',
    category: 'utility',
    handler: async (client, m, { reply }) => {
      const advice = require('badadvice');
      reply(advice());
    }
  },

  

  {
    command: ['bible'],
    aliases: ['bibble-verse'],
    description: 'Get a Bible verse',
    category: 'utility',
    handler: async (client, m, { reply, text, pushname }) => {
      if (!text) return reply('Please provide a Bible reference.\n\nExample: bible John 3:16');
      try {
        const response = await global.axios.get(`https://bible-api.com/${encodeURIComponent(text)}`);
        if (response.status === 200 && response.data.text) {
          const { reference: ref, text: verseText, translation_name } = response.data;
          reply(
            `*Hello there, below is what you requested*\n\n` +
            `📖 *Reference:* ${ref}\n` +
            ` ${verseText}\n\n` +
            `_Requested by ${pushname}_`
          );
        } else {
          reply('*Verse not found.* Please check the reference and try again.');
        }
      } catch (error) {
        reply('*An error occurred while fetching the Bible verse.* Please try again.');
      }
    }
  },

  {
    command: ['quran'],
    aliases: ['surah'],
    description: 'Get a Quran verse',
    category: 'utility',
    handler: async (client, m, { reply, text, pushname }) => {
      if (!text) return reply('Please provide Surah and Ayah\n*Example:* quran 2:255');
      const input = text.split(':');
      if (input.length !== 2) return reply('Incorrect format. Use: Surah:Ayah (e.g. 2:255)');
      const [surah, ayah] = input;
      try {
        const res = await global.axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,en.asad`);
        const arabic = res.data.data[0].text;
        const english = res.data.data[1].text;
        const surahInfo = res.data.data[0].surah;
        const msg =
          `*Holy Qur'an Verse*\n\n` +
          `*Surah:* ${surahInfo.englishName} (${surahInfo.name})\n` +
          `*Ayah:* ${ayah}\n\n` +
          `*Arabic:* ${arabic}\n\n` +
          `*English:* ${english}\n\n` +
          `_Requested by ${pushname}_`;
        client.sendMessage(m.chat, { text: msg }, { quoted: m });
      } catch (e) {
        reply('Could not find the verse. Please check the Surah and Ayah.');
      }
    }
  },

  {
    command: ['tts'],
    aliases: ['say'],
    description: 'Text to speech',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      if (!text) return reply('Provide text for conversion!');
      const googleTTS = require('google-tts-api');
      const url = googleTTS.getAudioUrl(text, { lang: 'hi-IN', slow: false, host: 'https://translate.google.com' });
      try {
        const { execSync } = require('child_process');
        const fs = require('fs');
        const tmpMp3 = `/tmp/tts_${Date.now()}.mp3`;
        const tmpOgg = `/tmp/tts_${Date.now()}.ogg`;
        const mp3Buf = (await global.axios.get(url, { responseType: 'arraybuffer' })).data;
        fs.writeFileSync(tmpMp3, Buffer.from(mp3Buf));
        execSync(`ffmpeg -i ${tmpMp3} -c:a libopus -ac 1 -ar 16000 -b:a 32k ${tmpOgg} -y`);
        const oggBuf = fs.readFileSync(tmpOgg);
        await client.sendMessage(m.chat, { audio: oggBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
        try { fs.unlinkSync(tmpMp3); fs.unlinkSync(tmpOgg); } catch (e) {}
      } catch (e) {
        await client.sendMessage(m.chat, { audio: { url }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
      }
    }
  },

  {
    command: ['weather'],
    description: 'Get weather for a location',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      if (!text) return reply('provide a city/town name');
      try {
        const response = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${text}&units=metric&appid=1ad47ec6172f19dfaf89eb3307f74785`);
        const data = await response.json();
        const cityName = data.name;
        const temperature = data.main.temp;
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;
        const rainVolume = data.rain ? data.rain['1h'] : 0;
        const cloudiness = data.clouds.all;
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        await m.reply(
          `❄️ Weather in ${cityName}\n\n` +
          `🌡️ Temperature: ${temperature}°C\n` +
          `📝 Description: ${description}\n` +
          `❄️ Humidity: ${humidity}%\n` +
          `🌀 Wind Speed: ${windSpeed} m/s\n` +
          `🌧️ Rain Volume (last hour): ${rainVolume} mm\n` +
          `☁️ Cloudiness: ${cloudiness}%\n` +
          `🌄 Sunrise: ${sunrise.toLocaleTimeString()}\n` +
          `🌅 Sunset: ${sunset.toLocaleTimeString()}`
        );
      } catch (e) {
        m.reply('Unable to find that location.');
      }
    }
  },

  {
    command: ['calculate'],
    aliases: ['calc', 'math'],
    description: 'Calculate a math expression',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      if (!text) return m.reply('*Example usage:* .calculate 5+72');
      if (!/^[0-9+\-*/().\s]+$/.test(text)) return m.reply('Invalid format. Only numbers and +, -, *, /, ( ) are allowed.');
      try {
        let result = eval(text);
        m.reply(`Result: ${result}`);
      } catch {
        reply('❌ Invalid expression.');
      }
    }
  },

    {
    command: ['translate'],
    aliases: ['tl', 'trt', 'trans'],
    description: 'Translate text to any language',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      const axios = require('axios');

      const langNames = {
        english: 'en', spanish: 'es', french: 'fr', german: 'de',
        italian: 'it', portuguese: 'pt', russian: 'ru', arabic: 'ar',
        chinese: 'zh', japanese: 'ja', korean: 'ko', hindi: 'hi',
        swahili: 'sw', yoruba: 'yo', zulu: 'zu', igbo: 'ig',
        hausa: 'ha', amharic: 'am', somali: 'so', turkish: 'tr',
        dutch: 'nl', polish: 'pl', swedish: 'sv', greek: 'el',
        hebrew: 'he', thai: 'th', vietnamese: 'vi', indonesian: 'id',
        afrikaans: 'af', romanian: 'ro', ukrainian: 'uk', bengali: 'bn',
        urdu: 'ur', persian: 'fa', malay: 'ms', danish: 'da',
      };

      const quotedText = m.quoted?.text
                      || m.quoted?.caption
                      || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
                      || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
                      || '';

      let targetLang = 'en';
      let inputText  = '';

      if (!text && !quotedText) {
        return reply(
          '🌍 *Translate — Usage:*\n\n' +
          '• *.translate Hello world* → to English\n' +
          '• *.translate es Hello world* → to Spanish\n' +
          '• *.translate fr* (reply to a message) → to French\n' +
          '• *.translate arabic* (reply to a message) → to Arabic\n\n' +
          '_Codes: en es fr de ar zh ja ko hi sw yo zu ig ha am tr nl pl sv el he th vi id af ro uk bn ur fa_'
        );
      }

      if (text) {
        const parts     = text.trim().split(/\s+/);
        const firstWord = parts[0].toLowerCase();
        const isLangName = langNames[firstWord];
        const isLangCode = /^[a-z]{2,3}$/.test(firstWord) && parts.length > 1;

        if (isLangName) {
          targetLang = isLangName;
          inputText  = parts.slice(1).join(' ');
        } else if (isLangCode) {
          targetLang = firstWord;
          inputText  = parts.slice(1).join(' ');
        } else {
          inputText = text.trim();
        }
      }

      if (!inputText.trim() && quotedText) inputText = quotedText.trim();

      if (!inputText.trim()) return reply('❌ No text to translate. Type text or reply to a message.');

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&dt=ld&q=${encodeURIComponent(inputText)}`;
        const res = await axios.get(url, { timeout: 15000 });

        const translated = (res.data[0] || []).map(seg => seg?.[0] || '').join('').trim();
        if (!translated) return reply('❌ Translation failed. Try again.');

        const detectedLang = res.data?.[2] || 'auto';
        const toLang   = Object.entries(langNames).find(([, v]) => v === targetLang)?.[0]   || targetLang.toUpperCase();
        const fromLang = Object.entries(langNames).find(([, v]) => v === detectedLang)?.[0] || detectedLang.toUpperCase();

        await client.sendMessage(m.chat, {
          text: `🌍 *Translation*\n📥 *From:* ${fromLang}\n📤 *To:* ${toLang}\n\n${translated}`,
        }, { quoted: m });

      } catch (err) {
        console.error('translate error:', err.message);
        reply('❌ Translation failed. Try again in a moment.');
      }
    }
  },

  {
    command: ['zodiac'],
    description: 'Get zodiac sign by birth month and day',
    category: 'utility',
    handler: async (client, m, { reply, text, pushname }) => {
      if (!text) return reply('Please provide your birth month and date\n*Example:* zodiac 8 23 (for August 23)');
      const input = text.split(' ');
      if (input.length !== 2 || isNaN(input[0]) || isNaN(input[1])) return reply('Incorrect format. Use: month day (e.g. zodiac 5 15 for May 15)');
      const month = parseInt(input[0]);
      const day = parseInt(input[1]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return reply('Invalid date. Please check your month (1-12) and day (1-31)');
      let zodiacSign = '';
      let traits = '';
      if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) {
        zodiacSign = 'Aries'; traits = 'Adventurous, energetic, courageous, enthusiastic, confident, dynamic, quick-witted';
      } else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) {
        zodiacSign = 'Taurus'; traits = 'Patient, reliable, warmhearted, loving, persistent, determined, placid, security loving';
      } else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) {
        zodiacSign = 'Gemini'; traits = 'Adaptable, versatile, communicative, witty, intellectual, eloquent, youthful, lively';
      } else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) {
        zodiacSign = 'Cancer'; traits = 'Emotional, loving, intuitive, imaginative, shrewd, cautious, protective, sympathetic';
      } else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) {
        zodiacSign = 'Leo'; traits = 'Generous, warmhearted, creative, enthusiastic, broad-minded, expansive, faithful, loving';
      } else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) {
        zodiacSign = 'Virgo'; traits = 'Modest, shy, meticulous, reliable, practical, diligent, intelligent, analytical';
      } else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) {
        zodiacSign = 'Libra'; traits = 'Diplomatic, urbane, romantic, charming, easygoing, sociable, idealistic, peaceable';
      } else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) {
        zodiacSign = 'Scorpio'; traits = 'Determined, forceful, emotional, intuitive, powerful, passionate, exciting, magnetic';
      } else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) {
        zodiacSign = 'Sagittarius'; traits = 'Optimistic, freedom-loving, jovial, good-humored, honest, straightforward, intellectual';
      } else if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) {
        zodiacSign = 'Capricorn'; traits = 'Practical, prudent, ambitious, disciplined, patient, careful, humorous, reserved';
      } else if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) {
        zodiacSign = 'Aquarius'; traits = 'Friendly, humanitarian, honest, loyal, original, inventive, independent, intellectual';
      } else if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) {
        zodiacSign = 'Pisces'; traits = 'Imaginative, sensitive, compassionate, kind, selfless, unworldly, intuitive, sympathetic';
      } else {
        return reply('Could not determine zodiac sign. Please check your birth date.');
      }
      const msg =
        `*Zodiac Sign*\n\n` +
        `*Birth Date:* ${month}/${day}\n` +
        `*Sign:* ${zodiacSign}\n` +
        `*Traits:* ${traits}\n\n` +
        `_Requested by ${pushname}_`;
      client.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
  },

  {
    command: ['joke'],
    description: 'Get a random joke',
    category: 'utility',
    handler: async (client, m, { reply }) => {
      try {
        const response = await global.axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = response.data;
        const jokeMessage = `*${joke.setup}*\n\n*${joke.punchline}* 😄`;
        return reply(jokeMessage);
      } catch (e) {
        return reply("Couldn't fetch a joke right now. Please try again later.");
      }
    }
  },

  {
    command: ['quote'],
    description: 'Get an inspirational quote',
    category: 'utility',
    handler: async (client, m) => {
      const res = await global.axios.get('https://favqs.com/api/qotd');
      const { body, author } = res.data.quote;
      m.reply(`💬 *"${body}"*\n\n—BY _${author}_`);
    }
  },

  {
    command: ['pickupline'],
    description: 'Get a random pickup line',
    category: 'utility',
    handler: async (client, m) => {
      const res = await global.axios.get('https://rizzapi.vercel.app/random');
      m.reply(`💘 ${res.data?.text}`);
    }
  },

  {
    command: ['funfact'],
    aliases: ['fact'],
    description: 'Get a random pickup line',
    category: 'utility',
    handler: async (client, m) => {
  const url = 'https://uselessfacts.jsph.pl/random.json?language=en';
        const response = await global.axios.get(url);
        const fact = response.data.text;
  m.reply(fact)
   }
 },

  {
    command: ['repo'],
    aliases: ['sc', 'script'],
    description: 'About the bot, owner and links',
    category: 'utility',
    handler: async (client, m, { pushname }) => {
      const brand = require('../brand');
      const fs = require('fs'), path = require('path');
      const caption =
        `👋 Hello *${pushname}*,\n\n` +
        `╭━━━〔 😄 *${brand.name}* 〕━━━╮\n` +
        `┃ _${brand.motto}_\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `👑 *Owner:* ${brand.owner}\n` +
        `📞 *Chat:* ${brand.ownerChat}\n` +
        `📣 *Channel:* ${brand.channel}\n` +
        (brand.repo ? `💻 *Source:* https://github.com/${brand.repo}\n` : '') +
        (brand.pairUrl ? `🔗 *Get Session ID:* ${brand.pairUrl}\n` : '') +
        `\n⚡ ${__V.sig('brewed')}`;
      let image;
      try { image = fs.readFileSync(path.join(__dirname, '..', 'media', 'menu.jpg')); } catch {}
      if (image) await client.sendMessage(m.chat, { image, caption }, { quoted: m });
      else await client.sendMessage(m.chat, { text: caption }, { quoted: m });
    }
  },

  {
    command: ['gitclone'],
    aliases: ['clone'],
    description: 'Download a GitHub repo as ZIP',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      if (!text) return m.reply('Where is the link?');
      if (!text.includes('github.com')) return m.reply('Is that a GitHub repo link ?!');
      const regex1 = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
      let [, user3, repo] = text.match(regex1) || [];
      repo = repo.replace(/.git$/, '');
      const url = `https://api.github.com/repos/${user3}/${repo}/zipball`;
      const headRes = await fetch(url, { method: 'HEAD' });
      const filename = headRes.headers.get('content-disposition').match(/attachment; filename=(.*)/)[1];
      await client.sendMessage(m.chat, { document: { url }, fileName: filename + '.zip', mimetype: 'application/zip' }, { quoted: m }).catch(() => m.reply('error'));
    }
  },
      
{
  command: ['zip'],
  aliases: ['botzip', 'sourcecode', 'getzip'],
  description: 'Send the main bot repo as a ZIP file',
  category: 'utility',
  handler: async (client, m, { reply }) => {

    const REPO  = require('../brand').repo;
    if (!REPO) return reply('ℹ️ Source zip is not configured. Owner: set GITHUB_REPO=yourname/smiley-cymor-md');
    const url   = `https://github.com/${REPO}/archive/refs/heads/main.zip`;

    await reply('⏳ Fetching bot source code ZIP...');

    try {
      await client.sendMessage(m.chat, {
        document:  { url },
        mimetype:  'application/zip',
        fileName:  'smiley-cymor-md.zip',
        caption:
          `╔══════════════════════╗\n` +
          `║   📦  BOT SOURCE CODE  \n` +
          `╚══════════════════════╝\n\n` +
          `📁 *Repo:* ${REPO}\n` +
          `🌿 *Branch:* main\n` +
          `🔗 *GitHub:* https://github.com/${REPO}`
      }, { quoted: m });
    } catch (err) {
      await reply(`❌ Failed to fetch ZIP: ${err.message}`);
    }
  }
},
  
  {
    command: ['screenshot'],
    aliases: ['ss', 'ssweb'],
    description: 'Screenshot a website',
    category: 'utility',
    handler: async (client, m, { reply, text }) => {
      const { botname } = require('../set');
      if (!text) return m.reply('Provide a website link to screenshot.');
      try {
        const cap = `𝗦𝗰𝗿𝗲𝗲𝗻𝘀𝗵𝗼𝘁 𝗯𝘆 ${botname}`;
        const image = `https://image.thum.io/get/fullpage/${text}`;
        await client.sendMessage(m.chat, { image: { url: image }, caption: cap }, { quoted: m });
      } catch (error) {
        m.reply('An error occured.');
      }
    }
  },

  
    {
    command: ['alive'],
    aliases: ['test'],
    description: 'Check if bot is alive',
    category: 'utility',
    handler: async (client, m, { pushname }) => {
      const os   = require('os');
      const fs   = require('fs');
      const { execSync } = require('child_process');
      const { runtime } = require('../lib/ravenfunc');
      const { botname } = require('../set');

  // ── Hosting platform detection ───────────────────────────────────────
      let platform = '🎛️ PANEL / VPS';
      if (process.env.KOYEB_SERVICE_NAME || process.env.KOYEB_APP_NAME || process.env.KOYEB) {
        platform = '🟢 Koyeb';
      } else if (process.env.DYNO) {
        platform = '🟣 Heroku';
      } else if (process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_ENVIRONMENT) {
        platform = '🚂 Railway';
      } else if (process.env.RENDER_SERVICE_NAME || process.env.RENDER) {
        platform = '🔵 Render';
      } else if (process.env.FLY_APP_NAME) {
        platform = '🪁 Fly.io';
      } else if (process.env.REPL_ID || process.env.REPLIT_DB_URL) {
        platform = '🔷 Replit';
      } else if ((os.release() || '').toLowerCase().includes('aws') || (os.hostname() || '').includes('koyeb')) {
        platform = '🟢 Koyeb (AWS)';
      }

// ── Container/allocated RAM (cgroup) ────────────────────────────────
      const toMB = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';
      const toGB = (b) => (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';

      let allocatedRam = null;
      try {
        const raw = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
        if (raw !== 'max') allocatedRam = parseInt(raw);
      } catch (_) {}
      if (!allocatedRam) {
        try {
          const raw = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
          const val = parseInt(raw);
          
          if (val < 256 * 1024 * 1024 * 1024) allocatedRam = val;
        } catch (_) {}
      }

      const botMem   = process.memoryUsage();
      const usedRam  = botMem.rss;                        
      const totalRam = allocatedRam || os.totalmem();  
      const ramPct   = ((usedRam / totalRam) * 100).toFixed(1);
      const ramTotal = toGB(totalRam); 

// ── Storage ─────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
      let diskUsedMB = 0, diskUsedStr = 'N/A', diskFreeStr = 'N/A', diskTotalStr = 'N/A', diskPct = 'N/A';
      try {
        const duOut = execSync('du -sk ' + process.cwd()).toString().trim().split(/\s+/);
        diskUsedMB = Math.round(parseInt(duOut[0]) / 1024); 
        diskUsedStr = diskUsedMB + ' MB';
      } catch (_) {}
    
      const diskLimitMB = parseInt(process.env.DISK_LIMIT || '1024');
      const diskFreeMBVal = Math.max(diskLimitMB - diskUsedMB, 0);
      diskTotalStr = diskLimitMB >= 1024 ? (diskLimitMB / 1024).toFixed(0) + ' GB' : diskLimitMB + ' MB';
      diskFreeStr  = diskFreeMBVal >= 1024 ? (diskFreeMBVal / 1024).toFixed(2) + ' GB' : diskFreeMBVal + ' MB';
      diskPct      = diskLimitMB > 0 ? ((diskUsedMB / diskLimitMB) * 100).toFixed(1) + '%' : 'N/A';

// ── Bot uptime ───────────────────────────────────────────────────────
      const botUptime = runtime(process.uptime());

      const msg =
        `════════════════════════\n` +
        `   𝗛𝗶 ${pushname}👋  \n` +
        `════════════════════════\n\n` +
        `✅ *${botname} is Online and Running!*\n\n` +
        `*⏱️ Uptime*\n` +
        `┗ ${botUptime}\n\n` +
        `*🌐 Hosting*\n` +
        `┣ Platform : ${platform}\n` +
        `┗ Node.js  : ${process.version}\n\n` +
        `*🧠 Memory*\n` +
        `┣ RAM Used : ${toMB(usedRam)} / ${ramTotal} (${ramPct}%)\n` +
        `┗ Bot Heap : ${toMB(botMem.heapUsed)}\n\n` +
        `*💾 Storage*\n` +
        `┣ Used  : ${diskUsedStr} / ${diskTotalStr}\n` +
        `┣ % Used  : ${diskPct}\n` +
        `┗ Free  : ${diskFreeStr}\n\n` +
        `════════════════════════\n` +
        `_𝗠𝗮𝗱𝗲 𝗼𝗻 𝗲𝗮𝗿𝘁𝗵 𝗯𝘆 𝗛𝘂𝗺𝗮𝗻𝘀🔥!_ \n` +
        `════════════════════════`;

      m.reply(msg);
    }
  },

  

  {
    command: ['tweet'],
    description: 'Create a fake tweet image',
    category: 'utility',
    handler: async (client, m, { reply, pushname, text }) => {
      if (!text) return m.reply("provide some text for the tweet");

const displayname = pushname;
const username = m.sender.split('@')[0];
const avatar = await client.profilePictureUrl(m.sender, 'image').catch(_ => 'https://i.imgur.com/vuxJCTB.jpeg');
const replies = "246";
const retweets = "125";
const theme = "dark";

const imageurl = `https://some-random-api.com/canvas/misc/tweet?displayname=${encodeURIComponent(displayname)}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}&comment=${encodeURIComponent(text)}&replies=${encodeURIComponent(replies)}&retweets=${encodeURIComponent(retweets)}&theme=${encodeURIComponent(theme)}`;

await client.sendMessage(m.chat, { image: { url: imageurl}, caption: `${__V.converted()}`}, { quoted: m}) 

    }
  },

  {
  command: ['tg'],
  aliases: ['tgs', 'telegrams'],
  description: 'Download Telegram sticker pack',
  category: 'utility',
  handler: async (client, m, { reply, args }) => {
    if (!args[0]) return m.reply('⚠️ Please provide a Telegram sticker URL!\n\nExample: .tg https://t.me/addstickers/HellsParadise_S2');
    if (!args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) return m.reply('❌ Invalid URL!');

    const packName = args[0].replace('https://t.me/addstickers/', '').trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return m.reply('ℹ️ This command needs a Telegram bot token. Owner: set TELEGRAM_BOT_TOKEN in your environment (create one with @BotFather).');

    await m.reply(`📦 To avoid stickers will be send to your Dm Processing: ${packName}\n⏳ Downloading...`);

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(packName)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const stickerSet = await response.json();
      if (!stickerSet.ok) return m.reply('❌ Sticker pack not found or private');

      let successCount = 0;
      let failCount = 0;
      const totalStickers = Math.min(stickerSet.result.stickers.length, 100);

      const sharp = require('sharp');
      const { Sticker, StickerTypes } = require('wa-sticker-formatter');
      const { execSync } = require('child_process');
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      let ffmpegPath;
      try { ffmpegPath = require('ffmpeg-static'); } catch { ffmpegPath = 'ffmpeg'; }

      for (let i = 0; i < totalStickers; i++) {
        try {
          const sticker = stickerSet.result.stickers[i];
          const isAnimatedTGS = sticker.is_animated === true;
          const isVideoWebM  = sticker.is_video === true;    

          if (isAnimatedTGS) {
            failCount++;
            continue;
          }

          const fileInfo = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${sticker.file_id}`);
          const fileData = await fileInfo.json();
          if (!fileData.ok) throw new Error('File not found');

          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const fileRes = await fetch(fileUrl);
          const buffer = Buffer.from(await fileRes.arrayBuffer());

          if (isVideoWebM) {
            const id = Date.now() + i;
            const tmpDir = os.tmpdir();
            const inPath  = path.join(tmpDir, `tg_in_${id}.webm`);
            const outPath = path.join(tmpDir, `tg_out_${id}.mp4`);
            fs.writeFileSync(inPath, buffer);

            try {
              execSync(
                `"${ffmpegPath}" -y -i "${inPath}" -t 6 ` +
                `-vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,` +
                `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0" ` +
                `-an -c:v libx264 -crf 26 -preset ultrafast "${outPath}"`,
                { timeout: 30000, stdio: 'pipe' }
              );
            } catch {
              fs.copyFileSync(inPath, outPath);
            }

            const stickerObj = new Sticker(fs.readFileSync(outPath), {
              pack: 'SMILEY CYMOR MD',
              author: 'TG Pack',
              type: StickerTypes.FULL,
              quality: 40,
            });
            let stickerBuf = await stickerObj.toBuffer();

            if (stickerBuf.length > 950 * 1024) {
              try {
                execSync(
                  `"${ffmpegPath}" -y -i "${inPath}" -t 4 ` +
                  `-vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,` +
                  `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0" ` +
                  `-an -c:v libx264 -crf 30 -preset ultrafast "${outPath}"`,
                  { timeout: 30000, stdio: 'pipe' }
                );
                const retry = new Sticker(fs.readFileSync(outPath), {
                  pack: 'SMILEY CYMOR MD', author: 'TG Pack',
                  type: StickerTypes.FULL, quality: 25,
                });
                const retryBuf = await retry.toBuffer();
                if (retryBuf && retryBuf.length >= 500) stickerBuf = retryBuf;
              } catch {}
            }

            try { fs.unlinkSync(inPath); } catch {}
            try { fs.unlinkSync(outPath); } catch {}

            if (!stickerBuf || stickerBuf.length < 500 || stickerBuf.length > 1024 * 1024) {
              failCount++;
              continue;
            }

            await client.sendMessage(m.sender, { sticker: stickerBuf }, { quoted: m });
            successCount++;

          } else {
            try {
              const processed = await sharp(buffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 90 })
                .toBuffer();
              await client.sendMessage(m.sender, { sticker: processed }, { quoted: m });
              successCount++;
            } catch {
              await client.sendMessage(m.sender, { sticker: buffer }, { quoted: m });
              successCount++;
            }
          }

          await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          failCount++;
        }
      }

      await m.reply(`✅ Mission Complete!\n📊 Success: ${successCount} | Failed: ${failCount}\n📍 Sent to your Dm`);

    } catch (error) {
      await m.reply('❌ Failed: ' + error.message);
    }
  }
},



  {
    command: ['pair'],
    aliases: ['rent'],
    description: 'Get pairing code for bot session',
    category: 'utility',
    handler: async (client, m, { reply, q }) => {
      if (!q) return await reply('𝐡𝐨𝐥𝐥𝐚 𝐩𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐰𝐡𝐚𝐭𝐬𝐚𝐩𝐩 𝐧𝐮𝐦𝐛𝐞𝐫 𝐦𝐦𝐡... 𝐄𝐱𝐚𝐦𝐩𝐥𝐞- pair 254113821327');
      try {
        const numbers = q.split(',').map(v => v.replace(/[^0-9]/g, '')).filter(v => v.length > 5 && v.length < 20);
        if (numbers.length === 0) return m.reply('Invalid number❌️ Please use the correct format!');
        for (const number of numbers) {
          const whatsappID = number + '@s.whatsapp.net';
          const result = await client.onWhatsApp(whatsappID);
          if (!result[0]?.exists) return m.reply('That number is not registered on WhatsApp❗️');
          m.reply('⏳ Wait a moment for your SMILEY CYMOR MD pair code…');
          const pairUrl = require('../brand').pairUrl;
          if (!pairUrl) return m.reply('ℹ️ Pairing site is not configured. Owner: set PAIR_URL to your pair website link.');
          const { data } = await global.axios(`${pairUrl}/code?number=${number}`);
          const code = data.code;
          const { sleep } = require('../lib/ravenfunc');
          await sleep(3000);
          await m.reply(` ${code}`);
        }
      } catch (error) {
        await reply('An error occurred. Please try again later.');
      }
    }
  },

];
