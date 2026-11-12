'use strict';
const __V = require('../lib/style').voice;

const mumaker = require('mumaker');

function makeEffect(command, url, label) {
  return {
    command: Array.isArray(command) ? command : [command],
    description: `Generate ${label} text effect`,
    category: 'effects',
    handler: async (client, m, { reply, text, prefix }) => {
      const cmd = Array.isArray(command) ? command[0] : command;
      if (!text) return reply(`Example: ${prefix}${cmd} YourText`);
      try {
        m.reply('*Wait a moment...*');
        const result = await mumaker.ephoto(url, text);
        await client.sendMessage(m.chat, {
          image: { url: result.image },
          caption: `${__V.made()}`
        }, { quoted: m });
      } catch (err) {
        m.reply(err.message || 'Failed to generate effect.');
      }
    }
  };
}

module.exports = [
  makeEffect('glitch',     'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',          'glitch'),
  makeEffect('metallic',   'https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html',         'Metallic'),
  makeEffect('ice',        'https://en.ephoto360.com/ice-text-effect-online-101.html',                              'Ice'),
  makeEffect('snow',       'https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html',           'Snow'),
  makeEffect('impressive', 'https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html',        'Impressive'),
  makeEffect('noel',       'https://en.ephoto360.com/noel-text-effect-online-99.html',                             'Noel'),
  makeEffect('matrix',     'https://en.ephoto360.com/matrix-text-effect-154.html',                                 'Matrix'),
  makeEffect('light',      'https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html',      'Light'),
  makeEffect('neon',       'https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html',     'Neon'),
  makeEffect(['silver', 'silva'],  'https://en.ephoto360.com/create-glossy-silver-3d-text-effect-online-802.html', 'Silver'),
  makeEffect('fabric',     'https://en.ephoto360.com/text-effect-on-jean-fabric-304.html',                         'fabric'),
  makeEffect('candy',      'https://en.ephoto360.com/candy-text-effect-94.html',                                   'candy'),
  makeEffect('frost',      'https://en.ephoto360.com/create-a-frozen-christmas-text-effect-online-792.html',       'frost'),
  makeEffect('devil',      'https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html',                'Devil'),
  makeEffect('typography', 'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',  'Typography'),
  makeEffect('purple',     'https://en.ephoto360.com/purple-text-effect-online-100.html',                          'Purple'),
  makeEffect('thunder',    'https://en.ephoto360.com/thunder-text-effect-online-97.html',                          'Thunder'),
  makeEffect('leaves',     'https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html',   'Leaves'),
  makeEffect('1917',       'https://en.ephoto360.com/1917-style-text-effect-523.html',                             '1917'),
  makeEffect('arena',      'https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html',          'Arena'),
  makeEffect('hacker',     'https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html',         'Hacker'),
  makeEffect('sand',       'https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html',       'Sand'),
  makeEffect('sand2',      'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html',                 'sand2'),
  makeEffect('dragonball', 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',      'DragonBall'),
  makeEffect('naruto',     'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',    'Naruto'),
  makeEffect('graffiti',   'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html','Graffiti'),
  makeEffect('cat',        'https://en.ephoto360.com/handwritten-text-on-foggy-glass-online-680.html',            'Cat (Foggy Glass)'),
  makeEffect('gold',       'https://en.ephoto360.com/modern-gold-4-213.html',                                     'Gold'),
  makeEffect('child',      'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',                    'Child (Wet Glass)') 
];
