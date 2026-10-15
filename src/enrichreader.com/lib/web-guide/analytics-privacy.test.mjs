import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsURL, analyticsDisabled, sanitizeAnalyticsPayload } from './analytics-privacy.mjs';

test('analytics strips private access, free-text queries and view state while retaining position and attribution', () => {
  const value = 'https://enrichreader.com/guia/example?k=secret&resumos=0&l=1&c=9&q=private+text&utm_source=share&n=100#secret';
  assert.equal(analyticsURL(value), '/guia/example?l=1&c=9&utm_source=share');
  const payload = sanitizeAnalyticsPayload({ url: value, referrer: value, name: 'position_set' });
  assert.equal(payload.referrer, payload.url);
  assert.doesNotMatch(JSON.stringify(payload), /secret|private|resumos/);
});

test('showcase tokens never survive either local URLs or external referrers', () => {
  assert.equal(analyticsURL('/guia/v/opaque-token?k=another', { publisher: 'editora-exemplo' }), '/guia/v/editora-exemplo');
  assert.equal(analyticsURL('https://other.example/guia/v/opaque-token?resumos=0'), 'https://other.example/guia/v/showcase');
  assert.equal(analyticsURL('/guia/v/opaque-token', { publisher: 'bad/token' }), '/guia/v/showcase');
  assert.equal(analyticsURL('https://user:password@other.example/a?k=secret'), 'https://other.example/a');
  assert.equal(analyticsURL('javascript:secret'), '');
});

test('privacy preferences and operator opt-out cancel delivery', () => {
  assert.equal(analyticsDisabled(), false);
  for (const options of [{ gpc: true }, { dnt: '1' }, { dnt: 'yes' }, { operator: true }, { locallyDisabled: true }]) assert.equal(analyticsDisabled(options), true);
  assert.equal(sanitizeAnalyticsPayload({ url: '/guia' }, { disabled: true }), false);
});

test('author referral survives only an exact server-approved public guide on the local authors page', () => {
  const options = { approvedGuide: 'frankenstein' };
  assert.equal(analyticsURL('/autores?guia=frankenstein&q=secret', options), '/autores?guia=frankenstein');
  for (const value of ['/autores?guia=private-secret', '/autores?guia=frankenstein&guia=private-secret', '/guia?guia=frankenstein', 'https://other.example/autores?guia=frankenstein']) {
    assert.doesNotMatch(analyticsURL(value, options), /guia=/);
  }
  assert.equal(analyticsURL('/autores?guia=frankenstein'), '/autores');
});
