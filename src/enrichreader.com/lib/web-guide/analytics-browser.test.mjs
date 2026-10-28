import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createGuideServer } from './server.mjs';
import { tokenHash } from './access.mjs';
import { ApprovalStore, OperatorInbox } from './approval.mjs';
import { FileReportStore } from './reports.mjs';
const playwrightPath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
const guide = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein.json', import.meta.url)));
guide.context = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-context.json', import.meta.url)));
guide.presentation = JSON.parse(await readFile(new URL('../../data/web-guide/frankenstein-presentation.json', import.meta.url)));

async function withBrowser(run, private_ = false) {
  const { chromium } = await import(playwrightPath);
  const directory = await mkdtemp(join(tmpdir(), 'guide-analytics-'));
  const live = 'fixture-private-access-token';
  const value = private_ ? { ...guide, state: 'private', ownership: 'own', presentation: { ...guide.presentation, approval_open: true,
    tour: { entity: 'r-walton', start: { l: 1, c: '3' }, forward: { l: 1, c: '5' } } } } : guide;
  const server = createGuideServer({ guide: value, access: { live_hashes: [tokenHash(live)], revoked_hashes: [] },
    approvalStore: new ApprovalStore(join(directory, 'approvals')), inbox: new OperatorInbox(join(directory, 'inbox')), reportStore: new FileReportStore(join(directory, 'reports')) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try { await run(browser, `http://127.0.0.1:${server.address().port}`, live); }
  finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
}
const capture = () => { window.analyticsEvents = []; window.umami = { track: payload => window.analyticsEvents.push(payload) }; };

test('live search measurement is bucketed and deduplicated without recording query text', { skip: !playwrightPath }, () => withBrowser(async (browser, base) => {
  const page = await browser.newPage(); await page.addInitScript(capture);
  await page.goto(`${base}/guia/frankenstein/mundo?l=1&c=5&utm_source=share`);
  await page.locator('#search').fill('Margaret');
  await page.locator('[data-hub-row]:visible [data-hub-link]').click();
  await page.waitForURL(/pessoa\/margaret/);
  // Preserve the old document's captured records before navigation.
  const entityView = await page.evaluate(() => window.analyticsEvents.find(value => value.name === 'entity_view'));
  assert.equal(entityView.data.entity, 'margaret');
  assert.equal(entityView.data.state, 'positioned');
  await page.goto(`${base}/guia/frankenstein/mundo?l=1&c=5&q=Margaret&utm_source=share`);
  await page.locator('#search').waitFor();
  const search = await page.evaluate(() => window.analyticsEvents.filter(value => value.name === 'mundo_search'));
  assert.equal(search.length, 1);
  assert.equal(search[0].data.results, '1'); assert.equal(search[0].data.top, 'name'); assert.equal(search[0].data.chars, '6+');
  assert.doesNotMatch(JSON.stringify(search), /Margaret|[?&]q=/);
  assert.match(search[0].url, /utm_source=share/);
}));

test('private pageviews and report events never transmit tokens, summary settings or detail text', { skip: !playwrightPath }, () => withBrowser(async (browser, base, live) => {
  const page = await browser.newPage(); await page.addInitScript(capture);
  await page.goto(`${base}/guia/frankenstein?k=${live}&l=1&c=5&resumos=0&utm_source=fixture`);
  await page.locator('footer [data-report]').click();
  await page.locator('[data-report-reason="wrong"]').click();
  await page.locator('[data-report-confirmation]').waitFor();
  await page.locator('#report-detail').fill('confidential correction detail');
  await page.locator('[data-detail-send]').click();
  await page.getByText('Details sent.', { exact: true }).waitFor();
  const events = await page.evaluate(() => window.analyticsEvents);
  assert.ok(events.some(value => value.name === 'report_sent'));
  assert.ok(events.some(value => value.name === 'report_detail'));
  assert.equal(events.find(value => !value.name).data.guide_state, 'private');
  assert.doesNotMatch(JSON.stringify(events), /fixture-private-access-token|resumos=0|confidential correction detail/);
  assert.match(events[0].url, /l=1&c=5/);
}, true));

test('GPC and operator cookies stop measurement even when local storage is unavailable', { skip: !playwrightPath }, () => withBrowser(async (browser, base) => {
  for (const operator of [false, true]) {
    const context = await browser.newContext();
    if (operator) await context.addCookies([{ name: 'er_ops', value: '1', url: base, httpOnly: true }]);
    const page = await context.newPage(); await page.addInitScript(capture);
    await page.addInitScript(operator => {
      if (!operator) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Unavailable'); } });
    }, operator);
    await page.goto(`${base}/guia/frankenstein?l=1&c=5`);
    await page.locator('[data-open-picker]').click();
    assert.equal(await page.evaluate(() => window.analyticsEvents.length), 0);
    if (operator) assert.equal(await page.locator('body').getAttribute('data-operator'), '1');
    await context.close();
  }
}));

test('picker measurement distinguishes untouched prefills, engagement, cancellation and successful movement', { skip: !playwrightPath }, () => withBrowser(async (browser, base) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.addInitScript(capture);
  await page.goto(`${base}/guia/frankenstein?utm_source=fixture`);
  await page.locator('main [data-commit]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.analyticsEvents.some(value => value.name === 'picker_open'));
  await page.locator('main [data-commit]').click();
  await page.waitForFunction(() => window.analyticsEvents.some(value => value.name === 'position_set'));
  let events = await page.evaluate(() => window.analyticsEvents);
  const set = events.find(value => value.name === 'position_set');
  assert.equal(set.data.pos, '1:1'); assert.equal(set.data.input, 'prefill'); assert.equal(set.data.opened_from, 'hero');
  assert.equal(events.filter(value => value.name === 'picker_engage').length, 0);
  await page.locator('[data-open-picker]').click();
  const sheet = page.locator('[data-picker-dialog]');
  await sheet.locator('[data-step="1"]').click();
  await sheet.locator('[data-step="1"]').click();
  await sheet.locator('[data-close]').click(); await sheet.waitFor({ state: 'hidden' });
  events = await page.evaluate(() => window.analyticsEvents);
  assert.equal(events.filter(value => value.name === 'picker_engage').length, 1);
  assert.equal(events.filter(value => value.name === 'position_moved').length, 0);
  await page.locator('[data-open-picker]').click();
  await sheet.locator('[data-step="1"]').click();
  await sheet.locator('[data-commit]').click();
  await page.waitForFunction(() => window.analyticsEvents.some(value => value.name === 'position_moved'));
  const moved = await page.evaluate(() => window.analyticsEvents.find(value => value.name === 'position_moved'));
  assert.equal(moved.data.from, '1:1'); assert.equal(moved.data.to, '1:2');
  assert.equal(moved.data.delta, 1); assert.equal(moved.data.direction, 'forward'); assert.equal(moved.data.opened_from, 'pill');
  assert.match(page.url(), /utm_source=fixture/);
}));

test('footer reach fires once per render and author referral is server-validated before measurement', { skip: !playwrightPath }, () => withBrowser(async (browser, base) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await page.addInitScript(capture);
  await page.goto(`${base}/guia/frankenstein?l=1&c=5`);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.analyticsEvents.some(event => event.name === 'footer_view'));
  const footer = await page.evaluate(() => window.analyticsEvents.filter(event => event.name === 'footer_view'));
  assert.equal(footer.length, 1); assert.equal(footer[0].data.app_link, false);
  await page.locator('.app-bridge a').evaluate(link => link.addEventListener('click', event => event.preventDefault()));
  await page.locator('.app-bridge a').click();
  await page.waitForFunction(() => window.analyticsEvents.some(event => event.name === 'app_link_click'));
  assert.equal(await page.evaluate(() => window.analyticsEvents.filter(event => event.name === 'app_link_click').length), 1);
  await page.locator('header').scrollIntoViewIfNeeded(); await page.locator('footer').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => window.analyticsEvents.filter(event => event.name === 'footer_view').length), 1);
  await page.goto(`${base}/autores?guia=frankenstein&q=confidential`);
  await page.waitForFunction(() => window.analyticsEvents.some(event => !event.name));
  assert.equal(await page.evaluate(() => window.analyticsEvents.find(event => !event.name).url), '/autores?guia=frankenstein');
  await page.goto(`${base}/autores?guia=private-secret`);
  await page.waitForFunction(() => window.analyticsEvents.some(event => !event.name));
  assert.equal(await page.evaluate(() => window.analyticsEvents.find(event => !event.name).url), '/autores');
}));
