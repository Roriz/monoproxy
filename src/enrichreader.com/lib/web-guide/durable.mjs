import { open, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function syncDirectory(directory) {
  const handle = await open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}
export async function temporaryFile(path, text) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); }
  catch (error) { await unlink(temporary); throw error; }
  finally { await handle.close(); }
  return temporary;
}
/** Durable private replace: readers see the old or the new file, never a partial one. */
export async function replaceFile(path, text) {
  const temporary = await temporaryFile(path, text);
  try { await rename(temporary, path); await syncDirectory(dirname(path)); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
