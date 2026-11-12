'use strict';

const fs = require('fs');
const path = require('path');
const plugins = new Map();
const noPrefixPlugins = new Map();

function loadPlugins(pluginsDir) {
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const fullPath = path.join(pluginsDir, file);
    try {
      delete require.cache[require.resolve(fullPath)];
      const list = require(fullPath);
      const arr = Array.isArray(list) ? list : [list];
      for (const plugin of arr) {
        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        for (const cmd of cmds) {
          plugins.set(cmd.toLowerCase(), plugin);
        }
     const aliases = Array.isArray(plugin.aliases) ? plugin.aliases : [];
for (const alias of aliases) {
  plugins.set(alias.toLowerCase(), plugin);
}
   if (plugin.noprefix) {
          const triggers = Array.isArray(plugin.noprefix)
            ? plugin.noprefix                          
            : [...cmds, ...aliases];                   
          for (const trigger of triggers) {
            noPrefixPlugins.set(trigger.toLowerCase(), plugin);
          }
        }
      }
      console.log(`[HANDLER] Loaded plugin: ${file}`);
    } catch (err) {
      console.error(`[HANDLER] Failed to load ${file}:`, err.message);
    }
  }
}

async function dispatch(command, client, m, ctx) {
  const plugin = plugins.get(command.toLowerCase());
  if (!plugin) return false;
  try {
    await plugin.handler(client, m, ctx);
  } catch (err) {
    console.error(`[HANDLER] Error in plugin for "${command}":`, err);
    m.reply(`⚠️ 𝓞𝓸𝓹𝓼 — *${command}* tripped over something: ${err.message}`);
  }
  return true;
}

async function dispatchNoPrefix(trigger, client, m, ctx) {
  const plugin = noPrefixPlugins.get(trigger.toLowerCase().trim());
  if (!plugin) return false;
  try {
    await plugin.handler(client, m, ctx);
  } catch (err) {
    console.error(`[HANDLER] Error in no-prefix plugin for "${trigger}":`, err);
  }
  return true;
}

function watchPlugins(pluginsDir) {
  fs.watch(pluginsDir, (eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    const fullPath = path.join(pluginsDir, filename);
    console.log(`[HANDLER] Reloading plugin: ${filename}`);
    try {
      delete require.cache[require.resolve(fullPath)];
      const list = require(fullPath);
      const arr = Array.isArray(list) ? list : [list];
      // Remove old entries for this file first
      for (const [key, plugin] of plugins.entries()) {
        if (plugin._file === filename) plugins.delete(key);
      }
      
      for (const [key, plugin] of noPrefixPlugins.entries()) {
        if (plugin._file === filename) noPrefixPlugins.delete(key);
      }
      
      for (const plugin of arr) {
        plugin._file = filename;
        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        for (const cmd of cmds) {
          plugins.set(cmd.toLowerCase(), plugin);
        }
const aliases = Array.isArray(plugin.aliases) ? plugin.aliases : [];
for (const alias of aliases) {
  plugins.set(alias.toLowerCase(), plugin);
}
     if (plugin.noprefix) {
          const triggers = Array.isArray(plugin.noprefix)
            ? plugin.noprefix
            : [...cmds, ...aliases];
          for (const trigger of triggers) {
            noPrefixPlugins.set(trigger.toLowerCase(), plugin);
          }
        }   
      }
    } catch (err) {
      console.error(`[HANDLER] Reload failed for ${filename}:`, err.message);
    }
  });
}

function listCommands() {
  return [...plugins.keys()];
}

module.exports = { loadPlugins, watchPlugins, dispatch, dispatchNoPrefix, listCommands };
