# B2B Landing Page Playbook — Enrich Reader

*Last updated: June 30, 2026 — living document, update as new pages ship*

This is a structural and content playbook, not a visual style guide — it assumes the visual language (dark/gold palette, serif display type, starfield texture) is already defined elsewhere. What's captured here is everything learned from building and pressure-testing the Enterprise page and the per-title Report pages: what to assume going in, what patterns convert and build trust, and what specifically broke in earlier drafts so the next page doesn't repeat it.

---

## 1. Premises

The assumptions every new page should start from.

### The product is the proof
Enrich Reader sells precision in extracting structure from text. Every page is, itself, a live demonstration of whether the company can keep its own facts straight. A stat that doesn't match three sections later isn't a polish issue — it's a direct contradiction of the thing being sold. Treat internal consistency as a launch blocker, not a nice-to-have pass.

### One page, one audience
Every page serves a single primary audience — B2B buyer or B2C reader — without interruption. Reader-app banners, "suggest a book" modules, and other consumer hooks don't belong embedded mid-scroll on a B2B page, and enterprise sales language doesn't belong on a public report. Cross-sell, when it's needed at all, lives in one thin, low-contrast strip — never a full module — and never displaces the primary path.

### Three-tier site model
Pages aren't interchangeable. Each tier has exactly one job:

| Tier | Page | Job | Primary CTA |
|---|---|---|---|
| 1 | Home / Enterprise | Sell the company to a buyer | Request Book Audit / Engine Demo |
| 2 | Report Cover (per title) | Showcase one title, prove capability | Explore the Data |
| 3 | Report Body (per title) | Deliver the actual editorial/data piece | Section engagement, share |
| — | Reports Library | Catalog browsing once there are more than a handful of titles | Link out to individual reports |

A Report Body page should read like a data-journalism piece — it sells nothing directly. All commercial intent lives on Tier 1. Don't let Tier 2/3 quietly turn into a sales page, and don't let Tier 1 turn into a report dump.

### No pricing page yet, and that's fine if it's handled on purpose
Until pricing is standardized, say so plainly — "scoped per engagement, contact us" — rather than going quiet on the topic. Silence reads as evasive. A clear, confident non-answer reads as an early-stage company that knows exactly what it's doing.

### Confidentiality and IP disclaimers live where the risk actually is
Manuscript-confidentiality language belongs on Tier 1, where someone is actually about to submit a file. Third-party IP/attribution disclaimers (e.g., "Lord of the Mysteries is property of Cuttlefish That Loves Diving / Qidian") belong directly under the Tier 2/3 asset that uses that material. Don't make one page carry both jobs, and don't bury either in a global footer where it does no real work.

---

## 2. Best Practices

### Hero
- Lead with one literal sentence describing what the product does, before the poetic line. The vision line earns its place as the second beat, not the opener — a cold visitor needs the plain version in the first three seconds.
- Show real output, not internal process. A pipeline or architecture diagram belongs in "How It Works," several scrolls down. The hero needs a chart, table, or result a buyer can read on sight. (Concrete example: the first Enterprise hero led with a 5-stage pipeline diagram. Replacing it with the actual pathway-selection matrix for a second title turned the hero from "here's our process" into "here's what you get" — and doubled as proof the engine generalizes beyond the original case study.)
- Two CTAs: one lead-gen action as the primary filled button, one low-commitment proof action as a secondary outlined button — e.g. "Request Engine Demo" / "Explore Case Studies."
- If a live-status ticker appears in the hero, write it in buyer language. "NOW PARSING: [Title] · QUEUED: [Title] · COMPLETED: [Title], N chapters indexed" reads as an active, credible system. "Ingestion Stage 11/32" reads as a server log nobody asked to see.

