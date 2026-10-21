import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { FileReportStore } from './reports.mjs';

const site = fileURLToPath(new URL('../../', import.meta.url));
const rootDirectory = process.env.WEB_GUIDE_REPORT_DIR || resolve(site, '../../tmp/web-guide-reports');
const mode = process.argv[2] ?? 'reports';
if (!['reports', 'inbox', 'approvals', 'notifications'].includes(mode)) throw new Error('Expected reports, inbox, approvals or notifications');
const store = new FileReportStore(mode === 'reports' ? rootDirectory : join(rootDirectory, mode));
console.log(JSON.stringify(await store.list(), null, 2));
