import { escape } from './content.mjs';
import { authorURL } from './position.mjs';
export const officialGuide = guide => guide.ownership === 'own' && ['public', 'unlisted'].includes(guide.state) && ['autores', 'editora'].includes(guide.presentation?.approved_by);
export function approvalLine(guide) {
  if (!officialGuide(guide)) return '';
  return guide.presentation.approved_by === 'editora' ? `✓ Guia oficial · aprovado pela ${guide.presentation.publisher.name}` : `✓ Guia oficial · aprovado por ${guide.authors.join(' e ')}`;
}
export function thirdPartyBanner(guide) {
  if (guide.ownership !== 'third_party' || guide.state !== 'unlisted') return '';
  return `<aside class="demo-banner" data-nosnippet aria-label="Demonstração não oficial"><button type="button" data-open-demo data-demo-surface="banner" aria-haspopup="dialog">Demonstração não oficial · não pública</button> · obra de ${escape(guide.authors.join(' e '))}, ${escape(guide.presentation.publisher.name)}</aside>`;
}
export function demoDialog(guide) {
  if (guide.ownership !== 'third_party') return '';
  const publisher = guide.presentation.publisher;
  const email = guide.site?.email ?? 'hello@enrichreader.com';
  const mail = new URL(`mailto:${email}`); mail.searchParams.set('subject', `Sobre o guia de ${guide.title}`);
  const store = authorURL({ kind: 'store', url: publisher.store_url, utm: publisher.utm }, guide.series);
  return `<dialog data-demo-dialog aria-labelledby="demo-title"><div class="sheet-grabber" data-grabber aria-hidden="true"></div><div class="dialog-header"><h2 id="demo-title" tabindex="-1">Sobre esta demonstração</h2><button type="button" data-close aria-label="Fechar">×</button></div><p>Montamos este guia a partir do texto do livro, para mostrar como funciona um guia sem spoiler.</p><p>Não é oficial: os autores e a ${escape(publisher.name)} não participaram nem aprovaram. Não é público: fica fora das buscas e da estante, e só abre por link.</p><p>Nada vai ao ar sem a aprovação de quem tem os direitos do livro.</p><a class="footer-row" href="${escape(store.href)}" target="_blank" rel="noopener">Onde comprar · ${escape(publisher.name)} ↗</a><p class="small">É da ${escape(publisher.name)} ou um dos autores? Escreva para <a href="${escape(mail.href)}">${escape(email)}</a>. Podemos conversar sobre o guia, ou desativá-lo a qualquer pedido.</p></dialog>`;
}
export function thirdPartyFooter(guide) {
  const publisher = guide.presentation.publisher;
  const store = authorURL({ kind: 'store', url: publisher.store_url, utm: publisher.utm }, guide.series);
  return `<footer><section class="footer-author"><h2>Obra de ${escape(guide.authors.join(' e '))}</h2><a class="footer-row" href="${escape(store.href)}" target="_blank" rel="noopener">Onde comprar · ${escape(publisher.name)} ↗</a></section><section class="footer-trust"><p>Cada fato mostra o capítulo de onde saiu.</p><button class="footer-row" data-open-demo data-demo-surface="footer" aria-haspopup="dialog">Sobre esta demonstração</button><button class="report-trigger" data-report data-scope="guia" data-label="este guia">Algo errado? Avise a gente</button></section><p class="maker">feito com EnrichReader</p></footer>`;
}
