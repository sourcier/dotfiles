import * as crypto from 'node:crypto';
import { promisify } from 'node:util';
import kdbx from 'kdbxweb';

const groupExtras = ['tags', 'previousParentGroup', 'customData'];
const entryExtras = ['previousParentGroup', 'customData', 'qualityCheck'];

export function configureCrypto() {
  if (typeof crypto.argon2 !== 'function') throw new Error('Node.js 24.7 or newer is required.');
  const argon2 = promisify(crypto.argon2);
  kdbx.CryptoEngine.setArgon2Impl(async (password, salt, memory, iterations, length, parallelism, type, version) => {
    if (version !== 0x13 || (type !== 0 && type !== 2)) {
      throw new Error('Unsupported Argon2 parameters; upgrade the database KDF in KeePassXC.');
    }
    return argon2(type === 2 ? 'argon2id' : 'argon2d', {
      message: Buffer.from(password),
      nonce: Buffer.from(salt),
      memory,
      passes: iterations,
      tagLength: length,
      parallelism,
    });
  });
}

export function credentials(password, keyFile) {
  return new kdbx.Credentials(
    password ? kdbx.ProtectedValue.fromString(password) : undefined,
    keyFile ? kdbx.ByteUtils.arrayToBuffer(keyFile) : undefined,
  );
}

export async function unlock(data, keys, label) {
  try {
    return await kdbx.Kdbx.load(kdbx.ByteUtils.arrayToBuffer(data), keys);
  } catch (error) {
    throw new Error(`Could not unlock ${label} database (${error.code ?? 'unsupported format or KDF'}). Check its password and key file.`);
  }
}

function cloneValue(value) {
  if (value instanceof Date) return new Date(value);
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (value instanceof Map) return new Map([...value].map(([key, item]) => [key, cloneValue(item)]));
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value instanceof kdbx.KdbxUuid) return value;
  if (value instanceof kdbx.ProtectedValue) return value.clone();
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function copyExtras(target, source, fields) {
  for (const field of fields) target[field] = cloneValue(source[field]);
}

function copyVersion(source) {
  const entry = new kdbx.KdbxEntry();
  entry.copyFrom(source);
  copyExtras(entry, source, entryExtras);
  return entry;
}

function importEntry(target, source, parent, sourceDb) {
  const entry = target.importEntry(source, parent, sourceDb);
  // importEntry normally generates a new identity and timestamps; sync retains both.
  entry.uuid = source.uuid;
  entry.times = source.times.clone();
  copyExtras(entry, source, entryExtras);
  entry.history.forEach((version, index) => {
    version.uuid = source.uuid;
    copyExtras(version, source.history[index], entryExtras);
  });
  return entry;
}

function copyIcon(target, source, icon) {
  if (icon && source.meta.customIcons.has(icon.id)) {
    target.meta.customIcons.set(icon.id, cloneValue(source.meta.customIcons.get(icon.id)));
  }
}

function cloneGroup(target, source, parent, sourceDb) {
  const group = target.createGroup(parent, source.name ?? '');
  group.copyFrom(source);
  copyExtras(group, source, groupExtras);
  copyIcon(target, sourceDb, source.customIcon);
  for (const entry of source.entries) importEntry(target, entry, group, sourceDb);
  for (const child of source.groups) cloneGroup(target, child, group, sourceDb);
  return group;
}

function objectMap(db) {
  const objects = new Map();
  for (const item of db.getDefaultGroup().allGroupsAndEntries()) {
    if (objects.has(item.uuid.id)) throw new Error('Database contains duplicate object UUIDs.');
    objects.set(item.uuid.id, item);
  }
  return objects;
}

function inRecycleBin(item, db) {
  for (let group = item; group; group = group.parentGroup) {
    if (db.meta.recycleBinUuid && group.uuid.equals(db.meta.recycleBinUuid)) return true;
  }
  return false;
}

function selectedGroups(master, names) {
  return names.map((name) => {
    const matches = master.getDefaultGroup().groups.filter((group) => group.name === name);
    if (matches.length !== 1) throw new Error(`Selected master group is missing or ambiguous: ${name}`);
    if ([...matches[0].allGroups()].some((group) => inRecycleBin(group, master))) {
      throw new Error('The master recycle bin cannot be included in selected groups.');
    }
    return matches[0];
  });
}

