import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { readConfig } from '../../scripts/keepass-sync/config.mjs';

let directory;
let filename;
const valid = { masterDb: '~/master.kdbx', sharedDb: 'shared.kdbx', groups: ['Explicit'] };

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'keepass-config-tests-'));
  filename = join(directory, 'config.json');
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it('expands home paths, resolves config-relative paths, and retains an explicit allowlist', async () => {
  await writeFile(filename, JSON.stringify({ ...valid, masterKeyFile: '~/key file', twoWay: true }));
  const config = await readConfig(filename, '/fixture-home');
  expect(config.masterDb).toBe('/fixture-home/master.kdbx');
  expect(config.sharedDb).toBe(join(directory, 'shared.kdbx'));
  expect(config.masterKeyFile).toBe('/fixture-home/key file');
  expect(config.groups).toEqual(['Explicit']);
  expect(config.twoWay).toBe(true);
});

it.each([undefined, [], [''], ['Nested/Group'], ['Duplicate', 'Duplicate'], [42]])(
  'rejects missing, empty, ambiguous or invalid group configuration: %s',
  async (groups) => {
    await writeFile(filename, JSON.stringify({ ...valid, groups }));
    await expect(readConfig(filename)).rejects.toThrow('No groups are selected by default');
  },
);

it.each([
  { ...valid, masterDb: '' },
  { ...valid, twoWay: 'yes' },
  { ...valid, password: 'do-not-store-passwords' },
  [],
])('rejects invalid config and unexpected fields', async (config) => {
  await writeFile(filename, JSON.stringify(config));
  await expect(readConfig(filename)).rejects.toThrow();
});

it('reports missing/malformed JSON without revealing its contents', async () => {
  await expect(readConfig(filename)).rejects.toThrow('Could not read JSON');
  await writeFile(filename, 'malformed-sensitive-fixture');
  await expect(readConfig(filename)).rejects.toThrow(`Could not read JSON configuration: ${filename}`);
});
