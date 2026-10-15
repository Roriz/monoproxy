import { authorURL, releaseLabel } from './position.mjs';
import { escape } from './content.mjs';

/** Confirmed book number/date and author link only; never a future book title. */
export function launchLine(guide, source = 'gate', slot = 'normal', bookNumber = null) {
  if (guide.ownership === 'third_party') return '';
  const book = guide.books.find(book => book.status === 'announced' && (bookNumber == null || book.l === bookNumber));
  const link = guide.presentation?.links?.find(link => link.kind === 'launch');
  if (!book || !book.release && !link) return '';
  const release = releaseLabel(book);
  return `<p class="launch-line">Livro ${book.l}${release ? ` · sai em ${escape(release)}` : ''}${link ? ` · <a href="${escape(authorURL(link, guide.series).href)}" target="_blank" rel="noopener" data-launch-source="${source}" data-launch-slot="${slot}">${escape(link.label)} ↗</a>` : ''}</p>`;
}
