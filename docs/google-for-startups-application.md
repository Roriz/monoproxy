# Google for Startups Cloud Program — EnrichReader application brief

**Target program:** Google for Startups Cloud Program — Start tier

**Company Legal Entity:** ENRICH DESENVOLVIMENTO DE SOFTWARE LTDA  
**Incorporation Date:** 2026-03-19 (Brazil)  
**Headquarters / Address:** São José dos Campos, SP, Brazil  
**Founder & Applicant:** Radamés Roriz  
**Title:** Founder & Chief Executive Officer  
**Applicant Email:** radames@enrichreader.com  
**Founder LinkedIn:** https://www.linkedin.com/in/radames-roriz/  

> This is an application-preparation document, not a claim of program acceptance. Confirm all bracketed items before submission; do not add a billing-account ID or other credentials to source control.

## Reviewer-ready product description

EnrichReader is a software startup building a spoiler-safe reading platform for long-form fiction. A reader imports a book they already own and receives a progressive companion layer: evolving character profiles, connected lore, and traceable narrative facts that are revealed only when appropriate to the reader’s place in the story.

The production Skin-generation pipeline organizes book content into structured chapters and blocks, performs local named-entity detection, and uses Gemini through Google Cloud Vertex AI for ambiguous entity classification, chapter-context fact extraction, and contextual identity resolution. Model output is checked against deterministic evidence and narrative-invariant rules before it is packaged as a Skin. The reader then combines its local book file with the generated Skin and can render the experience offline.

## Why Google Cloud

Google Cloud is part of EnrichReader’s real enrichment workflow, not a future-only migration:

- `skin-maker/skin_entities/clients/vertex_client.py` implements authenticated Vertex AI calls.
- `skin-maker/skin_entities/clients/gemini_client.py` contains the complementary Gemini client logic.
- `skin-maker/skin_entities/pipelines.py` orchestrates the enrichment workflow.
- `skin-maker/docs/pipeline_performance.md` records measured pipeline operation.

The requested cloud support would be used to make the Gemini/Vertex AI pipeline more reliable and scalable, improve evaluation and quality controls, and support controlled iteration from working MVP to repeatable product.

## Approved source-text policy

The Skin-generation pipeline currently processes only public-domain or openly licensed works. This source material is distinct from EPUB files that readers import into EnrichReader: reader-imported EPUBs are not used as Skin-generation input. Approved source text is retained for up to 30 days for processing and quality review, then deleted.

## Public proof to include

- Product (Live Web App): <https://app.enrichreader.com>
- Product site: <https://enrichreader.com>
- Technology and product evidence: <https://enrichreader.com/enterprise/>
- Terms of Service: <https://enrichreader.com/terms-of-service/>
- Privacy Policy: <https://enrichreader.com/privacy-policy/>
- Public narrative reports: <https://enrichreader.com/reports/>
- Founder LinkedIn: <https://www.linkedin.com/in/radames-roriz/>
- Android distribution: link through the product page.

## Form fields breakdown (Copy-Paste Reference)

| Google Form Field | Exact Value to Enter | Notes / Rationale |
| :--- | :--- | :--- |
| **First Name (`name`)** | `Radamés` | Matches company director registry (Quadro de Sócios). |
| **Last Name (`surname`)** | `Roriz` | Matches corporate filings and public founder footprint. |
| **Business Email (`email`)** | `radames@enrichreader.com` | Root domain corporate email hosted on Google Workspace. |
| **Job Role** | `Founder / Co-Founder` | Unlocks direct contract authority. |
| **Job Title** | `Founder & Chief Executive Officer` | Matches statutory representation. |
| **LinkedIn Profile** | `https://www.linkedin.com/in/radames-roriz/` | Public founder footprint; linked on website footer. |
| **Startup Legal Name** | `ENRICH DESENVOLVIMENTO DE SOFTWARE LTDA` | Statutory name (note singular SOFTWARE). |
| **Headquarters Address** | `São José dos Campos, SP, Brazil` | Registered corporate jurisdiction and billing country. |
| **Startup Website Domain** | `https://enrichreader.com` | Production landing page with live app link & footer trust. |
| **Industry** | `Enterprise Software / SaaS` or `AI / Machine Learning` | Scalable digital software product. |
| **Startup Funding** | `Bootstrapped / Self-Funded` | Start Tier ($2,000 USD); no institutional equity required. |
| **Is AI Startup?** | `Yes` | Native Vertex AI Gemini workflow (not third-party wrapper). |
| **Google Cloud Billing Account ID** | `[ENTER DIRECTLY IN FORM]` | 18-character ID (`XXXXXX-XXXXXX-XXXXXX`). Do not commit to git. |

## Fields to confirm before submission

1. **Company relationship:** applicant email must use `radames@enrichreader.com`; confirm it is authorized to represent the company.
2. **Billing account:** enter the existing Google Cloud billing-account ID only in Google’s form. Do not place it in this repository.
3. **Funding:** state bootstrapped / no qualifying institutional equity funding if that is current. Do not apply as Scale or AI tier unless the funding requirement is met.
4. **Prior credits:** report the exact historical Google Cloud credit total if asked.
5. **Source-text policy:** confirmed as public-domain or openly licensed works only, with a 30-day maximum source-text retention period. The public Privacy Policy and Terms of Service carry matching disclosures.

## Claims to avoid unless separately evidenced

- Active enterprise clients, pilots, publishers, or integrations.
- API availability or documented turnaround-time commitments.
- Revenue, retention, accuracy, or cost savings claims without publishable measurement.
- A claim that reader-uploaded EPUB text is sent to Vertex AI. The current public policy says a reader’s EPUB remains local; do not change that statement unless the product behavior and policy are deliberately updated together.
- Scale-tier or AI-tier eligibility without qualifying institutional equity funding.

## Submission checklist

- [x] Confirm the legal entity, headquarters, and incorporation date: ENRICH DESENVOLVIMENTO DE SOFTWARE LTDA, São José dos Campos, SP, Brazil, 2026-03-19.
- [x] Confirm founder / applicant details: Radamés Roriz, Founder & Chief Executive Officer (`radames@enrichreader.com`, `https://www.linkedin.com/in/radames-roriz/`).
- [x] Confirm public trust URLs live: Terms of Service (`/terms-of-service/`), Privacy Policy (`/privacy-policy/`), Technology (`/enterprise/`), and App (`https://app.enrichreader.com`).
- [x] Approve the source-text/IP policy: public-domain or openly licensed works only; source text retained up to 30 days.
- [ ] Confirm matching website, application-email, and billing-account ownership.
- [ ] Confirm credit and funding answers are accurate.
- [ ] Deploy the source-controlled `/enterprise/` page and Caddy configuration.
- [ ] Verify production canonical redirect and response headers after deployment.
- [ ] Submit factual answers only; do not overstate customers, funding, or model capabilities.
