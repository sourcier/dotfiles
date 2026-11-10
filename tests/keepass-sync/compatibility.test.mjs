import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { credentials, syncDatabases, unlock } from '../../scripts/keepass-sync/database.mjs';
import { addEntry, database, entry } from './fixtures.mjs';

const keepassAvailable = spawnSync('keepassxc-cli', ['--version']).status === 0;

function keepass(args, input) {
  return new Promise((resolve, reject) => {
    const process = spawn('keepassxc-cli', args);
    let output = '';
    let error = '';
    process.stdout.on('data', (data) => { output += data.toString(); });
    process.stderr.on('data', (data) => { error += data.toString(); });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`KeePassXC fixture command failed (${code}): ${error}`));
    });
    process.stdin.end(input);
  });
}

it.skipIf(!keepassAvailable)('reads KeePassXC-created databases and produces databases KeePassXC can reopen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'keepass-compatibility-tests-'));
  try {
    const masterPath = join(directory, 'master.kdbx');
    const sharedPath = join(directory, 'shared.kdbx');
    await keepass(['db-create', '-q', '-p', '-t', '100', masterPath], 'fixture-master\nfixture-master\n');
    await keepass(['mkdir', '-q', masterPath, '/Explicit'], 'fixture-master\n');
    await keepass(['add', '-q', masterPath, '/Explicit/NativeLogin', '--notes', 'native-note'], 'fixture-master\n');
    const masterKeys = credentials('fixture-master');
    const master = await unlock(await readFile(masterPath), masterKeys, 'native master');
    const shared = database('fixture-shared');
    syncDatabases(master, shared, ['Explicit']);
    addEntry(shared, shared.getDefaultGroup().groups.find((group) => group.name === 'Explicit'), 'NewShared');
    entry(shared, 'NativeLogin').fields.set('Notes', 'updated-shared-note');
    entry(shared, 'NativeLogin').times.lastModTime = new Date(Date.now() + 2000);
    syncDatabases(master, shared, ['Explicit']);
    await writeFile(masterPath, Buffer.from(await master.save()));
    await writeFile(sharedPath, Buffer.from(await shared.save()));
    const savedMaster = await keepass(['show', '-q', masterPath, '/Explicit/NativeLogin'], 'fixture-master\n');
    expect(savedMaster).toContain('updated-shared-note');
    const savedShared = await keepass(['ls', '-q', '-Rf', sharedPath], 'fixture-shared\n');
    expect(savedShared).toContain('Explicit/NativeLogin');
    expect(savedShared).toContain('Explicit/NewShared');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 15000);
