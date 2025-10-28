// Creates a small, deterministic directory tree inside a given base dir.
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function makeFixture(base) {
  await mkdir(join(base, 'a'), { recursive: true });
  await mkdir(join(base, 'b'), { recursive: true });
  await writeFile(join(base, 'a', 'alpha.txt'), 'alpha\n');
  await writeFile(join(base, 'a', 'zeta.txt'), 'zeta\n');
  await writeFile(join(base, 'b', 'beta.txt'), 'beta\n');
  // Hidden + binary-ish files to ensure filtering/ordering is stable
  await writeFile(join(base, '.dotfile'), 'dot\n');
  await writeFile(join(base, 'b', 'img.bin'), Buffer.from([0, 1, 2, 3]));
}