### Trust & credibility
- State methodology in one line near any top-level stat. Even something minimal — "Methodology: named-entity extraction, cross-checked per chapter" — moves a number from "trust us" to "here's how we got this," which is most of the value proposition in miniature.
- Where possible, show the filtering step, not just the final number. "57,989 raw mentions detected → 317 unique verified characters" demonstrates rigor far more convincingly than the final number alone, because it shows noise being actively removed rather than asking the reader to take cleanliness on faith.
- Don't manufacture testimonials. A founder quoting himself isn't social proof — it reads worse than having none. If there's no outside quote yet, use the slot for either a real (even small) system metric, or an explicit vision/mission statement clearly labeled as such (e.g. "OUR VISION"). Never let aspiration borrow the visual costume of evidence.
- Every usage or scale claim needs to be true the day it ships. If the real number is 62 monthly active users, say something accurate about that ("readers are actively stress-testing this data in our app") instead of reaching for "thousands" because it sounds better. One caught inflated claim discounts every other number on the page.
- Any total or summary figure that doesn't visually sum from the rows above it needs a one-line footnote explaining why, directly under the chart. Don't make a careful reader do the math and conclude the page is broken.
- IP/source disclaimers go directly beneath the asset using third-party material, in small italic type — not in a global footer.

### Copy & voice
- Translate every internal-facing benefit into the buyer's outcome. "Readers submit corrections" becomes "Data accuracy improves every week as users validate it, reducing your editorial QA costs." The mechanism is interesting internally; the outcome is what's actually being evaluated.
- Give each persona/segment card a one-line, explicit goal stating what success looks like for that buyer, in their language — e.g. *Goal: keep readers on platform.* Keep these grammatically parallel across every card on the same page; proofread them as a set, not individually.
- Editorial voice is a real asset — use it in chart titles, insight callouts, and UI microcopy wherever it doesn't compromise clarity ("Show all 68 races — yes, even Frenzied Gerbil"). It's a meaningful part of what makes the reports feel authored rather than auto-generated; carry it into buttons and empty states, not just headlines.
- Placeholder text in forms has to be realistic. "e.g. Netflix" implies a relationship that may not exist. "e.g. Royal Road, Kindle Vella" sets accurate expectations for who should be filling out the form.
- Pick one label for the primary commercial action and use it everywhere — nav, hero, contact form. Alternating between "Request Book Audit" and "Request Engine Demo" for what's meant to be the same action reads as two different offers.

### Data & chart presentation
- Every chart needs a caption stating exactly what it shows — title, scope, volume/date range. Don't assume the section header above it is close enough; a reader arriving via a shared or anchor link has no other context.
- Reuse stat labels consistently. If two cards both report an entity count, they need the same label ("Unique Entities Tracked") even if the underlying definitions differ slightly. Mismatched labels on side-by-side cards invite exactly the scrutiny that breaks trust.
- Cross-check every number that appears in more than one place on the site before shipping — this is the single highest-value QA pass available and the cheapest to run. See the checklist below.
- Legend and filter chips should wrap onto multiple rows rather than truncate at the viewport edge. If one section already solves this correctly, copy that exact pattern into every other section using the same chip system rather than re-solving it differently each time.
- On Report pages built for sharing, design individual insight cards for standalone export — image-friendly framing, embedded credit — not just the page as one shareable unit. A chart goes viral because someone can lift it cleanly, not because they link to a seven-section scroll.

### CTAs & conversion
- A long-scroll page needs more than one conversion moment. Repeat the primary CTA at least once mid-page and again before the footer — don't let interest peak with nothing to click.
- Ask for the minimum on a first-touch form: name, email, organization, primary interest. Save manuscript upload, detailed scoping, or pricing discussion for the second touch, once the lead is qualified.
- Attach a concrete, specific promise to the CTA where possible. "We'll deliver a full report in 24 hours" converts better than an open-ended "get in touch," because it removes the buyer's biggest unspoken question.
- Persistent nav on long report pages should always show the brand and include a path back to the primary commercial action. A reader landing mid-page via a shared link needs to know who made this on sight, not after scrolling to find a logo.

### Layout & technical QA
- Sticky/fixed headers must reserve real space in the layout — margin or padding equal to the header's height — so content reflows below it rather than rendering underneath it. Test this against every section boundary on a long page, not just the top, since overlap only appears depending on scroll position when a boundary lands under the fixed bar.
- Test every page at real mobile width before shipping: diagonal axis labels, wide data tables, and any section running two parallel control systems over the same categories (a color legend *and* a checkbox filter covering the same five types — pick one).
- Give every major section a visible boundary — a divider rule or a subtle background shift — on long single-background pages. A continuous texture with no boundaries makes a multi-section scroll feel like one undifferentiated wall.
- Keep repeating elements (footer, logo lockup, status bar) in one consistent position across every section. Don't let the same component land mid-section in one place and end-of-section in another.

---

## 3. No-Gos

Each of these caused a real, caught issue across this build. Treat this as a fast pre-flight check.

