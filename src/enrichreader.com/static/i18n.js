(() => {
  'use strict';

  const dictionaries = window.EnrichReaderTranslations || {};
  const rawTranslations = Object.assign({}, dictionaries.shared || {}, dictionaries.page || {});
  const translations = Object.create(null);
  Object.entries(rawTranslations).forEach(([english, portuguese]) => {
    const key = normalize(english);
    if (key && typeof portuguese === 'string') translations[key] = trimEdges(portuguese);
  });
  const reverse = new Map();
  const duplicateValues = new Set();

  Object.entries(translations).forEach(([english, portuguese]) => {
    const value = normalize(portuguese);
    if (!value) return;
    if (reverse.has(value) && reverse.get(value) !== english) duplicateValues.add(value);
    else reverse.set(value, english);
  });
  duplicateValues.forEach(value => reverse.delete(value));

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function compileTemplate(template, english, output) {
    const parameters = [];
    const parts = normalize(template).split(/(\{[A-Za-z][A-Za-z0-9_]*\})/g);
    const numericParameters = new Set(['count', 'chapter', 'volume', 'from', 'to', 'sections', 'chapters', 'characters', 'places']);
    let source = '^';
    let literalLength = 0;
    const literals = [];
    parts.forEach(part => {
      const match = part.match(/^\{([A-Za-z][A-Za-z0-9_]*)\}$/);
      if (match) {
        parameters.push(match[1]);
        source += numericParameters.has(match[1]) ? '([0-9][0-9,.\\u00a0 ]*)' : '(.{1,160}?)';
      } else if (part) {
        literalLength += part.length;
        literals.push(part);
        source += escapeRegExp(part);
      }
    });
    source += '$';
    return { template, english, output, parameters, literals, literalLength, regex: new RegExp(source) };
  }

  const englishTemplates = [];
  const portugueseTemplates = [];
  const reverseTemplateValues = new Map();
  Object.entries(translations).forEach(([english, portuguese]) => {
    if (!/\{[A-Za-z][A-Za-z0-9_]*\}/.test(english) || typeof portuguese !== 'string') return;
    englishTemplates.push(compileTemplate(english, english, portuguese));
    const normalizedPortuguese = normalize(portuguese);
    if (reverseTemplateValues.has(normalizedPortuguese) && reverseTemplateValues.get(normalizedPortuguese) !== english) {
      reverseTemplateValues.set(normalizedPortuguese, null);
    } else if (!reverseTemplateValues.has(normalizedPortuguese)) {
      reverseTemplateValues.set(normalizedPortuguese, english);
    }
  });
  reverseTemplateValues.forEach((english, portuguese) => {
    if (english) portugueseTemplates.push(compileTemplate(portuguese, english, english));
  });
  englishTemplates.sort((a, b) => b.literalLength - a.literalLength);
  portugueseTemplates.sort((a, b) => b.literalLength - a.literalLength);

  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  const translatableAttributes = ['title', 'aria-label', 'placeholder', 'alt'];
  const metadataSelector = [
    'meta[name="description"]',
    'meta[name="title"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]'
  ].join(',');
  const excludedSubtreeSelector = 'script,style,noscript,code,pre,kbd,samp,svg,[data-i18n-ignore]';
  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function trimEdges(value) {
    return String(value).replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function renderTemplate(template, parameters, targetLanguage, depth = 0) {
    return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name) => {
      if (!Object.prototype.hasOwnProperty.call(parameters || {}, name)) return token;
      let value = String(parameters[name]);
      if (depth < 2 && ['edition', 'filter', 'label', 'part', 'position', 'type'].includes(name)) {
        const source = resolvedSource(value);
        if (source) {
          value = targetLanguage === 'pt-BR'
            ? renderTemplate(translations[source.english], source.parameters, targetLanguage, depth + 1)
            : source.englishRaw;
        }
      }
      return value;
    });
  }

  function templateMatch(value, templates, reverseSource = false) {
    const normalized = normalize(value);
    if (normalized.length > 512) return null;
    for (const entry of templates) {
      if (!entry.literals.every(literal => normalized.includes(literal))) continue;
      const match = entry.regex.exec(normalized);
      if (!match) continue;
      const parameters = Object.create(null);
      entry.parameters.forEach((name, index) => { parameters[name] = match[index + 1]; });
      const englishRaw = reverseSource
        ? renderTemplate(entry.english, parameters, 'en')
        : String(value).replace(/^\s+/, '').replace(/\s+$/, '');
      return { english: entry.english, englishRaw, parameters };
    }
    return null;
  }

  function languageFrom(value) {
    if (/^pt(?:-|$)/i.test(value || '')) return 'pt-BR';
    if (/^en(?:-|$)/i.test(value || '')) return 'en';
    return null;
  }

  function initialLanguage() {
    try {
      const explicit = languageFrom(new URLSearchParams(window.location.search).get('lang'));
      if (explicit) {
        try { window.localStorage.setItem('enrichreader-language', explicit); } catch (_) {}
        return explicit;
      }
    } catch (_) {}

    try {
      const saved = languageFrom(window.localStorage.getItem('enrichreader-language'));
      if (saved) return saved;
    } catch (_) {}

    const browserLanguages = navigator.languages || [navigator.language || ''];
    return browserLanguages.map(languageFrom).find(Boolean) || 'en';
  }

  let currentLanguage = initialLanguage();

  function resolvedSource(value) {
    const key = normalize(value);
    if (!key) return null;
    const rawWithoutEdges = String(value).replace(/^\s+/, '').replace(/\s+$/, '');
    if (Object.prototype.hasOwnProperty.call(translations, key)) {
      return { english: key, englishRaw: rawWithoutEdges, parameters: Object.create(null) };
    }
    const english = reverse.get(key);
    if (english) return { english, englishRaw: english, parameters: Object.create(null) };
    return templateMatch(value, englishTemplates) || templateMatch(value, portugueseTemplates, true);
  }

  function preserveEdges(original, replacement) {
    const leading = (String(original).match(/^\s*/) || [''])[0];
    const trailing = (String(original).match(/\s*$/) || [''])[0];
    return leading + replacement + trailing;
  }

  function sourceFor(value, record) {
    if (record && value === record.lastRendered) {
      return { english: record.english, englishRaw: record.englishRaw, parameters: record.parameters };
    }
    return resolvedSource(value);
  }

  function translateText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-i18n-ignore]')) return;
    if (parent.closest('script,style,noscript,code,pre,kbd,samp,svg')) return;

    const value = node.nodeValue;
    if (!normalize(value)) return;

    let record = textRecords.get(node);
    const source = sourceFor(value, record);
    if (!source) {
      if (record && value !== record.lastRendered) {
        record.english = value;
        record.englishRaw = value;
        record.lastRendered = null;
      }
      return;
    }

    if (!record) {
      record = { english: source.english, englishRaw: source.englishRaw, parameters: source.parameters, lastRendered: null };
      textRecords.set(node, record);
    } else {
      record.english = source.english;
      record.englishRaw = source.englishRaw;
      record.parameters = source.parameters;
    }

    const translated = currentLanguage === 'pt-BR'
      ? renderTemplate(translations[source.english], source.parameters, 'pt-BR')
      : source.englishRaw;
    if (typeof translated !== 'string') return;
    const next = preserveEdges(value, translated);
    if (next !== value) node.nodeValue = next;
    record.lastRendered = next;
  }

  function translateAttribute(element, name) {
    if (element.closest('[data-i18n-ignore]')) return;
    if (!element.hasAttribute(name)) return;
    const value = element.getAttribute(name);
    let records = attributeRecords.get(element);
    if (!records) {
      records = Object.create(null);
      attributeRecords.set(element, records);
    }
    let record = records[name];
    const source = sourceFor(value, record);
    if (!source) {
      if (record && value !== record.lastRendered) {
        record.english = value;
        record.englishRaw = value;
        record.parameters = Object.create(null);
        record.lastRendered = null;
      }
      return;
    }

    if (!record) record = records[name] = { english: source.english, englishRaw: source.englishRaw, parameters: source.parameters, lastRendered: null };
    else {
      record.english = source.english;
      record.englishRaw = source.englishRaw;
      record.parameters = source.parameters;
    }
    const translated = currentLanguage === 'pt-BR'
      ? renderTemplate(translations[source.english], source.parameters, 'pt-BR')
      : source.englishRaw;
    if (typeof translated !== 'string') return;
    const next = preserveEdges(value, translated);
    if (next !== value) element.setAttribute(name, next);
    record.lastRendered = next;
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;
    if (element.closest(excludedSubtreeSelector)) return;
    if (element.matches(metadataSelector)) translateAttribute(element, 'content');
    translatableAttributes.forEach(name => translateAttribute(element, name));
    if (element.hasAttribute('data-language-choice')) {
      const selected = languageFrom(element.getAttribute('data-language-choice')) === currentLanguage;
      element.setAttribute('aria-pressed', String(selected));
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateText(root);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE && root.closest(excludedSubtreeSelector)) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.matches(excludedSubtreeSelector) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateText(node);
      else translateElement(node);
    }
  }

  function updateSelectors() {
    document.querySelectorAll('[data-language-choice]').forEach(button => {
      const selected = languageFrom(button.getAttribute('data-language-choice')) === currentLanguage;
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function setLanguage(language, persist) {
    currentLanguage = languageFrom(language) || 'en';
    document.documentElement.lang = currentLanguage;
    updateSelectors();
    translateTree(document.documentElement);

    if (persist) {
      try { window.localStorage.setItem('enrichreader-language', currentLanguage); } catch (_) {}
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.delete('lang');
          window.history.replaceState(window.history.state, '', url.href);
        }
      } catch (_) {}
      document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: currentLanguage } }));
    }
  }

  window.EnrichReaderI18n = {
    get language() { return currentLanguage; },
    t(englishKey, parameters = {}) {
      const key = String(englishKey);
      const source = currentLanguage === 'pt-BR' ? (translations[key] || key) : key;
      return renderTemplate(source, parameters, currentLanguage);
    }
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-language-choice]');
    if (button) setLanguage(button.getAttribute('data-language-choice'), true);
  });

  document.documentElement.lang = currentLanguage;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData') translateText(mutation.target);
      else if (mutation.type === 'attributes') translateElement(mutation.target);
      else mutation.addedNodes.forEach(node => translateTree(node));
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'placeholder', 'alt', 'content']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setLanguage(currentLanguage, false), { once: true });
  } else {
    setLanguage(currentLanguage, false);
  }
})();