function sharedGroups(shared, selected) {
  const objects = objectMap(shared);
  return selected.map((group) => {
    const match = objects.get(group.uuid.id);
    const sameName = shared.getDefaultGroup().groups.filter((item) => item.name === group.name);
    if (sameName.some((item) => !item.uuid.equals(group.uuid))) {
      throw new Error(`Shared group has a different UUID: ${group.name}. Resolve the duplicate group before syncing.`);
    }
    if (match && shared.meta.recycleBinUuid && match.uuid.equals(shared.meta.recycleBinUuid)) {
      throw new Error('A selected shared group cannot be the recycle bin.');
    }
    if (!match || inRecycleBin(match, shared)) return undefined;
    if (!(match instanceof kdbx.KdbxGroup) ||
        match.parentGroup !== shared.getDefaultGroup() || match.name !== group.name) {
      throw new Error(`Shared group was renamed or moved: ${group.name}`);
    }
    return match;
  });
}

function normalized(value) {
  if (value instanceof kdbx.ProtectedValue) return value.getText();
  if (value instanceof kdbx.KdbxUuid) return value.id;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ArrayBuffer) return crypto.createHash('sha256').update(Buffer.from(value)).digest('hex');
  if (value instanceof Map) return [...value].sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalized(item)]);
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
  }
  return value;
}

function entryContent(entry) {
  const fields = new Map(entry.fields);
  for (const name of ['Title', 'UserName', 'Password', 'URL', 'Notes']) {
    if (!fields.has(name)) fields.set(name, '');
  }
  return normalized({
    fields,
    binaries: entry.binaries,
    icon: entry.icon ?? 0,
    customIcon: entry.customIcon?.empty ? undefined : entry.customIcon,
    fgColor: entry.fgColor ?? '',
    bgColor: entry.bgColor ?? '',
    overrideUrl: entry.overrideUrl ?? '',
    tags: [...new Set(entry.tags)].sort(),
    autoType: {
      enabled: entry.autoType.enabled ?? true,
      obfuscation: entry.autoType.obfuscation ?? 0,
      defaultSequence: entry.autoType.defaultSequence ?? '',
      items: entry.autoType.items,
    },
    customData: entry.customData ?? new Map(),
    qualityCheck: entry.qualityCheck ?? true,
    // Clients may rewrite this date without editing an entry that never expires.
    expiry: entry.times.expires ? [true, entry.times.expiryTime] : [false],
  });
}

function versionKey(entry) {
  return crypto.createHash('sha256').update(JSON.stringify(entryContent(entry))).digest('hex');
}

function differingFields(target, source) {
  const left = entryContent(target);
  const right = entryContent(source);
  return Object.keys(left).flatMap((key) => {
    if (JSON.stringify(left[key]) === JSON.stringify(right[key])) return [];
    if (key !== 'fields') return [key];
    const leftFields = new Map(left.fields);
    const rightFields = new Map(right.fields);
    return [...new Set([...leftFields.keys(), ...rightFields.keys()])]
      .filter((name) => JSON.stringify(leftFields.get(name)) !== JSON.stringify(rightFields.get(name)))
      .map((name) => `fields[${JSON.stringify(name)}]`);
  });
}

function mergeEntry(target, source) {
  if (target.lastModTime === source.lastModTime && versionKey(target) !== versionKey(source)) {
    throw new Error(
      `Conflicting entry edits have identical timestamps. Entry UUID: ${target.uuid.id}. ` +
      `Differing fields: ${differingFields(target, source).join(', ')}. ` +
      'Neither database has been written. Resolve this entry in KeePassXC before syncing.',
    );
  }
  const winner = source.lastModTime > target.lastModTime ? source : target;
  const versions = new Map();
  const winnerKey = `${winner.lastModTime}:${versionKey(winner)}`;
  // A shared replica cannot delete master history; retain the union of versions.
  for (const version of [...target.history, ...source.history, target, source]) {
    const key = `${version.lastModTime}:${versionKey(version)}`;
    if (key !== winnerKey && !versions.has(key)) versions.set(key, copyVersion(version));
  }
  if (winner !== target) {
    target.copyFrom(source);
    copyExtras(target, source, entryExtras);
  }
  target.history = [...versions.values()].sort((a, b) => a.lastModTime - b.lastModTime);
}

function relocate(item, parent) {
  if (item.parentGroup === parent) return;
  for (let ancestor = parent; ancestor; ancestor = ancestor.parentGroup) {
    if (ancestor === item) throw new Error('Conflicting group moves would create a cycle.');
  }
  const collection = item instanceof kdbx.KdbxGroup ? 'groups' : 'entries';
  const previous = item.parentGroup;
  if (previous) previous[collection] = previous[collection].filter((other) => other !== item);
  parent[collection].push(item);
  item.parentGroup = parent;
}

