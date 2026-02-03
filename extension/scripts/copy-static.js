import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

async function main() {
  await mkdir(dist, { recursive: true });

  // Copy manifest.json to dist/ so Chrome can load dist/ as the unpacked extension.
  await cp(path.resolve(root, 'manifest.json'), path.resolve(dist, 'manifest.json'));

  // Copy icons directory
  await cp(path.resolve(root, 'icons'), path.resolve(dist, 'icons'), { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

