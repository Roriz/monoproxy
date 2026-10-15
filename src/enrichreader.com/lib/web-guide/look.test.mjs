import test from 'node:test';
import assert from 'node:assert/strict';
import { guideLook, contrast } from './look.mjs';

test('configured palettes preserve contrast across both schemes and every accent hue', () => {
  for (const scheme of ['noite', 'papel']) {
    for (let hue = 0; hue < 360; hue++) {
      const { colors } = guideLook({ scheme, hue });
      assert.ok(contrast(colors['text-on-sapphire'], colors['brand-primary']) >= 4.5, `${scheme}/${hue}: button`);
      assert.ok(contrast(colors['brand-primary'], colors['surface-base']) >= 3, `${scheme}/${hue}: control`);
      for (const surface of ['surface-base', 'surface-elevated']) {
        assert.ok(contrast(colors['brand-accent'], colors[surface]) >= 4.5, `${scheme}/${hue}: accent`);
      }
    }
  }
});

test('look inputs are whitelisted before rendering CSS or font requests', () => {
  for (const config of [{ hue: -1 }, { hue: 360 }, { hue: '265' }, { scheme: 'system' }, { title_font: 'serif;bad-css' }, { title_font: 'toString' }]) {
    assert.throws(() => guideLook(config), /Invalid guide look/);
  }
  const paper = guideLook({ hue: 18, scheme: 'papel', title_font: 'oswald' });
  assert.match(paper.style, /color-scheme:light/);
  assert.match(paper.fontQuery, /Oswald/);
  assert.match(guideLook().style, /color-scheme:dark/);
});
