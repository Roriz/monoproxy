import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const site = fileURLToPath(new URL('../../', import.meta.url));
const rootDirectory = process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports');
const mode = process.argv[2] ?? 'reports';
if (!['reports', 'inbox', 'approvals', 'notifications'].includes(mode)) throw new Error('Expected reports, inbox, approvals or notifications');
const directory = mode === 'reports' ? rootDirectory : join(rootDirectory, mode);
let files;
try { files = await readdir(directory); }
catch (error) { if (error.code !== 'ENOENT') throw error; files = []; }
const reports = await Promise.all(files.filter(file => /^[0-9a-f-]+\.json$/i.test(file)).map(async file => JSON.parse(await readFile(join(directory, file), 'utf8'))));
reports.sort((a, b) => a.ts.localeCompare(b.ts));
console.log(JSON.stringify(reports, null, 2));
