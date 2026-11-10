import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { addEntry, database, entry } from './fixtures.mjs';
import { credentials, syncDatabases, unlock } from '../../scripts/keepass-sync/database.mjs';

const execute = promisify(execFile);
const bundle = resolve('bin/sync-keepass-db');
let directory;
let command;
let configFile;
let masterPath;
let sharedPath;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'keepass-cli-tests-'));
  command = join(directory, 'bin', 'sync-keepass-db');
  await mkdir(dirname(command));
  await copyFile(bundle, command);
  configFile = join(directory, 'config.json');
  masterPath = join(directory, 'Master file.kdbx');
  sharedPath = join(directory, 'Shared file.kdbx');
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

async function fixtures(twoWay = false) {
  const master = database('master-fixture');
  const chosen = master.createGroup(master.getDefaultGroup(), 'Chosen');
  addEntry(master, chosen, 'Login');
  const privateGroup = master.createGroup(master.getDefaultGroup(), 'Private');
  addEntry(master, privateGroup, 'PrivateLogin');
  const shared = database('shared-fixture', { kdf: 'Argon2d' });
  syncDatabases(master, shared, ['Chosen']);
  const incoming = entry(shared, 'Login');
  incoming.pushHistory();
  incoming.fields.set('Notes', 'shared-to-master');
  incoming.times.lastModTime = new Date('2026-03-01');
  await writeFile(masterPath, Buffer.from(await master.save()));
  await writeFile(sharedPath, Buffer.from(await shared.save()));
  await writeFile(configFile, JSON.stringify({
    masterDb: masterPath,
    sharedDb: sharedPath,
    groups: ['Chosen'],
    twoWay,
  }));
}

function interactive(args, passwords = ['master-fixture', 'shared-fixture']) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('/bin/bash', [
      '-c', '/bin/cat | /usr/bin/script -q /dev/null "$@"',
      'keepass-pty-test', process.execPath, command, '--config', configFile, ...args,
    ], {
      cwd: directory,
      env: { ...process.env, HOME: directory },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    let prompted = 0;
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`CLI test timed out: ${output}`));
    }, 15000);
    const consume = (data) => {
      output += data.toString();
      const prompts = ['Master database password: ', 'Shared database password: '];
      if (prompted < 2 && output.includes(prompts[prompted])) {
        child.stdin.write(`${passwords[prompted]}\n`);
        prompted++;
        if (prompted === 2) child.stdin.end();
      }
    };
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolveResult({ code, output });
    });
  });
}

it('runs help outside the checkout with no installed dependencies or KeePassXC', async () => {
  const { stdout } = await execute(process.execPath, [command, '--help'], { cwd: directory, env: { PATH: '/usr/bin:/bin' } });
  expect(stdout).toContain('Usage: sync-keepass-db');
  expect(stdout).toContain('No passwords are stored');
});

it('rejects empty configuration groups before reading passwords or touching databases', async () => {
  await writeFile(configFile, JSON.stringify({ masterDb: masterPath, sharedDb: sharedPath, groups: [] }));
  await expect(execute(process.execPath, [command, '--config', configFile])).rejects.toMatchObject({
    stderr: expect.stringContaining('No groups are selected by default'),
  });
  expect(await readdir(directory)).toEqual(['bin', 'config.json']);
});

it('runs configured one-way, dry-run, and two-way modes while retaining file identity and metadata', async () => {
  await fixtures();
  const before = await readFile(masterPath);
  const sharedBefore = await readFile(sharedPath);
  const masterInode = (await stat(masterPath)).ino;
  const sharedInode = (await stat(sharedPath)).ino;
  await execute('/usr/bin/xattr', ['-w', 'com.dotfiles.keepass-test', 'master-marker', masterPath]);
  await execute('/usr/bin/xattr', ['-w', 'com.dotfiles.keepass-test', 'sharing-marker', sharedPath]);

  const dryRun = await interactive(['--two-way', '--dry-run']);
  expect(dryRun.output).toContain('Dry run complete');
  expect(await readFile(masterPath)).toEqual(before);
  expect(await readFile(sharedPath)).toEqual(sharedBefore);

  const oneWay = await interactive([]);
  expect(oneWay.output).toContain('Synced 1 groups (one-way)');
  expect(await readFile(masterPath)).toEqual(before);

  const twoWay = await interactive(['--two-way']);
  expect(twoWay.output).toContain('Synced 1 groups (two-way)');
  expect(twoWay.output).not.toContain('master-fixture');
  expect(twoWay.output).not.toContain('shared-fixture');
  const master = await unlock(await readFile(masterPath), credentials('master-fixture'), 'master');
  const shared = await unlock(await readFile(sharedPath), credentials('shared-fixture'), 'shared');
  expect(entry(master, 'Login').fields.get('Notes')).toBe('shared-to-master');
  expect(entry(master, 'PrivateLogin')).toBeDefined();
  expect(entry(shared, 'PrivateLogin')).toBeUndefined();
  expect((await stat(masterPath)).ino).toBe(masterInode);
  expect((await stat(sharedPath)).ino).toBe(sharedInode);
  expect((await execute('/usr/bin/xattr', ['-p', 'com.dotfiles.keepass-test', masterPath])).stdout.trim()).toBe('master-marker');
  expect((await execute('/usr/bin/xattr', ['-p', 'com.dotfiles.keepass-test', sharedPath])).stdout.trim()).toBe('sharing-marker');
  expect((await readdir(directory)).some((name) => name.includes('.backup.') || name.endsWith('.sync-lock'))).toBe(false);
}, 25000);

it('uses twoWay from config and suppresses routine output with --quiet, not prompts/errors', async () => {
  await fixtures(true);
  const result = await interactive(['--quiet']);
  expect(result.output).toContain('Master database password:');
  expect(result.output).toContain('Shared database password:');
  expect(result.output).not.toContain('[1/5]');
  expect(result.output).not.toContain('Synced');
  const master = await unlock(await readFile(masterPath), credentials('master-fixture'), 'master');
  expect(entry(master, 'Login').fields.get('Notes')).toBe('shared-to-master');
  const before = await readFile(masterPath);
  const failed = await interactive(['--quiet'], ['wrong-fixture', 'shared-fixture']);
  expect(failed.output).toContain('Could not unlock master');
  expect(await readFile(masterPath)).toEqual(before);
  expect((await readdir(directory)).some((name) => name.endsWith('.sync-lock'))).toBe(false);
});

it('reports real timestamp conflicts safely and leaves both files unchanged', async () => {
  await fixtures(true);
  const master = await unlock(await readFile(masterPath), credentials('master-fixture'), 'master');
  const sharedKeys = credentials('shared-fixture');
  const shared = await unlock(await readFile(sharedPath), sharedKeys, 'shared');
  entry(shared, 'Login').times.lastModTime = entry(master, 'Login').times.lastModTime;
  await writeFile(sharedPath, Buffer.from(await shared.save()));
  const masterBefore = await readFile(masterPath);
  const sharedBefore = await readFile(sharedPath);
  const result = await interactive(['--quiet']);
  expect(result.output).toContain(entry(master, 'Login').uuid.id);
  expect(result.output).toContain('fields["Notes"]');
  expect(result.output).toContain('Neither database has been written');
  expect(result.output).not.toContain('shared-to-master');
  expect(await readFile(masterPath)).toEqual(masterBefore);
  expect(await readFile(sharedPath)).toEqual(sharedBefore);
  expect((await readdir(directory)).some((name) => name.includes('.backup.') || name.endsWith('.sync-lock'))).toBe(false);
});
