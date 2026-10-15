import { mkdir, readFile, open, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { tokenHash } from './access.mjs';
const [action, series] = process.argv.slice(2);
if (!['create', 'revoke'].includes(action) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(series ?? '')) throw new Error('Usage: token-cli.mjs create|revoke <series>; revoke reads the token from stdin');
const root = process.env.WEB_GUIDE_REPORT_DIR || resolve('tmp/web-guide-reports');
const file = process.env.WEB_GUIDE_ACCESS_CONFIG || resolve(root, 'access.json');
let data = {};
try { data = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const access = data[series] ??= { live_hashes: [], revoked_hashes: [] };
let token;
if (action === 'create') {
  token = randomBytes(24).toString('base64url'); access.live_hashes.push(tokenHash(token));
} else {
  const chunks = []; let size = 0;
  for await (const chunk of process.stdin) { size += chunk.length; if (size > 1024) throw new Error('Token input too long'); chunks.push(chunk); }
  const hash = tokenHash(Buffer.concat(chunks).toString('utf8').trim());
  if (!access.live_hashes.includes(hash)) throw new Error('Token is not live');
  access.live_hashes = access.live_hashes.filter(value => value !== hash);
  if (!access.revoked_hashes.includes(hash)) access.revoked_hashes.push(hash);
}
await mkdir(dirname(file), { recursive: true, mode: 0o700 });
const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
const handle = await open(temporary, 'wx', 0o600);
try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
await rename(temporary, file);
const directory = await open(dirname(file), 'r'); try { await directory.sync(); } finally { await directory.close(); }
if (token) console.log(`https://enrichreader.com/guia/${series}?k=${token}`);
else console.log('Token revoked.');
console.error('Restart the guide service to load the updated access configuration.');
