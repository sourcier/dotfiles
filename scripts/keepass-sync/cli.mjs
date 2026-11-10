#!/usr/bin/env node
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { configureCrypto, credentials, syncDatabases, unlock } from './database.mjs';
import { readConfig } from './config.mjs';
import { assertDifferentFiles, commitDatabases, lockDatabases, readKeyFile, snapshotFile } from './storage.mjs';

const help = `Usage: sync-keepass-db [--config FILE] [--two-way] [--dry-run] [-q|--quiet]

Sync explicitly configured top-level KeePass groups; no default groups.

Options:
  --config FILE  Default: ~/.config/keepass-sync/config.json
  --two-way      Import shared additions and edits first; delete in master only
  --dry-run      Verify the merge without writing either database
  -q, --quiet    Suppress routine output, retaining prompts and errors
  -h, --help     Show this help

Requires Node.js 24.7+. Close both databases and wait for iCloud sync first.
No passwords are stored in the configuration or accepted as arguments.`;

function password(prompt) {
  if (!process.stdin.isTTY) {
    throw new Error('Password entry requires an interactive terminal.');
  }
  return new Promise((resolvePassword, reject) => {
    const terminal = process.stdin;
    const wasRaw = terminal.isRaw;
    const priorEncoding = terminal.readableEncoding;
    let value = '';
    const finish = (error) => {
      terminal.removeListener('data', onData);
      terminal.removeListener('end', onEnd);
      process.removeListener('SIGTERM', onSignal);
      process.removeListener('SIGHUP', onSignal);
      terminal.setRawMode(wasRaw);
      terminal.setEncoding(priorEncoding ?? 'utf8');
      terminal.pause();
      process.stderr.write('\n');
      if (error) reject(error);
      else resolvePassword(value);
      value = '';
    };
    const onEnd = () => finish(new Error('Password input closed.'));
    const onSignal = () => finish(new Error('Password entry interrupted.'));
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003' || character === '\u0004') {
          finish(new Error('Password entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') value = [...value].slice(0, -1).join('');
        else if (character === '\u0015') value = '';
        else if (character >= ' ') value += character;
      }
    };
    process.stderr.write(prompt);
    terminal.setRawMode(true);
    terminal.setEncoding('utf8');
    terminal.on('data', onData);
    terminal.once('end', onEnd);
    process.once('SIGTERM', onSignal);
    process.once('SIGHUP', onSignal);
    terminal.resume();
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: 'string' },
      'two-way': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      quiet: { type: 'boolean', short: 'q' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log(help);
    return;
  }
  configureCrypto();
  const configPath = resolve(values.config ?? `${homedir()}/.config/keepass-sync/config.json`);
  const config = await readConfig(configPath);
  const twoWay = values['two-way'] || config.twoWay === true;
  const report = (message) => {
    if (!values.quiet) process.stderr.write(`${message}\n`);
  };
  const warn = (message) => process.stderr.write(`${message}\n`);
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  const checkCancelled = () => {
    if (cancelled) throw new Error('Sync interrupted.');
  };
  process.on('SIGINT', cancel);
  process.on('SIGTERM', cancel);
  process.on('SIGHUP', cancel);
  let release;
  try {
    release = await lockDatabases([config.masterDb, config.sharedDb]);
    report('[1/5] Reading local encrypted databases...');
    const masterFile = await snapshotFile(config.masterDb, twoWay);
    const sharedFile = await snapshotFile(config.sharedDb, true);
    assertDifferentFiles(masterFile, sharedFile);
    const masterKeys = credentials(await password('Master database password: '), await readKeyFile(config.masterKeyFile));
    const sharedKeys = credentials(await password('Shared database password: '), await readKeyFile(config.sharedKeyFile));
    checkCancelled();
    report('[2/5] Unlocking databases...');
    const master = await unlock(masterFile.data, masterKeys, 'master');
    const shared = await unlock(sharedFile.data, sharedKeys, 'shared');
    report('[3/5] Merging configured groups in memory...');
    // In one-way mode, shared edits affect the outgoing view, never the master file.
    syncDatabases(master, shared, config.groups, report);
    checkCancelled();
    report('[4/5] Encrypting and reopening merged databases...');
    const sharedData = Buffer.from(await shared.save());
    await unlock(sharedData, sharedKeys, 'merged shared');
    const updates = [];
    if (twoWay) {
      const masterData = Buffer.from(await master.save());
      await unlock(masterData, masterKeys, 'merged master');
      updates.push({ snapshot: masterFile, data: masterData });
    }
    updates.push({ snapshot: sharedFile, data: sharedData });
    checkCancelled();
    if (values['dry-run']) {
      report('Dry run complete. Neither database was changed.');
      return;
    }
    report('[5/5] Backing up and updating existing files in place...');
    await commitDatabases(updates, warn, checkCancelled);
    report(`Synced ${config.groups.length} groups (${twoWay ? 'two-way' : 'one-way'}).`);
  } finally {
    if (release) await release();
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
    process.removeListener('SIGHUP', cancel);
  }
}

main().catch((error) => {
  process.stderr.write(`sync-keepass-db: ${error.message}\n`);
  process.exitCode = 1;
});
