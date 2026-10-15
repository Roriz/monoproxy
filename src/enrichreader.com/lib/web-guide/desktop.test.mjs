import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideServer } from './server.mjs';
const modulePath = process.env.WEB_GUIDE_PLAYWRIGHT_MODULE;
test('reader adapts navigation, panel columns and modal placement across desktop breakpoint', { skip: !modulePath }, async () => {
  const { chromium } = await import(modulePath);
  const server = createGuideServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://**/*', route => route.abort());
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const width of [360, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`${base}/guia/frankenstein?l=1&c=9`);
      assert.equal(await page.locator('.bottom-tabs').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const nav = await page.locator('.bottom-tabs').boundingBox();
      const recap = await page.locator('.panel-recap').boundingBox();
      const aside = await page.locator('.panel-aside').boundingBox();
      if (width >= 1024) {
        assert.ok(nav.y < 72 && nav.y + nav.height <= 73);
        assert.ok(aside.x >= recap.x + recap.width);
        assert.ok(Math.abs(aside.y - recap.y) < 2);
        const brand = await page.locator('.brand').boundingBox();
        const position = await page.locator('[data-open-picker]').boundingBox();
        assert.ok(brand.x + brand.width <= nav.x + 1);
        assert.ok(nav.x + nav.width <= position.x + 1);
      } else if (width >= 768) {
        assert.ok(nav.y >= 55 && nav.y + nav.height <= 113);
        assert.ok(aside.y >= recap.y + recap.height - 1);
      } else {
        assert.equal(nav.y + nav.height, 780);
        assert.ok(aside.y >= recap.y + recap.height - 1);
      }
      await page.locator('[data-open-picker]').click();
      await page.waitForTimeout(280);
      const dialog = await page.locator('[data-picker-dialog]').boundingBox();
      assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= 781);
      if (width >= 768) {
        assert.equal(dialog.width, 480);
        assert.ok(Math.abs(dialog.x + dialog.width / 2 - width / 2) < 2);
        assert.ok(Math.abs(dialog.y + dialog.height / 2 - 390) < 2);
      } else assert.ok(Math.abs(dialog.y + dialog.height - 780) < 2);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[data-picker-dialog]').open);
      assert.equal(new URL(page.url()).searchParams.get('c'), '9');
      assert.equal(await page.evaluate(() => localStorage.getItem('er.pos.frankenstein')), null);
      await page.locator('.bottom-tabs a[href*=mundo]').click();
      assert.equal(new URL(page.url()).searchParams.get('c'), '9');
      const cards = page.locator('[data-hub-known] [data-hub-row]:visible');
      const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
      if (width >= 768) assert.ok(Math.abs(first.y - second.y) < 2 && second.x > first.x);
      else assert.ok(second.y > first.y);
    }
    // The same server-rendered document must reflow with scripts disabled.
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.route('https://**/*', route => route.abort());
    await noJS.goto(`${base}/guia/frankenstein?l=1&c=9`);
    for (const width of [320, 375, 640, 767, 768, 1023, 1024, 1280, 1920]) {
      await noJS.setViewportSize({ width, height: 780 });
      const navigation = await noJS.locator('.bottom-tabs').boundingBox();
      assert.equal(await noJS.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width < 768) assert.equal(navigation.y + navigation.height, 780);
      else assert.ok(navigation.y + navigation.height <= (width < 1024 ? 113 : 73));
    }
    await noJS.close();
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
