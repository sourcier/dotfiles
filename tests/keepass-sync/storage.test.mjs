import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { assertDifferentFiles, commitDatabases, lockDatabases, snapshotFile } from '../../scripts/keepass-sync/storage.mjs';

const fault = vi.hoisted(() => ({ path: undefined, fired: false, duringWrite: undefined }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    open: async (...args) => {
      const handle = await original.open(...args);
      if (args[0] === fault.path) {
        const write = handle.write.bind(handle);
        handle.write = async (...writeArgs) => {
          if (!fault.fired) {
            fault.fired = true;
            await write(Buffer.from('partial'), 0, 7, 0);
            throw new Error('injected partial write');
          }
          return write(...writeArgs);
        };
      }
      if (args[0] === fault.duringWrite?.path) {
        const write = handle.write.bind(handle);
        handle.write = async (...writeArgs) => {
          const result = await write(...writeArgs);
          await original.writeFile(fault.duringWrite.otherPath, 'concurrent-update');
          return result;
        };
      }
      return handle;
    },
  };
});

let directory;
let master;
let shared;

beforeEach(async () => {
  directory = await fs.mkdtemp(join(tmpdir(), 'keepass-storage-tests-'));
  master = join(directory, 'master.kdbx');
  shared = join(directory, 'shared.kdbx');
  await fs.writeFile(master, 'original-master');
  await fs.writeFile(shared, 'original-shared');
  fault.path = undefined;
  fault.fired = false;
  fault.duringWrite = undefined;
});
afterEach(async () => fs.rm(directory, { recursive: true, force: true }));

it('updates contents in place, truncates old tails, and removes successful backups', async () => {
  const snapshot = await snapshotFile(shared, true);
  const info = await fs.stat(shared);
  await commitDatabases([{ snapshot, data: Buffer.from('new') }]);
  expect(await fs.readFile(shared, 'utf8')).toBe('new');
  expect((await fs.stat(shared)).ino).toBe(info.ino);
  expect((await fs.stat(shared)).mode).toBe(info.mode);
  expect(await fs.readdir(directory)).toEqual(['master.kdbx', 'shared.kdbx']);
});

it('restores both files in place after a partial second write and retains private backups', async () => {
  const masterSnapshot = await snapshotFile(master, true);
  const sharedSnapshot = await snapshotFile(shared, true);
  fault.path = shared;
  const report = vi.fn();
  await expect(commitDatabases([
    { snapshot: masterSnapshot, data: Buffer.from('new-master') },
    { snapshot: sharedSnapshot, data: Buffer.from('new-shared') },
  ], report)).rejects.toThrow('injected partial write');
  expect(await fs.readFile(master, 'utf8')).toBe('original-master');
  expect(await fs.readFile(shared, 'utf8')).toBe('original-shared');
  expect((await fs.stat(master)).ino).toBe(masterSnapshot.identity.ino);
  expect((await fs.stat(shared)).ino).toBe(sharedSnapshot.identity.ino);
  const backups = (await fs.readdir(directory)).filter((name) => name.includes('.backup.'));
  expect(backups).toHaveLength(2);
  for (const backup of backups) {
    expect((await fs.stat(join(directory, backup))).mode & 0o777).toBe(0o600);
    expect(await fs.readFile(join(directory, backup), 'utf8')).toBe(
      backup.startsWith('master') ? 'original-master' : 'original-shared',
    );
  }
  expect(report.mock.calls.filter(([message]) => message.startsWith('Recovery backup retained:'))).toHaveLength(2);
});

it('rejects external changes before committing and rolls back only its own completed writes', async () => {
  const masterSnapshot = await snapshotFile(master, true);
  const sharedSnapshot = await snapshotFile(shared, true);
  fault.duringWrite = { path: master, otherPath: shared };
  await expect(commitDatabases([
    { snapshot: masterSnapshot, data: Buffer.from('new-master') },
    { snapshot: sharedSnapshot, data: Buffer.from('new-shared') },
  ])).rejects.toThrow('changed during sync');
  expect(await fs.readFile(master, 'utf8')).toBe('original-master');
  expect(await fs.readFile(shared, 'utf8')).toBe('concurrent-update');
});

it('does not write or create backups after detecting a stale snapshot', async () => {
  const snapshot = await snapshotFile(shared, true);
  await fs.writeFile(shared, 'external-change');
  await expect(commitDatabases([{ snapshot, data: Buffer.from('new') }])).rejects.toThrow('changed during sync');
  expect(await fs.readFile(shared, 'utf8')).toBe('external-change');
  expect((await fs.readdir(directory)).some((name) => name.includes('.backup.'))).toBe(false);
});

it('rejects symlinks, hard-linked database aliases, and replaced file identities', async () => {
  const alias = join(directory, 'alias.kdbx');
  await fs.symlink(shared, alias);
  await expect(snapshotFile(alias)).rejects.toThrow('non-symlink');
  await fs.unlink(alias);
  await fs.link(shared, alias);
  expect(() => assertDifferentFiles(
    { identity: { ino: 1, dev: 2 } }, { identity: { ino: 1, dev: 2 } },
  )).toThrow('different files');
  const snapshot = await snapshotFile(shared, true);
  await fs.unlink(shared);
  await fs.writeFile(shared, snapshot.data);
  await expect(commitDatabases([{ snapshot, data: Buffer.from('new') }])).rejects.toThrow('changed during sync');
});

it('releases acquired locks on failure and refuses concurrent runs', async () => {
  const release = await lockDatabases([master, shared]);
  await expect(lockDatabases([master, shared])).rejects.toThrow('Another sync');
  await release();
  const next = await lockDatabases([shared, master]);
  await next();
  expect((await fs.readdir(directory)).some((name) => name.endsWith('.sync-lock'))).toBe(false);
});

it('rolls back after a graceful cancellation and retains the backup', async () => {
  const snapshot = await snapshotFile(shared, true);
  let checks = 0;
  await expect(commitDatabases([{ snapshot, data: Buffer.from('changed') }], () => {}, () => {
    checks++;
    if (checks === 3) throw new Error('cancelled');
  })).rejects.toThrow('cancelled');
  expect(await fs.readFile(shared, 'utf8')).toBe('original-shared');
  expect((await fs.readdir(directory)).some((name) => name.includes('.backup.'))).toBe(true);
});
