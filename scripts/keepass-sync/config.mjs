import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';

export async function readConfig(filename, home = homedir()) {
  let config;
  try {
    config = JSON.parse(await readFile(filename, 'utf8'));
  } catch {
    throw new Error(`Could not read JSON configuration: ${filename}`);
  }
  const allowed = new Set(['masterDb', 'sharedDb', 'masterKeyFile', 'sharedKeyFile', 'groups', 'twoWay']);
  if (!config || Array.isArray(config) || typeof config !== 'object' ||
      Object.keys(config).some((key) => !allowed.has(key))) {
    throw new Error('Configuration must contain only masterDb, sharedDb, groups, optional key-file paths and twoWay.');
  }
  if (!Array.isArray(config.groups) || config.groups.length === 0 ||
      config.groups.some((group) => typeof group !== 'string' || group.length === 0 || /[/\r\n]/.test(group)) ||
      new Set(config.groups).size !== config.groups.length) {
    throw new Error('Configure a nonempty, unique groups array of top-level names. No groups are selected by default.');
  }
  if (config.twoWay !== undefined && typeof config.twoWay !== 'boolean') {
    throw new Error('Configuration twoWay must be true or false.');
  }
  for (const key of ['masterDb', 'sharedDb', 'masterKeyFile', 'sharedKeyFile']) {
    if (config[key] === undefined && key.endsWith('KeyFile')) continue;
    if (typeof config[key] !== 'string' || !config[key].trim() || config[key].includes('\0')) {
      throw new Error(`Configure a valid ${key} path.`);
    }
    const path = config[key].startsWith('~/') ? resolve(home, config[key].slice(2)) : config[key];
    config[key] = isAbsolute(path) ? path : resolve(dirname(filename), path);
  }
  return config;
}