function mergeSharedGroup(master, shared, source, target, objects, blocked, changed) {
  for (const child of source.groups) {
    if (blocked.has(child.uuid.id) || inRecycleBin(child, shared)) continue;
    let destination = objects.get(child.uuid.id);
    if (destination && !(destination instanceof kdbx.KdbxGroup)) throw new Error('Object UUID changes type across databases.');
    if (!destination) {
      destination = master.createGroup(target, child.name ?? '');
      destination.copyFrom(child);
      copyExtras(destination, child, groupExtras);
      objects.set(child.uuid.id, destination);
    } else {
      const location = destination.times.locationChanged;
      const move = child.locationChanged > destination.locationChanged;
      if (child.lastModTime > destination.lastModTime) {
        destination.copyFrom(child);
        copyExtras(destination, child, groupExtras);
      }
      if (move) {
        relocate(destination, target);
        destination.times.locationChanged = child.times.locationChanged;
      } else destination.times.locationChanged = location;
    }
    copyIcon(master, shared, child.customIcon);
    mergeSharedGroup(master, shared, child, destination, objects, blocked, changed);
  }
  for (const entry of source.entries) {
    if (blocked.has(entry.uuid.id)) continue;
    let destination = objects.get(entry.uuid.id);
    if (destination && !(destination instanceof kdbx.KdbxEntry)) throw new Error('Object UUID changes type across databases.');
    if (!destination) {
      destination = importEntry(master, entry, target, shared);
      objects.set(entry.uuid.id, destination);
    } else {
      const scratch = new kdbx.KdbxGroup();
      const incoming = importEntry(master, entry, scratch, shared);
      const location = destination.times.locationChanged;
      const move = entry.locationChanged > destination.locationChanged;
      mergeEntry(destination, incoming);
      if (move) {
        relocate(destination, target);
        destination.times.locationChanged = entry.times.locationChanged;
      } else destination.times.locationChanged = location;
    }
    changed.entries++;
  }
}

function detachCopies(group, ids, protectedRoot) {
  group.entries = group.entries.filter((entry) => !ids.has(entry.uuid.id));
  group.groups = group.groups.filter((child) => child === protectedRoot || !ids.has(child.uuid.id));
  for (const child of group.groups) detachCopies(child, ids, protectedRoot);
}

export function syncDatabases(master, shared, names, report = () => {}) {
  const selected = selectedGroups(master, names);
  const sources = sharedGroups(shared, selected);
  const objects = objectMap(master);
  const active = new Set(selected.flatMap((group) => [...group.allGroupsAndEntries()].map((item) => item.uuid.id)));
  const blocked = new Set([...objects.keys()].filter((id) => !active.has(id)));
  for (const deleted of master.deletedObjects) blocked.add(deleted.uuid.id);
  const changed = { entries: 0 };
  sources.forEach((source, index) => {
    if (!source) return;
    const target = selected[index];
    if (source.lastModTime > target.lastModTime) {
      const location = target.times.locationChanged;
      target.copyFrom(source);
      copyExtras(target, source, groupExtras);
      target.times.locationChanged = location;
    }
    copyIcon(master, shared, source.customIcon);
    mergeSharedGroup(master, shared, source, target, objects, blocked, changed);
  });
  report(`Existing shared entries checked for additions and edits: ${changed.entries}.`);

  const approved = new Set(selected.flatMap((group) => [...group.allGroupsAndEntries()].map((item) => item.uuid.id)));
  for (const id of blocked) approved.add(id);
  const root = shared.getDefaultGroup();
  approved.delete(root.uuid.id);
  const recycle = shared.getGroup(shared.meta.recycleBinUuid);
  if (recycle) approved.delete(recycle.uuid.id);
  detachCopies(root, approved, recycle);
  const exported = selected.map((group) => cloneGroup(shared, group, root, master));
  const live = new Set([...root.allGroupsAndEntries()].map((item) => item.uuid.id));
  shared.deletedObjects = shared.deletedObjects.filter((item) => !live.has(item.uuid.id));
  shared.cleanup({ binaries: true, customIcons: true });
  const entryCount = exported.reduce((total, group) => total + [...group.allEntries()].length, 0);
  report(`Prepared selected shared groups: ${entryCount} entries (including subgroups); master deletions remain authoritative.`);
}

export { kdbx };
