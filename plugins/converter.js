'use strict';
const __V = require('../lib/style').voice;

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const fetch = require('node-fetch');
const axios    = require('axios');
const FormData = require('form-data');

module.exports = [

    {
    command: ['topdf'],
    aliases: ['pdf', 'makepdf', 'img2pdf', 'text2pdf'],
    description: 'Convert a quoted image or text to a PDF file',
    category: 'converter',
    handler: async (client, m, { reply, text }) => {
      const PDFDocument = require('pdfkit');

     const msgR     = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
     const quotedText = msgR?.conversation || msgR?.extendedTextMessage?.text || '';
     const inputText  = text || quotedText;
     const imageMsg = msgR?.imageMessage || null;

      if (!imageMsg && !inputText) return reply(
        '📄 *Usage:*\n• Reply to an image: *.topdf*\n• Convert text: *.topdf Your text here*'
      );

      let imgFilePath;
      const pdfPath = path.join(os.tmpdir(), `pdf_${Date.now()}.pdf`);

      try {
        reply('⏳ Creating PDF...');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const ws  = fs.createWriteStream(pdfPath);
        doc.pipe(ws);

        if (imageMsg) {
          imgFilePath = await client.downloadAndSaveMediaMessage(imageMsg);
          if (!imgFilePath || !fs.existsSync(imgFilePath)) throw new Error('Download failed');
          const pageW = doc.page.width - 80;
          const pageH = doc.page.height - 80;
          doc.image(imgFilePath, 40, 40, { fit: [pageW, pageH], align: 'center', valign: 'center' });
        } else {
          doc.font('Helvetica').fontSize(12).text(inputText, { align: 'left', lineGap: 4 });
        }

        doc.end();
        await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject); });

        await client.sendMessage(m.chat, {
          document: fs.readFileSync(pdfPath),
          mimetype: 'application/pdf',
          fileName: `document_${Date.now()}.pdf`,
          caption: '✅ *PDF created successfully!*',
        }, { quoted: m });

      } catch (err) {
        console.error('topdf error:', err.message);
        reply('❌ Failed to create PDF. Try again.');
      } finally {
        for (const p of [imgFilePath, pdfPath]) {
          if (p && fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
        }
      }
    }
  },

    {
    command: ['toexcel'],
    aliases: ['excel', 'makeexcel', 'toxlsx', 'text2excel'],
    description: 'Convert comma-separated text to an Excel spreadsheet',
    category: 'converter',
    handler: async (client, m, { reply, text }) => {
      const XLSX = require('xlsx');

      const msgR       = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
      const quotedText = msgR?.conversation || msgR?.extendedTextMessage?.text || '';
      const inputText  = text || quotedText;

      if (!inputText?.trim()) return reply(
        '📊 *Usage:*\n*.toexcel Name,Age,City\\nJohn,25,NY\\nJane,30,LA*\n\n_Columns = commas, Rows = new lines_\n_Or reply to a text message with CSV data_'
      );

      const xlsxPath = path.join(os.tmpdir(), `excel_${Date.now()}.xlsx`);
      try {
        reply('⏳ Creating Excel file...');

        const lines = inputText.trim().split(/\n|\\n/).filter(l => l.trim());
        const data  = lines.map(line =>
          line.split(',').map(cell => {
            const t = cell.trim();
            const n = Number(t);
            return (!isNaN(n) && t !== '') ? n : t;
          })
        );

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();

        // Auto column widths
        const colWidths = data.reduce((acc, row) => {
          row.forEach((cell, i) => { acc[i] = Math.max(acc[i] || 10, String(cell).length + 4); });
          return acc;
        }, []);
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, xlsxPath);

        await client.sendMessage(m.chat, {
          document: fs.readFileSync(xlsxPath),
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: `spreadsheet_${Date.now()}.xlsx`,
          caption: `✅ *Excel created!*\n📊 ${data.length} rows × ${data[0]?.length || 0} columns`,
        }, { quoted: m });

      } catch (err) {
        console.error('toexcel error:', err.message);
        reply('❌ Failed to create Excel. Make sure data is comma-separated.');
      } finally {
        if (fs.existsSync(xlsxPath)) try { fs.unlinkSync(xlsxPath); } catch (_) {}
      }
    }
  },

    {
    command: ['toword'],
    aliases: ['word', 'makedoc', 'todocx', 'img2word', 'text2word'],
    description: 'Convert a quoted image or text to a Word (.docx) file',
    category: 'converter',
    handler: async (client, m, { reply, text }) => {

      const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = require('docx');

      const msgR     = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
      const quotedText = msgR?.conversation || msgR?.extendedTextMessage?.text || '';
      const inputText  = text || quotedText;
      const imageMsg = msgR?.imageMessage || null;

      if (!imageMsg && !inputText) return reply(
        '📝 *Usage:*\n• Reply to an image: *.toword*\n• Convert text: *.toword Your text here*'
      );

      let imgFilePath;
      try {
        reply('⏳ Creating Word document...');
        let children = [];

        if (imageMsg) {
          imgFilePath = await client.downloadAndSaveMediaMessage(imageMsg);
          if (!imgFilePath || !fs.existsSync(imgFilePath)) throw new Error('Download failed');
          const imgBuffer = fs.readFileSync(imgFilePath);
          const ext = path.extname(imgFilePath).replace('.', '').toLowerCase() || 'jpeg';
          children.push(
            new Paragraph({
              children: [new ImageRun({ data: imgBuffer, transformation: { width: 500, height: 350 }, type: ext === 'png' ? 'png' : 'jpg' })],
              alignment: AlignmentType.CENTER,
            })
          );
        } else {
          for (const line of inputText.split('\n')) {
            children.push(
              line.trim()
                ? new Paragraph({ children: [new TextRun({ text: line.trim(), size: 24, font: 'Calibri' })], spacing: { after: 120 } })
                : new Paragraph({})
            );
          }
        }

        const doc = new Document({ sections: [{ properties: {}, children }] });
        const docBuffer = await Packer.toBuffer(doc);

        await client.sendMessage(m.chat, {
          document: docBuffer,
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: `document_${Date.now()}.docx`,
          caption: '✅ *Word document created successfully!*',
        }, { quoted: m });

      } catch (err) {
        console.error('toword error:', err.message);
        reply('❌ Failed to create Word document. Try again.');
      } finally {
        if (imgFilePath && fs.existsSync(imgFilePath)) try { fs.unlinkSync(imgFilePath); } catch (_) {}
      }
    }
  },

  {
  command: ['tovideo'],
  aliases: ['mp4', 'tovid'],
  description: 'Convert animated sticker to video',
  category: 'converter',
  handler: async (client, m, { reply, prefix, command }) => {
    if (!m.quoted) return reply(`📎 Reply to an *animated sticker* with *${prefix + command}*`);
    const mime = (m.quoted.msg || m.quoted).mimetype || '';
    if (!/webp/.test(mime)) return reply(`⚠️ That's not a sticker.`);
    try {
      await m.reply('🎬 _Converting sticker to video..._');
      const buf = await m.quoted.download();
      const sharp = require('sharp');
      const os = require('os');
      const path = require('path');
      const { execSync } = require('child_process');
      const ffmpegPath = require('ffmpeg-static');
      const id = Date.now();
      const tmpDir = os.tmpdir();
      const framesDir = path.join(tmpDir, `frames_${id}`);
      const outputPath = path.join(tmpDir, `video_${id}.mp4`);
      fs.mkdirSync(framesDir, { recursive: true });
      
      const image = sharp(buf, { animated: true });
      const metadata = await image.metadata();
      const pages = metadata.pages || 1;
      if (pages <= 1) return reply('⚠️ This is a *static* sticker, not animated!');
      
      for (let i = 0; i < pages; i++) {
        const frameBuf = await sharp(buf, { animated: false, page: i })
          .png()
          .toBuffer();
        const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
        fs.writeFileSync(framePath, frameBuf);
      }
      
      try {
        execSync(
          `"${ffmpegPath}" -y -framerate 15 -i "${framesDir}/frame_%04d.png" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p -movflags faststart "${outputPath}"`,
          { timeout: 60000, stdio: 'pipe' }
        );
      } catch (e) {
        return m.reply('❌ ffmpeg error: ' + e.stderr?.toString()?.slice(0, 200));
      }
      if (!fs.existsSync(outputPath)) return m.reply('❌ Output file not created');
      const videoBuffer = fs.readFileSync(outputPath);
      await client.sendMessage(m.chat, {
        video: videoBuffer,
        caption: '*Sticker converted successfully to Video*'
      }, { quoted: m });
      
      try { fs.rmSync(framesDir, { recursive: true }); } catch {}
      try { fs.unlinkSync(outputPath); } catch {}
    } catch (err) {
      m.reply('❌ Error: ' + err.message);
    }
  }
},

  {
    command: ['toaudio'],
    aliases: ['audioe'],
    description: 'Convert video to audio',
    category: 'converter',
    handler: async (client, m, { reply, quoted, mime }) => {
      if (!quoted) return reply('Reply to a video message to convert it to audio.');
      if (!/video/.test(mime)) return reply('Reply to a *video* message.');
      await reply('🎵 _Converting video to audio..._');
      const buffer = await client.downloadMediaMessage(quoted);
      const tmpIn = `tmp_in_${Date.now()}.mp4`;
      const tmpOut = `tmp_out_${Date.now()}.mp3`;
      fs.writeFileSync(tmpIn, buffer);
      const { exec } = require('child_process');
      exec(`ffmpeg -i ${tmpIn} -vn -acodec libmp3lame ${tmpOut}`, async (err) => {
        if (err) {
          m.reply('❌ Conversion failed.');
        } else {
          await client.sendMessage(m.chat, { audio: fs.readFileSync(tmpOut), mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: m });
        }
        try { fs.unlinkSync(tmpIn); } catch {}
        try { fs.unlinkSync(tmpOut); } catch {}
      });
    }
  },

    {
    command: ['toimg'],
    aliases: ['photo', 'toimage'],
    description: 'Convert a sticker to image',
    category: 'converter',
    handler: async (client, m, { reply, mime, quoted }) => {
      const { exec } = require('child_process');
      if (!quoted) return m.reply('Tag a static video with the command!');
      if (!/webp/.test(mime)) return m.reply(`Tag a sticker to convert to photo`);
      const media = await client.downloadAndSaveMediaMessage(quoted);
      const hikari = `./tmp_${Date.now()}.png`;
      exec(`ffmpeg -i ${media} ${hikari}`, (err) => {
        try { fs.unlinkSync(media); } catch {}
        if (err) return m.reply("❌ Conversion failed.");
        const buffer = fs.readFileSync(hikari);
        client.sendMessage(m.chat, { image: buffer, caption: `${__V.converted()}` }, { quoted: m });
        try { fs.unlinkSync(hikari); } catch {}
      });
    }
  },

      {
    command: ['ocr'],
    aliases: ['readtext', 'extract', 'imgtotext', 'scan'],
    description: 'Extract text from a quoted image',
    category: 'converter',
    handler: async (client, m, { reply }) => {

      const msgR = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
      if (!msgR) return reply('🖼️ Reply to an image with *.ocr* to read text from it.');

      const imageMsg = msgR.imageMessage || null;
      if (!imageMsg) return reply('❌ Quoted message is not an image.');

      let filePath;
      try {
        reply('🔍 Scanning image for text...');

        filePath = await client.downloadAndSaveMediaMessage(imageMsg);
        if (!filePath || !fs.existsSync(filePath)) throw new Error('Image download failed');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('language', 'eng');
        form.append('isOverlayRequired', 'false');
        form.append('detectOrientation', 'true');
        form.append('scale', 'true');
        form.append('OCREngine', '2');

        const res = await axios.post(
          'https://api.ocr.space/parse/image',
          form,
          {
            headers: {
              ...form.getHeaders(),
              'apikey': 'helloworld',
            },
            timeout: 30000,
          }
        );

        const data = res.data;
        if (data?.IsErroredOnProcessing) {
          return reply(`❌ OCR error: ${data.ErrorMessage?.[0] || 'Unknown error'}`);
        }

        const text = data?.ParsedResults?.[0]?.ParsedText?.trim();
        if (!text) return reply('🤷 No text found in the image. Try a clearer photo.');

        await client.sendMessage(m.chat, {
          text: `${text}`,
        }, { quoted: m });

      } catch (err) {
        console.error('OCR error:', err.message);
        reply('❌ Failed to read text. Try a clearer, well-lit photo.');
      } finally {
        if (filePath && fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
  },

    {
    command: ['attp'],
    description: 'Animated text sticker',
    category: 'converter',
    handler: async (client, m, { reply, q }) => {
      if (!q) return reply('Provide text. E.g: .attp Hello World');
      client.sendMessage(m.chat, {
        sticker: { url: `https://api.lolhuman.xyz/api/attp?apikey=cde5404984da80591a2692b6&text=${encodeURIComponent(q)}` }
      }, { quoted: m });
    }
  },

  {
    command: ['carbon'],
    description: 'Turn code into a carbon screenshot',
    category: 'converter',
    handler: async (client, m, { reply }) => {
      if (!m.quoted || !m.quoted.text) return reply('Quote a code message to convert to carbon image.');
      try {
        const response = await fetch('https://carbonara.solopov.dev/api/cook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: m.quoted.text, backgroundColor: '#1F816D' }),
        });
        if (!response.ok) return m.reply('API failed to fetch a valid response.');
        const buffer = await response.buffer();
        await client.sendMessage(m.chat, {
          image: buffer,
          caption: `${__V.converted()}`
        }, { quoted: m });
      } catch (err) {
        m.reply('❌ Carbon failed: ' + err.message);
      }
    }
  },

      {
    command: ['totext'],
    aliases: ['stt', 'listen', 'transcribe', 'audiotxt'],
    description: 'Convert a quoted voice/audio message to text',
    category: 'converter',
    handler: async (client, m, { reply }) => {
      const ffmpeg     = require('fluent-ffmpeg');
      const ffmpegPath = require('ffmpeg-static');
      ffmpeg.setFfmpegPath(ffmpegPath);

      const msgR = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
      if (!msgR) return reply('🎙️ Reply to a voice note or audio message with *.transcribe*');

      const audioMsg = msgR.audioMessage || msgR.videoMessage || null;
      if (!audioMsg) return reply('❌ Quoted message is not audio. Reply to a voice note.');

      let rawPath, flacPath;
      try {
        reply('⏳ Converting audio to text...');

        rawPath = await client.downloadAndSaveMediaMessage(audioMsg);
        if (!rawPath || !fs.existsSync(rawPath)) throw new Error('Audio download failed');

        flacPath = path.join(os.tmpdir(), `stt_${Date.now()}.flac`);
        await new Promise((resolve, reject) => {
          ffmpeg(rawPath)
            .audioChannels(1)
            .audioFrequency(16000)
            .toFormat('flac')
            .on('end', resolve)
            .on('error', reject)
            .save(flacPath);
        });

        const flacBuffer = fs.readFileSync(flacPath);
        const GOOGLE_KEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';
        const res = await axios.post(
          `https://www.google.com/speech-api/v2/recognize?output=json&lang=en-US&key=${GOOGLE_KEY}`,
          flacBuffer,
          {
            headers: { 'Content-Type': 'audio/x-flac; rate=16000' },
            timeout: 30000,
          }
        );

        const lines = String(res.data).trim().split('\n').filter(l => l.trim() && l !== '{}');
        let transcript = '';
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const alt = obj?.result?.[0]?.alternative?.[0]?.transcript;
            if (alt) transcript += alt + ' ';
          } catch (_) {}
        }

        transcript = transcript.trim();
        if (!transcript) return reply('🤷 Could not make out any speech. Try a clearer audio message.');

        await client.sendMessage(m.chat, {
          text: `🎙️ *Transcription:*\n\n${transcript}`,
        }, { quoted: m });

      } catch (err) {
        console.error('Transcribe error:', err.message);
        reply('❌ Transcription failed. Audio may be too long (max ~60s) or too noisy.');
      } finally {
        for (const p of [rawPath, flacPath]) {
          if (p && fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
        }
      }
    }
  },

  ];
  
