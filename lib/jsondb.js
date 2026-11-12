'use strict';
// tiny JSON key-value store for warns / wallets (file lives in database/data/)
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'database', 'data');
const cache = {};
const timers = {};

function load(name) {
  if (cache[name]) return cache[name];
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}
  const file = path.join(DIR, name + '.json');
  try { cache[name] = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { cache[name] = {}; }
  return cache[name];
}
function save(name) {
  clearTimeout(timers[name]);
  timers[name] = setTimeout(() => {
    try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(path.join(DIR, name + '.json'), JSON.stringify(cache[name] || {})); } catch (e) { console.error('[jsondb]', e.message); }
  }, 400);
}
module.exports = { load, save };
