import { createGuideServer } from '../../src/enrichreader.com/lib/web-guide/server.mjs';
import { resolve } from 'node:path';
const modulePath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set WEB_GUIDE_PLAYWRIGHT_MODULE to an installed Playwright module');
const { chromium } = await import(modulePath);
import { mkdir, writeFile } from 'node:fs/promises';
const server = createGuideServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true});
const base = `http://127.0.0.1:${server.address().port}`;
const output = resolve(process.argv[2] ?? 'tmp/web-guide-ui/capture'); await mkdir(output,{recursive:true}); const checks=[];
try {
 for (const width of [360,1280]) {
  const page = await browser.newPage({viewport:{width,height:780}}); await page.route('https://**/*',route=>route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for (const [name,path] of [['authors','/autores'],['gate','/guia/frankenstein'],['panel','/guia/frankenstein?l=1&c=9'],['profile','/guia/frankenstein/pessoa/victor?l=1&c=9'],['world','/guia/frankenstein/mundo?l=1&c=9'],['timeline','/guia/frankenstein/tempo?l=1&c=9'],['mysteries','/guia/frankenstein/misterios?l=1&c=9']]) {
   await page.goto(base+path); await page.waitForTimeout(80);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)throw new Error(`Horizontal overflow ${name} ${width}`);
   await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true}); await page.screenshot({path:`${output}/${name}-${width}-fold.png`});checks.push({page:name,width,overflow});
  } await page.goto(base+'/guia/frankenstein?l=1&c=9'); await page.locator('[data-open-picker]').click(); await page.waitForTimeout(400); await page.screenshot({path:`${output}/picker-${width}.png`}); if(errors.length)throw new Error(errors.join('\n'));await page.close();
 }
 const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:360,height:780}});await noJS.route('https://**/*',route=>route.abort());await noJS.goto(base+'/guia/frankenstein');await noJS.locator('main select[name=c]').selectOption('9');await noJS.locator('main [data-commit]').click();await noJS.locator('[data-position-heading]').waitFor();if(new URL(noJS.url()).searchParams.get('c')!=='9')throw new Error('No-JS commit failed');checks.push({no_js_commit:true});
 await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));console.log(`Verified ${checks.length} visual/no-JS cases; no browser errors.`);
} finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
