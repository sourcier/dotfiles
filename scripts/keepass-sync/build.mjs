import { chmod, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const kdbxRequire = createRequire(require.resolve('kdbxweb'));
const licenses = [];
for (const name of ['kdbxweb', '@xmldom/xmldom', 'fflate']) {
  const packageRoot = name === 'fflate'
    ? resolve(dirname(kdbxRequire.resolve(name)), '..')
    : dirname(kdbxRequire.resolve(`${name}/package.json`));
  const license = await readFile(join(packageRoot, 'LICENSE'), 'utf8');
  licenses.push(`${name}\n${license}`);
}

await build({
  entryPoints: ['scripts/keepass-sync/cli.mjs'],
  outfile: 'bin/sync-keepass-db',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24.7',
  minify: true,
  legalComments: 'eof',
  footer: { js: `/*\nBundled dependency licenses:\n\n${licenses.join('\n\n')}\n*/` },
});
await chmod(resolve('bin/sync-keepass-db'), 0o755);
