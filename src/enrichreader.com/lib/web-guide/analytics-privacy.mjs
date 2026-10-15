/** Privacy boundary shared by every guide tracker payload, including referrers. */
export function analyticsURL(value, { origin = 'https://enrichreader.com', publisher = null, approvedGuide = null } = {}) {
  if (!value) return '';
  try {
    const url = new URL(value, origin);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    url.username = ''; url.password = ''; url.hash = '';
    if (/^\/guia\/v(?:\/|$)/.test(url.pathname)) {
      url.pathname = `/guia/v/${publisher && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publisher) ? publisher : 'showcase'}`;
    }
    const guideReferral = url.origin === origin && /^\/autores\/?$/.test(url.pathname) &&
      typeof approvedGuide === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(approvedGuide) &&
      url.searchParams.getAll('guia').length === 1 && url.searchParams.get('guia') === approvedGuide;
    for (const key of [...url.searchParams.keys()]) {
      if (!(key === 'guia' && guideReferral) && !['l', 'c'].includes(key) && !/^utm_[a-z_]+$/.test(key)) url.searchParams.delete(key);
    }
    return url.origin === origin ? url.pathname + url.search : url.href;
  } catch { return ''; }
}

export function analyticsDisabled({ gpc = false, dnt = null, operator = false, locallyDisabled = false } = {}) {
  return gpc === true || dnt === '1' || dnt === 'yes' || operator || locallyDisabled;
}

/** Called immediately before delivery, independently of event construction. */
export function sanitizeAnalyticsPayload(payload, options = {}) {
  if (!payload || options.disabled) return false;
  return { ...payload, url: analyticsURL(payload.url, options), referrer: analyticsURL(payload.referrer, options) };
}
