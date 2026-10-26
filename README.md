<div align="center">

<img src="media/logo.png" width="220" alt="SMILEY CYMOR MD">

# 😄 SMILEY CYMOR MD
### *No one does it better than me*

A multi-device WhatsApp bot — chat, assist, learn and do more.

**Owner:** Legendary Smiley Cymor · **WhatsApp:** [wa.me/254113821327](https://wa.me/254113821327)
**Channel:** [SMILEY CYMOR MD USERS](https://whatsapp.com/channel/0029VbBq8Y1HQbS0YTkiYk0E)

⚡ Powered by CymorTechServices

</div>

---

## 🚀 Quick start

1. **Get your Session ID** — open the SMILEY CYMOR MD pair website, enter your number (no `+`), enter the code in *WhatsApp → Linked devices → Link a device → Link with phone number instead*. A session ID starting with `cymor` is sent to your WhatsApp.
2. **Deploy** with that Session ID on any platform below.

## ☁️ Deploy

### 🟣 Heroku
Fork this repo → open `https://heroku.com/deploy?template=https://github.com/<you>/smiley-cymor-md` → fill `SESSION` (and `DEV`) → Deploy → turn the `web` dyno **ON**.

### 🟢 Render
New → Web Service → connect your fork (or use `render.yaml`). Build: `npm install` · Start: `node index.js` · add env `SESSION`. On the free plan, ping `https://<your-app>.onrender.com/uptime` every 5 minutes (UptimeRobot) so it stays awake.

### 🖥️ Panel / VPS
Upload the zip, edit **`.Env`** and fill only `SESSION=`. Start with `node index.js` (Node 22+).
```bash
npm install
npm i -g pm2
pm2 start index.js --name smiley-cymor-md && pm2 save
```

## ⚙️ Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `SESSION` | ✅ | Session ID from the pair site (starts with `cymor`) |
| `DEV` | recommended | Owner number(s), no `+`, comma separated (default `254113821327`) |
| `BOTNAME` | no | Display name (default `SMILEY CYMOR MD`) |
| `DATABASE_URL` | no | PostgreSQL URL. Empty = local JSON file database |
| `PAIR_URL` | no | Your pair site URL — enables the `.pair` command |
| `GITHUB_REPO` | no | `yourname/smiley-cymor-md` — enables `.zip` and `.update` |
| `HEROKU_API`, `APP_NAME` | no | Needed only for the `.update` command on Heroku |
| `AUTO_FOLLOW_CHANNEL` | no | `true` = bot follows the SMILEY CYMOR MD USERS channel on connect (off by default) |
| `TELEGRAM_BOT_TOKEN` | no | Only for the `.tg` sticker-pack command |

## 🎛️ Menu
Send `.menu` for the full colour-coded menu, or `.menu downloads` (any category) for descriptions. Switch style with the menu-type setting (`video`, `image`, `link`, `text`). Replace `media/menu.jpg` / `media/menu.mp4` to change the artwork.

## 🔐 Security notes
* Your **Session ID is a password** — never share it.
* This build runs **only the code in this folder**. The original script downloaded code from another GitHub repo on every start; that has been removed.

## 📄 License
MIT. Original work © SMILEY CYMOR MD 2026 Legendary Smiley Cymor (see `LICENSE`).
