const fonts = {
  playfair: ["'Playfair Display', Georgia, serif", 'Playfair+Display:wght@600'],
  cormorant: ["'Cormorant Garamond', Georgia, serif", 'Cormorant+Garamond:wght@600'],
  cinzel: ["'Cinzel', 'Times New Roman', serif", 'Cinzel:wght@600'],
  oswald: ["'Oswald', 'Arial Narrow', sans-serif", 'Oswald:wght@600'],
};

// OKLCH → linear sRGB, clipped to the display gamut, for WCAG 2 contrast.
function luminance([l, c, h]) {
  const angle = h * Math.PI / 180;
  const a = c * Math.cos(angle), b = c * Math.sin(angle);
  const x = (l + .3963377774 * a + .2158037573 * b) ** 3;
  const y = (l - .1055613458 * a - .0638541728 * b) ** 3;
  const z = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * x - 3.3077115913 * y + .2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - .3413193965 * z,
    -.0041960863 * x - .7034186147 * y + 1.707614701 * z];
  return rgb.map(v => Math.max(0, Math.min(1, v))).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
export function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

export function guideLook(config = {}) {
  const { hue = 265, scheme = 'noite', title_font = 'playfair' } = config;
  if (!Number.isInteger(hue) || hue < 0 || hue > 359 || !['noite', 'papel'].includes(scheme) || !Object.hasOwn(fonts, title_font)) {
    throw new Error('Invalid guide look');
  }
  const dark = scheme === 'noite';
  function palette(h) {
    const color = (l, c) => [l, c, h];
    const colors = {
      'surface-base': color(dark ? .10 : .96, .01),
      'surface-elevated': color(dark ? .14 : .99, dark ? .02 : .005),
      'surface-sunken': color(dark ? .07 : .92, dark ? .01 : .012),
      'surface-divider': color(dark ? .20 : .86, dark ? .02 : .015),
      'surface-hover': color(dark ? .14 : .93, dark ? .02 : .012),
      'text-primary': color(dark ? .95 : .22, dark ? .01 : .02),
      'text-secondary': color(dark ? .75 : .38, .02),
      'text-muted': color(dark ? .60 : .50, .02),
      'text-on-sapphire': color(dark ? .98 : .99, dark ? .01 : .005),
      'brand-primary': color(dark ? .55 : .48, .12),
      'brand-hover': color(dark ? .62 : .42, .12),
      'brand-accent': color(dark ? .78 : .42, dark ? .10 : .11),
    };
    for (let step = 0; step <= 4; step++) {
      const fillPasses = contrast(colors['text-on-sapphire'], colors['brand-primary']) >= 4.5;
      const uiPasses = contrast(colors['brand-primary'], colors['surface-base']) >= 3;
      const accentPasses = ['surface-base', 'surface-elevated'].every(surface => contrast(colors['brand-accent'], colors[surface]) >= 4.5);
      if (fillPasses && uiPasses && accentPasses) return colors;
      if (step === 4) return null;
      if (!fillPasses) colors['brand-primary'][0] -= .02;
      else if (!uiPasses) colors['brand-primary'][0] += .02;
      if (!accentPasses) colors['brand-accent'][0] += dark ? .02 : -.02;
    }
  }
  const colors = palette(hue) ?? palette(265);
  if (!colors) throw new Error('Guide palette does not meet contrast requirements');
  const css = Object.entries(colors).map(([token, [l, c, h]]) => `--color-${token}:oklch(${(l * 100).toFixed(2)}% ${c} ${h})`).join(';');
  return {
    scheme, colors,
    style: `color-scheme:${dark ? 'dark' : 'light'};${css};--font-guide-title:${fonts[title_font][0]}`,
    fontQuery: `Inter:wght@400;500;600&family=Libre+Baskerville&family=Playfair+Display:wght@500;600${title_font === 'playfair' ? '' : `&family=${fonts[title_font][1]}`}`,
  };
}
