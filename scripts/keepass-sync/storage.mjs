import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, rmdir, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

function sameFile(left, right) {
  return left.ino === right.ino && left.dev === right.dev;
}

export async function snapshotFile(path, writable = false) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Database must be an existing regular, non-symlink file: ${path}`);
  const handle = await open(path, (writable ? constants.O_RDWR : constants.O_RDONLY) | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    const data = await handle.readFile();
    const after = await handle.stat();
    if (!sameFile(before, info) || before.mtimeMs !== after.mtimeMs || before.size !== after.size) {
      throw new Error(`Database changed while reading: ${path}`);
    }
    return { path, data, identity: after };
  } finally {
    await handle.close();
  }
}

export async function lockDatabases(paths) {
  const locks = [];
  try {
    for (const path of [...new Set(paths)].sort()) {
      const lock = `${path}.sync-lock`;
      try {
        await mkdir(lock, { mode: 0o700 });
      } catch {
        throw new Error(`Another sync may be running. If not, remove the empty lock directory: ${lock}`);
      }
      locks.push(lock);
    }
  } catch (error) {
    await Promise.all(locks.map((lock) => rmdir(lock)));
    throw error;
  }
  return async () => {
    for (const lock of locks.reverse()) await rmdir(lock);
  };
}

async function unchanged(snapshot, handle) {
  const currentPath = await lstat(snapshot.path);
  const current = await handle.stat();
  const bytes = Buffer.alloc(snapshot.data.length);
  let offset = 0;
  while (offset < bytes.length) {
    const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
    if (!bytesRead) break;
    offset += bytesRead;
  }
  if (!currentPath.isFile() || !sameFile(currentPath, snapshot.identity) ||
      !sameFile(current, snapshot.identity) || current.size !== snapshot.data.length ||
      offset !== bytes.length || !bytes.equals(snapshot.data)) {
    throw new Error(`Database changed during sync; refusing to overwrite it: ${snapshot.path}`);
  }
}

async function writeContents(handle, data) {
  let offset = 0;
  while (offset < data.length) {
    const { bytesWritten } = await handle.write(data, offset, data.length - offset, offset);
    if (bytesWritten === 0) throw new Error('Incomplete database write.');
    offset += bytesWritten;
  }
  await handle.truncate(data.length);
  await handle.sync();
  const actual = Buffer.alloc(data.length);
  let read = 0;
  while (read < actual.length) {
    const { bytesRead } = await handle.read(actual, read, actual.length - read, read);
    if (!bytesRead) break;
    read += bytesRead;
  }
  if (read !== actual.length || !actual.equals(data)) throw new Error('Database write verification failed.');
}

export async function commitDatabases(updates, report = () => {}, checkCancelled = () => {}) {
  const files = [];
  let committed = false;
  try {
    for (const update of updates) {
      const handle = await open(update.snapshot.path, constants.O_RDWR | constants.O_NOFOLLOW);
      files.push({ ...update, handle, started: false });
    }
    for (const file of files) await unchanged(file.snapshot, file.handle);
    checkCancelled();
    for (const file of files) {
      const path = `${file.snapshot.path}.backup.${randomBytes(8).toString('hex')}`;
      const backup = await open(path, 'wx', 0o600);
      try {
        await backup.writeFile(file.snapshot.data);
        await backup.sync();
        file.backup = path;
      } catch (error) {
        await unlink(path);
        throw error;
      } finally {
        await backup.close();
      }
    }
    for (const file of files) {
      checkCancelled();
      await unchanged(file.snapshot, file.handle);
      file.started = true;
      // Writing the existing inode preserves iCloud sharing metadata; never rename it.
      await writeContents(file.handle, file.data);
    }
    checkCancelled();
    committed = true;
  } catch (error) {
    for (const file of files.toReversed()) {
      if (file.started) {
        try {
          await writeContents(file.handle, file.snapshot.data);
          report(`Restored original database: ${file.snapshot.path}`);
        } catch {
          report(`Restoration failed; use the recovery backup for: ${file.snapshot.path}`);
        }
      }
      if (file.backup) report(`Recovery backup retained: ${file.backup}`);
    }
    throw error;
  } finally {
    await Promise.all(files.map((file) => file.handle.close()));
  }
  if (committed) {
    for (const file of files) {
      try {
        await unlink(file.backup);
      } catch {
        report(`Databases updated, but recovery backup could not be removed: ${file.backup}`);
      }
    }
  }
}

export function assertDifferentFiles(master, shared) {
  if (sameFile(master.identity, shared.identity)) throw new Error('Master and shared databases must be different files.');
}

export async function readKeyFile(path) {
  return path ? readFile(path) : undefined;
}
