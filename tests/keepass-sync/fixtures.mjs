import { credentials, configureCrypto, kdbx } from '../../scripts/keepass-sync/database.mjs';

configureCrypto();

export function database(password = 'fixture-password', { version = 4, kdf = 'Argon2id', keyFile } = {}) {
  const db = kdbx.Kdbx.create(credentials(password, keyFile), 'Fixture');
  if (version === 3) {
    db.setVersion(3);
    db.header.keyEncryptionRounds = 2;
  } else {
    db.header.versionMinor = 1;
    db.setKdf(kdbx.Consts.KdfId[kdf]);
    db.header.kdfParameters.set('I', kdbx.VarDictionary.ValueType.UInt64, kdbx.Int64.from(1));
    db.header.kdfParameters.set('M', kdbx.VarDictionary.ValueType.UInt64, kdbx.Int64.from(32 * 1024));
    db.header.kdfParameters.set('P', kdbx.VarDictionary.ValueType.UInt32, 1);
  }
  return db;
}

export function addEntry(db, parent, title, time = '2026-01-01T00:00:00Z') {
  const entry = db.createEntry(parent);
  entry.fields.set('Title', title);
  entry.fields.set('Password', kdbx.ProtectedValue.fromString(`${title}-fixture-secret`));
  entry.times.lastModTime = new Date(time);
  entry.times.locationChanged = new Date(time);
  return entry;
}

export function entry(db, title) {
  return [...db.getDefaultGroup().allEntries()].find((item) => item.fields.get('Title') === title);
}

export function group(db, name) {
  return [...db.getDefaultGroup().allGroups()].find((item) => item.name === name);
}

export async function clone(db) {
  return kdbx.Kdbx.load(await db.save(), db.credentials);
}