- **Don't ship a stat without checking it against every other place that concept appears on the site.** This single failure mode produced the majority of substantive issues caught across every review round — a character-count mismatch between two sections, a total that looked unsummed with no explanation, a hero claiming live coverage of eight volumes while the case-study card three sections down said one.
- **Don't let a founder, employee, or company account author its own testimonial.** It reads as self-promotion, not proof, and undermines every other credibility signal on the page.
- **Don't state a usage or scale claim that can't currently be backed by a real number.** Round down to something true rather than up to something impressive.
- **Don't state a policy in one section and violate it in the next** — e.g. "spoilers are hidden, no deaths listed," immediately followed by a chart named after a death event. Decide the policy once and apply it everywhere on the page.
- **Don't let internal or engineering language reach the live page** — pipeline stage counters, debug-style status strings, placeholder labels written for a developer audience. If it wouldn't make sense read aloud to the actual buyer persona, rewrite it.
- **Don't mix B2C acquisition modules into a B2B sales page, or the reverse.** A reader-app banner or community widget pulls focus from the commercial action the page exists to drive. Place these on the Home page or Report tiers instead.
- **Don't ask for a manuscript, payment details, or any high-friction input on a first-touch form.** Cold-page asks should be minimal; anything requiring real trust is a second-touch conversation.
- **Don't leave a long-scroll page with a single CTA at the very bottom.** By the time most visitors reach it, the moment that mattered already passed.
- **Don't let a fixed/sticky header float without reserved space.** It will eventually overlap a headline or chart at some scroll position — and on a precision-focused product, unreadable headline text is close to the worst possible first impression.
- **Don't leave pricing entirely unaddressed.** A short, honest "scoped per engagement, contact us" outperforms silence.
- **Don't reuse a word — "characters," "entities," "users" — for two different metrics on the same page without distinct labels.** Precision in labeling is the actual pitch; model it everywhere, not just in the data.

---

## 4. Pre-Ship Checklist

Run this before any new B2B or report page goes live.

- [ ] Every stat appearing more than once on the site (or across linked pages) shows the same number with the same label, or has an explicit reason why it differs.
- [ ] Every summary/total figure that doesn't visually sum has a one-line footnote explaining the methodology.
- [ ] No testimonial is attributed to anyone employed by or representing the company.
- [ ] Every usage or scale claim matches a real, current number.
- [ ] Any stated policy (spoiler handling, data scope, etc.) is checked against every other section on the page for contradictions.
- [ ] No internal/debug-style language, dev labels, or unfinished placeholder text remains in shipped copy.
- [ ] The page serves exactly one primary audience; any cross-sell to the other audience is a single thin strip, not a module.
- [ ] First-touch forms request only name, email, organization, and interest — nothing higher-friction.
- [ ] The primary CTA appears at least twice on any page requiring more than one scroll, with one consistent label used everywhere.
- [ ] Fixed/sticky elements are tested against every section boundary, not just the page top, with no content overlap.
- [ ] Page is checked at real mobile width: no truncated legends, no unreadable diagonal labels, no redundant overlapping filter systems.
- [ ] Every chart or table has a caption stating what it shows and what scope or range it covers.
- [ ] IP/source disclaimers are present directly under any asset using third-party material.
- [ ] Pricing is either stated or explicitly deferred with a clear next step — never silent.

---

## 5. Quick Reference: Patterns Already Built

| Pattern | Where it's implemented |
|---|---|
| Hero shows output, not process | Enterprise hero — LOTM pathway matrix replaced the pipeline diagram |
| Footnote for an unsummed total | DCC Race Selection Matrix; LOTM Pathway Matrix "Series Total" |
| Vision separated from proof | Enterprise page — "OUR VISION" module, kept distinct from "Proven in Use" |
| Buyer-language status ticker | Enterprise hero — "NOW PARSING / QUEUED / COMPLETED" |
| IP disclaimer placement | LOTM hero matrix, directly under the table |
| Persistent section nav | DCC Report Body — anchor pills (Races / Funnel / Survival / Mentions / Absences / Demographics) |
| Outcome-framed feature bullets | Enterprise "Proven in Use" — corrections and completion bullets written as business metrics |

---

*This document should grow with every new page. When a review catches something not already on this list, add it — the goal is for the checklist in Section 4 to eventually catch everything before a human has to.*