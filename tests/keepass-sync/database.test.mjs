import { describe, expect, it } from 'vitest';
import { credentials, kdbx, syncDatabases, unlock } from '../../scripts/keepass-sync/database.mjs';
import { addEntry, clone, database, entry, group } from './fixtures.mjs';

async function pair() {
  const master = database('master-fixture');
  const chosen = master.createGroup(master.getDefaultGroup(), 'Chosen');
  const privateGroup = master.createGroup(master.getDefaultGroup(), 'Private');
  addEntry(master, chosen, 'Login');
  addEntry(master, privateGroup, 'PrivateLogin');
  addEntry(master, master.getDefaultGroup(), 'PrivateRoot');
  const shared = database('shared-fixture');
  const local = shared.createGroup(shared.getDefaultGroup(), 'Local');
  addEntry(shared, local, 'SharedOnly');
  syncDatabases(master, shared, ['Chosen']);
  return { master: await clone(master), shared: await clone(shared) };
}

describe('scoped synchronization', () => {
  it('exports selected groups across distinct root UUIDs without exposing private data', async () => {
    const { master, shared } = await pair();
    expect(master.getDefaultGroup().uuid.id).not.toBe(shared.getDefaultGroup().uuid.id);
    expect(entry(shared, 'Login').uuid.id).toBe(entry(master, 'Login').uuid.id);
    expect(entry(shared, 'PrivateLogin')).toBeUndefined();
    expect(entry(shared, 'PrivateRoot')).toBeUndefined();
    expect(entry(shared, 'SharedOnly')).toBeDefined();
    expect(entry(master, 'SharedOnly')).toBeUndefined();
  });

  it('distinguishes existing shared entries examined from final selected entries, including nested additions', async () => {
    const { master, shared } = await pair();
    for (let index = 2; index <= 28; index++) {
      addEntry(master, group(master, 'Chosen'), `Login${index}`);
    }
    syncDatabases(master, shared, ['Chosen']);
    const nested = master.createGroup(group(master, 'Chosen'), 'Nested');
    addEntry(master, nested, 'MasterOnly29');
    const messages = [];
    syncDatabases(master, shared, ['Chosen'], (message) => messages.push(message));
    expect(messages).toEqual([
      'Existing shared entries checked for additions and edits: 28.',
      'Prepared selected shared groups: 29 entries (including subgroups); master deletions remain authoritative.',
    ]);
    expect([...group(shared, 'Chosen').allEntries()]).toHaveLength(29);
    expect([...shared.getDefaultGroup().allEntries()]).toHaveLength(30);
  });

  it('merges additions, newer edits, protected fields, history, attachments and custom data', async () => {
    const { master, shared } = await pair();
    const incoming = entry(shared, 'Login');
    incoming.pushHistory();
    incoming.fields.set('Password', kdbx.ProtectedValue.fromString('new-fixture-secret'));
    incoming.times.lastModTime = new Date('2026-02-01T00:00:00Z');
    incoming.qualityCheck = false;
    incoming.customData = new Map([['test', { value: 'extra', lastModified: new Date('2026-02-01') }]]);
    incoming.binaries.set('attachment', await shared.createBinary(new TextEncoder().encode('attachment-fixture').buffer));
    const nested = shared.createGroup(group(shared, 'Chosen'), 'NewNested');
    nested.tags = ['group-tag'];
    nested.customData = new Map([['custom', { value: 'group-extra' }]]);
    addEntry(shared, nested, 'NewLogin');
    const privateBytes = entry(master, 'PrivateLogin').fields.get('Password').getText();
    syncDatabases(master, shared, ['Chosen']);
    const savedMaster = await clone(master);
    const savedShared = await clone(shared);
    for (const db of [savedMaster, savedShared]) {
      expect(entry(db, 'Login').fields.get('Password').getText()).toBe('new-fixture-secret');
      expect(entry(db, 'Login').history.some((old) => old.fields.get('Password').getText() === 'Login-fixture-secret')).toBe(true);
      expect(entry(db, 'Login').customData.get('test').value).toBe('extra');
      expect(entry(db, 'Login').qualityCheck).toBe(false);
      const binary = entry(db, 'Login').binaries.get('attachment');
      expect(new TextDecoder().decode(db.binaries.getValueByHash(binary.hash))).toBe('attachment-fixture');
      expect(group(db, 'NewNested').tags).toEqual(['group-tag']);
      expect(group(db, 'NewNested').customData.get('custom').value).toBe('group-extra');
      expect(entry(db, 'NewLogin')).toBeDefined();
    }
    expect(entry(savedMaster, 'PrivateLogin').fields.get('Password').getText()).toBe(privateBytes);
    expect(entry(savedShared, 'PrivateLogin')).toBeUndefined();
  });

  it('retains the union of history without accumulating duplicates on repeated sync', async () => {
    const { master, shared } = await pair();
    entry(shared, 'Login').pushHistory();
    entry(shared, 'Login').fields.set('Notes', 'shared edit');
    entry(shared, 'Login').times.lastModTime = new Date('2026-02-01');
    entry(master, 'Login').pushHistory();
    entry(master, 'Login').fields.set('Notes', 'newer master edit');
    entry(master, 'Login').times.lastModTime = new Date('2026-03-01');
    syncDatabases(master, shared, ['Chosen']);
    const before = entry(master, 'Login').history.length;
    syncDatabases(master, shared, ['Chosen']);
    expect(entry(master, 'Login').history.length).toBe(before);
    expect(entry(master, 'Login').history.some((old) => old.fields.get('Notes') === 'shared edit')).toBe(true);
    expect(entry(shared, 'Login').fields.get('Notes')).toBe('newer master edit');
  });

  it('ignores shared deletion tombstones even when they refer to private master UUIDs', async () => {
    const { master, shared } = await pair();
    shared.remove(entry(shared, 'Login'));
    shared.move(entry(shared, 'Login'), undefined);
    shared.addDeletedObject(entry(master, 'PrivateLogin').uuid, new Date());
    syncDatabases(master, shared, ['Chosen']);
    expect(entry(master, 'PrivateLogin')).toBeDefined();
    expect(entry(master, 'Login')).toBeDefined();
    expect(entry(shared, 'Login').parentGroup.name).toBe('Chosen');
    expect(shared.deletedObjects.some((item) => item.uuid.equals(entry(master, 'Login').uuid))).toBe(false);
  });

  it('keeps master permanent/recycled deletions and private moves authoritative against newer shared edits', async () => {
    const { master, shared } = await pair();
    for (const title of ['Permanent', 'Recycled', 'MovedPrivate']) addEntry(master, group(master, 'Chosen'), title);
    const nested = master.createGroup(group(master, 'Chosen'), 'RemovedGroup');
    addEntry(master, nested, 'RemovedChild');
    syncDatabases(master, shared, ['Chosen']);
    master.remove(entry(master, 'Permanent'));
    master.move(entry(master, 'Permanent'), undefined);
    master.remove(entry(master, 'Recycled'));
    master.move(entry(master, 'MovedPrivate'), group(master, 'Private'));
    master.remove(group(master, 'RemovedGroup'));
    for (const title of ['Permanent', 'Recycled', 'MovedPrivate', 'RemovedChild']) {
      entry(shared, title).fields.set('Notes', 'must-not-return');
      entry(shared, title).times.lastModTime = new Date('2030-01-01');
    }
    syncDatabases(master, shared, ['Chosen']);
    expect(entry(master, 'Permanent')).toBeUndefined();
    expect(entry(master, 'Recycled').parentGroup.uuid.equals(master.meta.recycleBinUuid)).toBe(true);
    expect(entry(master, 'MovedPrivate').parentGroup.name).toBe('Private');
    expect(entry(master, 'MovedPrivate').fields.get('Notes')).not.toBe('must-not-return');
    for (const title of ['Permanent', 'Recycled', 'MovedPrivate', 'RemovedChild']) {
      expect(entry(shared, title)).toBeUndefined();
    }
  });

  it('restores a top-level group deleted on the shared side', async () => {
    const { master, shared } = await pair();
    shared.remove(group(shared, 'Chosen'));
    syncDatabases(master, shared, ['Chosen']);
    expect(entry(shared, 'Login').parentGroup.name).toBe('Chosen');
    expect([...shared.getDefaultGroup().allGroups()].filter((item) => item.uuid.equals(group(master, 'Chosen').uuid))).toHaveLength(1);
  });

  it('merges newer shared moves within the selected scope', async () => {
    const { master, shared } = await pair();
    const target = shared.createGroup(group(shared, 'Chosen'), 'MovedInto');
    shared.move(entry(shared, 'Login'), target);
    syncDatabases(master, shared, ['Chosen']);
    expect(entry(master, 'Login').parentGroup.name).toBe('MovedInto');
    expect(entry(shared, 'Login').parentGroup.name).toBe('MovedInto');
  });

  it.each([
    ['inactive expiry dates', (incoming) => {
      incoming.times.expires = false;
      incoming.times.expiryTime = new Date('2030-01-01');
    }],
    ['omitted display defaults', (incoming) => {
      incoming.fgColor = undefined;
      incoming.bgColor = undefined;
      incoming.overrideUrl = undefined;
      incoming.icon = undefined;
    }],
    ['omitted auto-type sequence', (incoming) => {
      incoming.autoType.defaultSequence = '';
    }],
    ['empty custom data', (incoming) => {
      incoming.customData = new Map();
    }],
    ['explicit quality-check default', (incoming) => {
      incoming.qualityCheck = true;
    }],
    ['omitted empty standard fields', (incoming) => {
      incoming.fields.delete('URL');
      incoming.fields.delete('Notes');
    }],
  ])('does not mistake %s for an identical-timestamp edit', async (_label, change) => {
    const { master, shared } = await pair();
    change(entry(shared, 'Login'));
    expect(() => syncDatabases(master, shared, ['Chosen'])).not.toThrow();
    expect(entry(master, 'Login').history).toHaveLength(0);
    expect(entry(shared, 'Login').fields.get('Password').getText()).toBe('Login-fixture-secret');
  });

  it('identifies real same-timestamp conflicts by UUID and field name without exposing values', async () => {
    const { master, shared } = await pair();
    const original = entry(master, 'Login');
    entry(shared, 'Login').fields.set('Password', kdbx.ProtectedValue.fromString('conflicting-fixture-secret'));
    let message;
    try {
      syncDatabases(master, shared, ['Chosen']);
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain(original.uuid.id);
    expect(message).toContain('Password');
    expect(message).not.toContain('Login-fixture-secret');
    expect(message).not.toContain('conflicting-fixture-secret');
    expect(original.fields.get('Password').getText()).toBe('Login-fixture-secret');
  });

  it('still rejects different active expiry dates with identical timestamps', async () => {
    const { master, shared } = await pair();
    entry(master, 'Login').times.expires = true;
    entry(shared, 'Login').times.expires = true;
    entry(master, 'Login').times.expiryTime = new Date('2027-01-01');
    entry(shared, 'Login').times.expiryTime = new Date('2028-01-01');
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('expiry');
  });

  it('still rejects an explicit quality-check change rather than treating it as a default', async () => {
    const { master, shared } = await pair();
    entry(shared, 'Login').qualityCheck = false;
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('qualityCheck');
  });

  it('rejects missing groups, duplicate names, renamed shared roots, and timestamp conflicts', async () => {
    const { master, shared } = await pair();
    expect(() => syncDatabases(master, shared, ['Missing'])).toThrow('missing or ambiguous');
    group(shared, 'Chosen').name = 'Renamed';
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('renamed or moved');
    group(shared, 'Renamed').name = 'Chosen';
    entry(shared, 'Login').fields.set('Notes', 'ambiguous edit');
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('identical timestamps');
    master.createGroup(master.getDefaultGroup(), 'Chosen');
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('missing or ambiguous');
  });

  it('does not export unreferenced private attachment bytes', async () => {
    const master = database();
    const chosen = master.createGroup(master.getDefaultGroup(), 'Chosen');
    addEntry(master, chosen, 'Public');
    const hidden = addEntry(master, master.getDefaultGroup(), 'Hidden');
    const secret = await master.createBinary(new TextEncoder().encode('private-attachment').buffer);
    hidden.binaries.set('private', secret);
    const shared = database();
    syncDatabases(master, shared, ['Chosen']);
    expect(shared.binaries.getValueByHash(secret.hash)).toBeUndefined();
  });

  it('refuses selected groups repurposed as the shared recycle bin', async () => {
    const { master, shared } = await pair();
    shared.meta.recycleBinUuid = group(shared, 'Chosen').uuid;
    expect(() => syncDatabases(master, shared, ['Chosen'])).toThrow('cannot be the recycle bin');
  });
});

describe('encrypted format compatibility', () => {
  it.each([
    { version: 3 },
    { version: 4, kdf: 'Argon2id' },
    { version: 4, kdf: 'Argon2d' },
  ])('reopens format $version / $kdf without changing encryption settings', async (options) => {
    const keyFile = new TextEncoder().encode('fixture-key-file-contents').buffer;
    const db = database('key-fixture', { ...options, keyFile });
    addEntry(db, db.getDefaultGroup(), 'Saved');
    const cipher = db.header.dataCipherUuid.id;
    const saved = Buffer.from(await db.save());
    const loaded = await unlock(saved, credentials('key-fixture', keyFile), 'fixture');
    expect(loaded.versionMajor).toBe(options.version);
    expect(loaded.header.dataCipherUuid.id).toBe(cipher);
    expect(entry(loaded, 'Saved').fields.get('Password').getText()).toBe('Saved-fixture-secret');
    await expect(unlock(saved, credentials('incorrect'), 'fixture')).rejects.toThrow('Could not unlock');
  });
});
