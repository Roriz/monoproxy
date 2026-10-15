import { escape, positionHref, completedOrdinal } from './content.mjs';
import { inlineLabel } from './views.mjs';

export function talkURL(guide, site, before = false) {
  if (!/^\d{10,15}$/.test(site.whatsapp_number ?? '')) return null;
  const text = before ? `Oi, Radamés! Vi a prévia do guia de ${guide.title}. Podemos conversar 15 min?` : `Oi, Radamés! Sobre o guia de ${guide.title}:`;
  const url = new URL(`https://wa.me/${site.whatsapp_number}`); url.searchParams.set('text', text); return url.href;
}
export function reviewCTA(guide, site, approval, surface = 'strip') {
  if (guide.presentation.approval_open && !approval) return '<button class="outline" type="button" data-open-approval>Aprovar e publicar</button>';
  const before = !guide.presentation.approval_open && !approval;
  const href = talkURL(guide, site, before);
  return href ? `<a class="outline" href="${escape(href)}" target="_blank" rel="noopener" data-talk="${surface}">${before ? 'Conversar 15 min' : 'Falar no WhatsApp'}</a>` : '';
}
export function reviewSlot(guide, position, site, approval, route) {
  if (guide.state !== 'private') return '';
  const author = escape(guide.authors.join(' e '));
  const tour = guide.presentation.tour;
  if (!position && route.type !== 'home') return '';
  if (position) {
    let tourLine = '';
    if (route.type === 'home' && guide.presentation.tour_row !== false && tour) {
      const entity = guide.entities.find(entity => entity.slug === tour.entity);
      if (String(position.c) === String(tour.start.c)) tourLine = `<p data-tour-row>Toque em ${escape(entity.versions[0].set.display_name)}. Depois avance: veja o que aparece. · <button data-picker-draft="${tour.forward.c}" data-picker-source="tour">Avançar para ${guide.books[0].items.find(item => item.ordinal === Number(tour.forward.c)).gender === 'f' ? 'a' : 'o'} ${escape(inlineLabel(guide, Number(tour.forward.c)))}</button></p>`;
      if (String(position.c) === String(tour.forward.c)) tourLine = `<p data-tour-row>Veja o que apareceu desde ${escape(inlineLabel(guide, Number(tour.start.c)))}. Agora volte: some. · <button data-picker-draft="${tour.start.c}" data-picker-source="tour">Voltar para ${escape(inlineLabel(guide, Number(tour.start.c)))}</button></p>`;
    }
    return `<aside class="review-strip">${tourLine}<div class="end-row"><span>Prévia para ${author}${approval ? ' · ✓ Aprovado' : ''}</span>${reviewCTA(guide, site, approval)}</div></aside>`;
  }
  const entity = guide.entities.find(entity => entity.slug === tour.entity);
  const start = guide.books[0].items.find(item => item.ordinal === Number(tour.start.c));
  const before = !guide.presentation.approval_open && !approval;
  const text = approval ? `✓ Aprovado em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' }).format(new Date(approval.ts))}. O guia vai ao ar em até 24h; te aviso no WhatsApp.` : before ? `Comprei ${escape(guide.title)} e montei isto a partir do texto.` : 'Como combinamos: quando você aprovar, o guia vai ao ar neste mesmo endereço.';
  return `<aside class="preview-card" data-review-card><div class="end-row"><p class="kicker">Prévia para ${author}</p><button type="button" data-dismiss-review aria-label="Fechar a prévia">×</button></div><p class="reading">${text}</p>${before ? `<p class="small">Radamés · EnrichReader</p><ol><li>Escolha ${start.gender === 'f' ? 'a' : 'o'} ${escape(start.label.replace('Cap.', 'cap.'))} e toque em ${escape(entity.versions[0].set.display_name)}.</li><li>Avance: veja o que aparece.</li><li>Volte: some.</li></ol><a class="primary" href="${positionHref(`/guia/${guide.series}`, { l: 1, c: tour.start.c, ...guide.linkContext })}" data-picker-draft="${tour.start.c}" data-picker-source="previa">Escolher ${start.gender === 'f' ? 'a' : 'o'} ${escape(start.label.replace('Cap.', 'cap.'))}</a>` : ''}${reviewCTA(guide, site, approval, 'approval_card')}</aside>`;
}
export function allLink(guide, url, position) {
  const book = guide.books.filter(book => book.status !== 'announced').at(-1);
  const c = book.status === 'complete' ? 'fim' : String(book.items.at(-1).ordinal);
  if (position?.l === book.l && position.c === c) return '<span class="view-all" aria-current="page">Ver tudo</span>';
  const target = new URL(url); target.searchParams.set('l', String(book.l)); target.searchParams.set('c', c); target.searchParams.delete('n');
  for (const key of [...target.searchParams.keys()]) if (key.startsWith('utm_')) target.searchParams.delete(key);
  return `<a class="view-all" href="${escape(target.pathname + target.search)}" aria-label="Ver tudo: o guia até o fim do livro" data-view-all>◉<small>Ver tudo</small></a>`;
}
export function summarySwitch(guide, url) {
  if (guide.state !== 'private' || !guide.context?.story) return '';
  const target = new URL(url);
  target.searchParams.has('resumos') ? target.searchParams.delete('resumos') : target.searchParams.set('resumos', '0');
  for (const key of [...target.searchParams.keys()]) if (key.startsWith('utm_')) target.searchParams.delete(key);
  return `<a class="door summary-switch" href="${escape(target.pathname + target.search)}" data-summaries="${guide.hideSummaries ? 'on' : 'off'}">${guide.hideSummaries ? 'Mostrar' : 'Ocultar'} resumos das cenas</a>`;
}
export function privateFooter(guide, site, approval) {
  const before = !guide.presentation.approval_open && !approval;
  const count = guide.books.filter(book => book.status !== 'announced').reduce((sum, book) => sum + book.items.filter(item => !item.retired).length, 0);
  return `<section class="sales-block"><p class="kicker">Prévia para ${escape(guide.authors.join(' e '))}</p><p>Montado a partir de ${count} capítulos, sem trabalho seu.</p><p class="small"><strong>Como foi feito:</strong> uso modelos para achar no seu texto quem aparece e onde, capítulo por capítulo. Nada é inventado: cada fato aponta para o capítulo de onde saiu.</p>${guide.presentation.fundador ? `<p>Autores fundadores: grátis${before ? ' · próximo passo: 15 min' : ''}.</p>` : before ? '<p>Próximo passo: 15 min, sem compromisso.</p>' : ''}${reviewCTA(guide, site, approval, 'footer')}<button class="report-trigger" data-report data-scope="guia" data-label="esta prévia">Me avisa se algo estiver errado: corrijo em até 24h</button></section>`;
}
export function approvalDialog(guide, url, approval) {
  if (guide.state !== 'private' || !guide.presentation.approval_open || approval) return '';
  const next = guide.books.find(book => book.status === 'announced');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const publicOutcome = guide.presentation.blurb_approved && !!guide.presentation.blurb;
  return `<dialog data-approval-dialog aria-labelledby="approval-title"><div class="sheet-grabber" data-grabber aria-hidden="true"></div><div class="dialog-header"><h2 id="approval-title" tabindex="-1">Aprovar e publicar</h2><button type="button" data-close aria-label="Fechar">×</button></div><form data-approval-form><fieldset><legend>Quando você vai divulgar?</legend>${[['semana', 'Esta semana'], ...(next ? [['lancamento', 'No lançamento']] : []), ['data', 'Em outra data'], ['nao_sei', 'Ainda não sei']].map(([value, label]) => `<label class="approval-choice"><input type="radio" name="divulgar" value="${value}" required>${label}</label>`).join('')}<label data-approval-date hidden>Data<input type="date" name="data" min="${today}"></label></fieldset><fieldset><legend>Resumos das cenas</legend><label class="approval-choice"><input type="radio" name="resumos" value="on" ${!guide.hideSummaries ? 'checked' : ''}>Mostrar</label><label class="approval-choice"><input type="radio" name="resumos" value="off" ${guide.hideSummaries ? 'checked' : ''}>Ocultar</label></fieldset><p class="small">${publicOutcome ? 'Vai ao ar em até 24h neste mesmo endereço, aberto a todos, na estante de guias e na busca do Google.' : 'Vai ao ar em até 24h neste mesmo endereço, aberto a quem tiver o link. Entra na busca quando a sinopse estiver aprovada.'}</p><div data-approval-error hidden></div><button class="primary" type="submit" disabled data-approve-submit>Aprovar e publicar</button></form></dialog>`;
}
