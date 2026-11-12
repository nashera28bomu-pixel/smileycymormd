const brand = require('./brand');

const session = process.env.SESSION || '';
const appname = process.env.APP_NAME || '';
const herokuapi = process.env.HEROKU_API;
const botname = process.env.BOTNAME || brand.name;
const author = process.env.STICKER_AUTHOR || brand.owner;
const packname = process.env.STICKER_PACKNAME || brand.name;
const dev = process.env.DEV || brand.ownerNumber;
const owner = dev.split(",").map(n => n.trim()).filter(Boolean);
const bad = process.env.BAD_WORD || 'fuck,umbwa,kuma,pussy,slut,bitch,cock,stupid';
const admin = process.env.ADMIN_MSG || '🛡️ ᴀᴅᴍɪɴꜱ ᴏɴʟʏ ᴢᴏɴᴇ — ʏᴏᴜ ɴᴇᴇᴅ ᴛʜᴇ ᴄʀᴏᴡɴ ꜰᴏʀ ᴛʜɪꜱ ᴏɴᴇ.';
const group = process.env.GROUP_ONLY_MSG || '👥 ᴛʜɪꜱ ᴏɴᴇ ᴏɴʟʏ ᴡᴏʀᴋꜱ ɪɴꜱɪᴅᴇ ɢʀᴏᴜᴘꜱ.';
const botAdmin = process.env.BOT_ADMIN_MSG || '🔑 ɢɪᴠᴇ ᴍᴇ ᴀᴅᴍɪɴ ʀɪɢʜᴛꜱ ꜰɪʀꜱᴛ, ᴛʜᴇɴ ᴛʀʏ ᴀɢᴀɪɴ.';
const NotOwner = process.env.NOT_OWNER_MSG || '👑 ʙᴏꜱꜱ ᴍᴏᴅᴇ — ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴅᴏ ᴛʜɪꜱ.';
const mycode = process.env.CODE || '254';
const port = process.env.PORT || 10000;

module.exports = {
  session,
  author,
  packname,
  dev,
  owner,
  bad,
  group,
  NotOwner,
  botname,
  botAdmin,
  admin,
  mycode,
  herokuapi,
  port,
  appname
};
