# EnrichReader SEO and AI discovery

EnrichReader is positioned as a spoiler-free story companion. The consumer pages
give browser guides and the app equal prominence.
Acquisition copy is English-first. `/reading-guides/` is the English guide entry;
the current Frankenstein reading interface is Portuguese with English profiles.
The consumer pages explain the story companion, matching Skins, and progress-limited
lookups in crawlable HTML. The three intent pages are `/story-companion/`,
`/litrpg-companion/`, and `/spoiler-free-wiki-alternative/`. The old
`/epub-reader/` URL returns a 301 to `/story-companion/` (`Caddyfile.production`).

## Copy rule: EPUB

Set by the owner on 2026-10-18. Avoid the term "EPUB" in enrichreader.com copy
as much as possible. EPUB does not represent the app and is not its focus:
EnrichReader is a spoiler-free story companion, not a format reader. Use "book"
or "book file" instead.

The only allowed exception is the FAQ, and only when EPUB is listed alongside
other formats, never on its own. Technical and code identifiers are exempt, such
as the `@epubReader` redirect matcher in `Caddyfile.production` and parser code.

Approved wording on the site: the home title is "EnrichReader: Your Spoiler-Free
Story Companion"; app CTAs say "Open EnrichReader"; "partner series" replaces
"supported stories"; the FAQ formats answer names no format.

## Product facts used in the copy

The privacy policy is the current source for account, Skin, and data-handling
claims. Reading needs no account; installing Skins and syncing require one.
Skins are prepared ahead of time for partner series. Importing a book does not
generate a Skin. Imported book files stay local; a chapter problem report sends
chapter text. Usage data and crash reports have separate controls.

The repository contains 11 series reports. Their Dataset JSON-LD now comes from exported JSON metadata,
links to that export, and uses its SHA-256 hash as a version. They contain spoilers, including deaths and aliases. They must not be advertised
as spoiler-free or as proof of current Skin availability. Report counts describe
the analyzed dataset, not every published edition. The visible matrix and pronoun
tables now use the same JSON files as their interactive versions. Pronoun counts
are exported tag counts, not deduplicated people. Survival metadata is explicitly
separate from chapter-level chart counts. Unsupported survival interpretations
and unverifiable Dataset license claims were removed. Other legacy commentary
is locally marked exploratory and still needs passage-by-passage verification.

Pricing, dyslexia features, and text-to-speech are not
promised here because they have not been verified. Confirm product support before
adding those claims or an accessibility landing page. The app's import code
(`reader-app/src/lib/utils/volume_import_helper.js`) accepts `.epub` only; PDF
and TXT show as "Coming soon" in the import menu. Site copy therefore names no
formats, rather than claiming several.

## Build and review

Build into a preview directory so review does not modify the served site:

```sh
./bin/hugo -s src/enrichreader.com --destination /tmp/enrichreader-seo-preview
node scripts/web-guide/build-sitemap.mjs /tmp/enrichreader-seo-preview/sitemap.xml
node --test src/enrichreader.com/lib/web-guide/{indexnow,sitemap,marketing,publisher}.test.mjs
```

After editing report titles or headline statistics, regenerate the committed
1200×630 social cards with `node scripts/build-enrichreader-social.mjs`.
This uses the same rsvg-convert and ImageMagick dependencies as the existing
site-asset pipeline. Preview the output before committing it.

`node scripts/web-guide/indexnow.mjs plan` lists eligible notifications without
sending them. The existing deployment hook submits them only with INDEXNOW_KEY
configured and the published ownership file verified. The explicit public landing
route list lives in `lib/web-guide/indexnow.mjs`; keep it aligned with the site
when adding or removing pages. See [operations](web-guide-operations.md).

Guide sitemaps omit lastmod rather than inserting the current build/request date.
The original observation about October 15/16 being future dates depended on an
October 10 audit; those dates are not future dates on October 16. The underlying
issue was that sitemap dates were regenerated without a content change.

## Search and AI visibility

[Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features)
recommends normal SEO fundamentals: crawlable links, useful textual content, and
structured data matching visible content. It specifies no special AI schema or
AI text file requirement. The FAQ serves readers directly; it is not a promise
of a rich result or a model citation. SoftwareApplication markup describes the
product without inventing price, ratings, or review data.

[Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
says modification dates should represent significant content changes. Do not
restore build-time dates merely to make pages appear fresh.

## Work in external accounts after deployment

- Verify ownership in Google Search Console and Bing Webmaster Tools, then submit
  `https://enrichreader.com/sitemap.xml` and inspect representative page URLs.
- Verify that the deployed IndexNow ownership file and submission succeed.
- Review the Google Play listing against the same product facts before changing it.
- Record a baseline of impressions, clicks, queries, and app launches; compare
  consumer pages and series reports separately after recrawling.

These account actions and publication were not performed as part of this change.

## Independent critique rounds

A fresh specialist agent received only the role, repository location, and guide
expansion goal. Its first review identified isolated guides, a thin public guide
root, absolute privacy claims, inconsistent report statistics, fragmented maker
identity, and repetitive intent pages.

The implementation now links publication-filtered catalog cards from the home,
navigation, footer, and reader discovery pages. Private and unlisted catalog
entries are excluded, including presentation-state overrides. Public guide roots
explain their edition, position semantics, sources, and limits before any reading
position is selected. The guide’s EnrichReader backlink is independent of app Skin
availability. The English hub supplies a concrete opening-letter example; it does
not preselect a spoiler-bearing reading position.

Round two accepted those structural fixes and requested consistent position
instructions, removal of unsupported survival conclusions, and explicit labeling
of rewritten homepage examples. Its targeted final check found no remaining
critical regression in those fixes. This is a source/build review, not evidence
of increased rankings or model citations.

For each future English guide, publish a substantive book-specific introduction
with edition compatibility, a safe use example, clear language disclosure, and
sources. Do not scale the catalog by indexing gated chapter pages or unreviewed
character introductions. Keep position-bearing URLs noindex. Do not claim author
approval for a public-domain work.

The Portuguese shelf’s existing three-guide indexing threshold is preserved;
the useful English `/reading-guides/` directory is indexable now. The actual
Frankenstein UI has not been translated as part of this SEO change. Reports need
a separate editorial/data audit before being promoted as definitive references.
