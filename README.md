<div align="center">

<img src="media/logo.png" width="220" alt="SMILEY CYMOR MD">

# 😄 SMILEY CYMOR MD
### *No one does it better than me*

A multi-device WhatsApp bot — chat, assist, learn and do more.

**Owner:** Legendary Smiley Cymor · **WhatsApp:** [wa.me/254113821327](https://wa.me/254113821327)
**Channel:** [SMILEY CYMOR MD USERS](https://whatsapp.com/channel/0029VbBq8Y1HQbS0YTkiYk0E)

### 🚀 Deploy in one click

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/cymortechservices/smileycymormd)

**[👉 Deploy on Heroku](https://heroku.com/deploy?template=https://github.com/cymortechservices/smileycymormd)** — opens Heroku, paste your **SESSION** ID, press **Deploy app**, and your bot goes live.

⚡ Built by CymorTechServices

</div>

---

## ✨ Features

| Zone | What you get |
|---|---|
| 🧠 **Brain Lab** | ChatGPT-style assistants, Gemini, image generation, image understanding, word definitions, web & image search |
| 🎉 **Fun Corner** | Compliments, flirt lines, roasts, goodnight wishes, Pokémon lookup, jokes, quotes, facts, anime pics |
| 🎮 **Game Arena** | Tic-Tac-Toe (2 players), Hangman, Trivia, Rock-Paper-Scissors, Truth or Dare, Love meter, 8-ball, dice & coin flip |
| 💰 **Cymor Bank** | Virtual coin economy: daily reward, work, bank, gamble, slots, rob, transfer, richest-users board |
| 📥 **Grab Zone** | YouTube, TikTok, Instagram, Facebook, Pinterest, Twitter/X, Spotify downloads, lyrics, song finder |
| 🎬 **Media Studio** | Sticker maker, background remover, HD upscaler, meme maker, view-once unlock |
| 🪄 **Logo Magic** | 29 text-logo effects (neon, glitch, thunder, gold and more) |
| 🔁 **Shape Shifter** | Convert to PDF / Word / Excel / audio / video / image, OCR |
| 🔤 **Text Forge** | 16 fancy fonts, Base64, binary, reverse, mock text, "read more", word count |
| 🧰 **Toolbox** | Weather, translate, QR codes, URL shortener, Wikipedia, unit converter, world time, WhatsApp number checker |
| 🏘️ **Squad Control** | Tag-all, hidetag, warn system (auto-kick), promote/demote, anti-link, group info, admin & member tagging, chat leaderboard |
| 🕵️ **Profile Radar** | Instagram, TikTok, Twitter, Facebook, GitHub, NPM and WhatsApp lookups |
| ⚽ **Pitch Side** | Live tables & top scorers for EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL and more |
| 👨‍💻 **Dev Den** | Run & compile JS / Python / C / C++, encryption, password generator |
| 👑 **Boss Mode** | Mode & prefix control, sudo users, broadcast, anti-delete, anti-call, auto-view/like status, privacy tools, restart/update |

**280+ commands.** Send `.menu` and everything arrives as **one message**: banner + menu + a **View Channel** button.

### 🫣 View-once saver
As the owner, react to (or reply with an emoji to) any **view-once photo, video or voice note** and the bot saves it and sends it to your DM — ❤️ 😍 🔥 👍 and more. No commands needed. You can also use `.vv` (to the chat) or `.vv2` (to your DM).

### 📢 Channel
Every connected account automatically follows the **SMILEY CYMOR MD USERS** channel. Don't want that on your own deployment? Set `AUTO_FOLLOW_CHANNEL=false`.

---

## 🚀 Quick start

1. **Get your Session ID** — open the SMILEY CYMOR MD pair website, enter your number (no `+`), type the code in *WhatsApp → Linked devices → Link a device → Link with phone number instead*. Your Session ID arrives on WhatsApp.
2. **Deploy** with that Session ID on any platform below.

## ☁️ Deploy

### 🟣 Heroku (easiest)
1. Click **[Deploy to Heroku](https://heroku.com/deploy?template=https://github.com/nashera28bomu-pixel/SMILEY-CYMOR-MD)**.
2. Give your app a name (small letters) and paste your Session ID into **SESSION**.
3. Press **Deploy app** and wait for the build.
4. Open **Resources** and make sure the `web` dyno is **ON**. Done — the bot is live.

> Forked the repo under another name? Replace the GitHub path after `template=` with your own repo URL.

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
| `AUTO_FOLLOW_CHANNEL` | no | Connected accounts follow the channel automatically. Set `false` to switch off |
| `MENU_BUTTON` | no | `native` (default) = real tappable *View Channel* button. Set `forward` if buttons don't show on your phone — the menu is then sent as one message forwarded from the channel |
| `CHANNEL_BUTTON_TEXT` | no | Text on the channel button (default `View Channel`) |
| `WARN_LIMIT` | no | Warnings before auto-kick (default `3`) |
| `PAIR_URL` | no | Your pair site URL — enables the `.pair` command |
| `GITHUB_REPO` | no | `yourname/smiley-cymor-md` — enables `.zip` and `.update` |
| `HEROKU_API`, `APP_NAME` | no | Needed only for the `.update` command on Heroku |
| `TELEGRAM_BOT_TOKEN` | no | Only for the `.tg` sticker-pack command |

## 🎛️ Menu
Send `.menu` for the full menu, or `.menu games` (any zone) for descriptions. Switch style with `.menutype` (`video`, `image`, `text`).

## 🔐 Security notes
* Your **Session ID is a password** — never share it.
* This build runs **only the code in this folder**. The original script downloaded code from another GitHub repo on every start; that has been removed.
* Warn counts and wallets are saved in `database/data/` (on Heroku this resets when the dyno restarts unless you attach storage).

## 📄 License
 © 2026 Legendary Smiley Cymor
