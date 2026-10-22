# Xeryo SEO: implementation and 90-day plan

No ranking is guaranteed. Metadata and structured data make the site easy for search engines to crawl and understand; visibility comes from useful content, a clear brand and genuine links over time. Indexing and ranking are decided by the search engines and can take days to weeks.

Nothing in this document claims the site has been submitted to or indexed by any search engine. Those steps are still to be done by the site owner.

---

## 1. What is implemented in the code

| Area | Implementation |
|---|---|
| Titles and descriptions | Unique per page, in each page's `<!--meta-->` block, written into static HTML at build time. The build fails on duplicates and warns on long or short text. |
| Canonical URLs | Every indexable page has `<link rel="canonical">` built from the single `siteUrl` setting. The homepage canonical is `/`; other pages use `/name.html`. The 404 page has none and is `noindex`. |
| Production domain | One value (`siteUrl`). A production build refuses to run with an empty, non-https, placeholder or localhost value. |
| `sitemap.xml` | Lists the five indexable pages with the real domain. Build fails if it disagrees with the set of indexable pages. 404 is excluded. |
| `robots.txt` | `Allow: /` for all crawlers (CSS, JS and images are crawlable) plus the sitemap line. Preview builds output `Disallow: /` so staging can never be crawled. robots.txt only controls crawling; it does not guarantee a URL stays out of results. |
| Preview protection | Preview and branch deploys carry `noindex, nofollow`. |
| Semantic HTML | `header`, `nav`, `main`, `section`, `article`, `footer`; one `h1` per page (enforced by the build); logical h2/h3 order; descriptive link text; `lang="en"`. |
| Crawlable content | All copy and links are in the HTML. Navigation, FAQ (`<details>`) and every internal link work without JavaScript. |
| Open Graph and X card | Title, description, URL, `og:type=website`, absolute image URL, image size and alt text, `summary_large_image`. Image exists at `assets/images/xeryo-social-preview.png` (1200x630) and the build verifies it. |
| Icons | `favicon.svg`, `favicon.ico` (16/32/48), Apple touch icon, 192 and 512 px icons, `site.webmanifest`. |
| Images | The only content images are decorative inline SVG (hidden from assistive tech). No stock photos; no lazy-loading is needed. Any future `<img>` without `alt` fails the build. |
| Internal linking | Header, footer and in-page links connect Home, About, Ventures, Umunara Internship and Contact. Umunara Internship has a visible breadcrumb (Xeryo / Ventures / Umunara Internship). |
| Language | English only. No `hreflang` tags until a real translation exists. |
| Geography | Rwanda is stated where relevant. No fake addresses, listings or local-business schema. |

### Structured data (JSON-LD, generated and parsed by the build)

| Page | Types | Notes |
|---|---|---|
| Home | `Organization`, `WebSite` | Name, URL, logo (512 px PNG), description. `email` and `sameAs` appear only if you configure them. `WebSite.publisher` references the organisation. |
| Umunara Internship | `BreadcrumbList` | Home, Ventures, Umunara Internship. |

Deliberately **not** included: addresses, founding date, employee counts, ratings, reviews, pricing, awards, download links, and `SoftwareApplication`. For that type Google's rich results expect facts Xeryo has not verified (platform, pricing or rating data), so adding it would be speculative. Revisit it when the application's operating platform and offer details are confirmed. Valid structured data does not guarantee enhanced search appearance.

---

## 2. Keyword strategy

### Verified observations vs estimates

These are the only verified findings, from three standard web searches run on 22 Oct 2026 through a US-based search tool (not Rwanda-local, so treat as indicative only):

- **"Xeryo technology company"** returned results for **Xeryon** (a precision-motion company), Xero, Xylem and similar names. There was no result for Xeryo itself, which is expected for a new brand. **Risk:** search engines may "correct" *Xeryo* to *Xeryon*. Counter this with consistent, repeated brand signals (see 90-day plan).
- **"Umunara Internship TVET Rwanda"** returned no result for a product of that name. The page can aim to be the primary result for the exact brand term, with little direct competition.
- **"TVET internship opportunities Rwanda students"** returned mostly institutional and news pages (government internship guidelines, Rwanda Polytechnic, national press, policy documents). Intent is informational; competition is authoritative organisations, not commercial sites.

**No search-volume data was available.** Everything below about volume is an unverified hypothesis. Expect very low volume on brand terms at launch and modest volume on the generic terms. Confirm with Search Console impressions (real data) and, if desired, a keyword tool, before investing in content.

### Intent groups and page ownership

| Intent group | Candidate queries | Owning page | Notes |
|---|---|---|---|
| Brand: company | Xeryo, Xeryo Rwanda, Xeryo technology company, Xeryo software development | Home (`/`) | Home owns "Xeryo". Do not claim "software development services" until Xeryo offers them; the site describes a product company, so "software development" is not forced into the copy. |
| Brand: product | Umunara Internship, Umunara internship platform | Umunara Internship page | Primary target for the exact product name. |
| Portfolio | Xeryo products, Xeryo ventures | Ventures | Supports brand and product queries. |
| Non-brand: students | TVET internship opportunities Rwanda, internship opportunities for TVET students in Rwanda | Umunara Internship page (the product app is the real answer) | Used naturally in copy ("TVET", "internship", "Rwanda" all appear). Not repeated artificially. |
| Non-brand: companies | Companies offering internships in Rwanda | Umunara Internship page (companies section) | Lower priority; competitive and ambiguous. |
| Enquiries | Contact Xeryo, partner with Xeryo | Contact | Navigational. |

Each keyword group maps to one page to avoid pages competing with each other. Keywords are not forced onto every page.

---

## 3. One-time setup: Search Console and Bing Webmaster Tools

Do these after the site is live on its final domain.

1. **Add the final production domain.** In Google Search Console choose *Add property*. A **Domain property** (DNS verification) covers all subdomains and both protocols and is preferred. Add the same site in Bing Webmaster Tools (you can import from Search Console).
2. **Verify ownership.** For a Domain property add the TXT record Google gives you at your registrar. For a URL-prefix property, you can upload the HTML file Google provides into the project root and add it to `STATIC_FILES` in `scripts/build.mjs`, or use the DNS method. Do not use codes from anywhere except the tool itself; none are included in this project.
3. **Publish the production website** (README section 6) and confirm `robots.txt` has no `Disallow: /`.
4. **Submit the sitemap:** Search Console, *Sitemaps*, enter `sitemap.xml`. Bing: *Sitemaps*, submit `https://YOUR_DOMAIN/sitemap.xml`.
5. **Inspect important URLs:** use *URL inspection* on `/`, `/umunara-internship.html`, `/ventures.html`, `/about.html`, `/contact.html`. Confirm the user-declared and Google-selected canonical match.
6. **Request indexing** for the homepage and the Umunara page once inspection shows they are indexable. Requests are a hint, not a guarantee, and quota is limited.
7. **Monitor indexing:** *Pages* report weekly for the first month. Expected: five indexed pages; the 404 page should appear as excluded (`noindex`).
8. **Monitor performance:** *Performance* report for impressions, clicks, CTR, average position and queries. Filter by page and query.
9. **Investigate problems:** crawl errors, "Discovered, currently not indexed", canonical mismatches, mobile usability and Core Web Vitals reports.
10. **Improve from real data** (section 5).

---

## 4. 90-day plan

### Days 1 to 14: foundation

- Confirm domain, `siteUrl`, working mailbox, and the real Umunara application URL. Run `npm run build:strict`; it must pass.
- Deploy; run the validation commands in the README.
- Run Lighthouse and PageSpeed Insights on Home and the Umunara page; record the real scores and fix any issue they report.
- Complete section 3 (Search Console, Bing, sitemap, inspection, indexing requests).
- Use identical wording for the company name and description everywhere Xeryo appears (social profiles, directories, the application itself). Link every profile back to the website; add them to `site.config.json` `social` so they flow into `sameAs`.
- Link to the Xeryo site from inside the Umunara Internship application (footer or "About" link) using descriptive text. This is the strongest early link and ties the two properties together.

### Days 15 to 45: brand and product clarity

- Review Search Console weekly. Which queries show impressions? Is the homepage appearing for "Xeryo"?
- If results favour **Xeryon**, strengthen brand disambiguation: a consistent "Xeryo is a technology company based in/starting in Rwanda" statement, active social profiles and a Google Business Profile **only if** Xeryo has a real, verifiable business location. Do not create one otherwise.
- Product page: add concrete, verified detail as facts become available (how a student starts, what a company can post, how schools take part). Replace general statements with specifics and screenshots of the real application (with alt text and explicit dimensions).
- Add a short, genuine **"How it works"** section on the product page from the real application flow.
- Check the FAQ against actual enquiries received; add real questions only.

### Days 46 to 90: earn authority

Ethical link and mention opportunities, each one a real relationship:

- **Schools and TVET institutions:** offer a short briefing for TVET schools and career offices; ask whether they would reference the platform for internship placements on their own sites.
- **Companies:** companies that list internships can mention Umunara Internship on their careers pages.
- **Education and youth organisations and student communities** in Rwanda.
- **Rwandan technology community:** meetups, university tech clubs, innovation hubs. Share what you are building and link to the product page.
- **Local press and blogs** covering education, skills and technology, when there is real news (a launch milestone, a partnership that has actually been confirmed).
- **Official bodies** that publish internship resources may link to a useful, relevant platform; approach respectfully.

Do not buy backlinks, join link networks, create doorway or location pages, stuff keywords, or publish bulk low-quality AI-written articles. Publish a new article only when you have something genuinely useful to say (for example, a practical guide for students preparing an internship application written with a school's input).

### Ongoing cadence

- **Weekly:** Search Console indexing and performance glance (10 minutes).
- **Monthly:** Review top queries, pages with high impressions and low CTR, new queries. Re-run Lighthouse. Check broken links (the build checks internal ones; check external links manually). Update `sitemap.xml` `<lastmod>` for pages you changed meaningfully.
- **Quarterly:** Re-assess the keyword table with real data; revise titles and descriptions where CTR is weak.

### How to prioritise improvements

Score each candidate action 1 to 5 on **Impact** (how many real searches or users it affects, from Search Console), **Confidence** (evidence it will work) and **Effort** (5 = very easy). Priority = Impact x Confidence x Effort. Break ties in favour of fixes to indexing or accuracy problems, then pages already earning impressions, then new content. Never prioritise anything that requires claims the company cannot support.

---

## 5. Using Search Console data to improve content

| Signal | Likely meaning | Action |
|---|---|---|
| Impressions but few clicks (low CTR) | Title or description unconvincing or mismatched to the query | Rewrite title/description to match intent; keep them accurate |
| Query appears but page ranks poorly | Content does not answer the query | Add a clear section addressing it on the owning page |
| Wrong page ranks for a query | Overlap between pages | Make the owning page clearer; adjust internal link anchor text |
| Page "Discovered, not indexed" | Low perceived value or crawl budget | Add genuine content and internal and external links; request indexing after improvements |
| Canonical mismatch | Duplicate URL variants (`/about` vs `/about.html`, `www`) | Fix redirects and `siteUrl`; ensure internal links use the canonical form |

---

## 6. Maintenance checklist when content changes

1. Edit the page and its `<!--meta-->` block.
2. If you add or remove a page, update `PAGES` in `scripts/build.mjs` and `sitemap.xml`.
3. Run `npm run build:strict`. It validates canonicals, JSON-LD, links, titles, descriptions and the sitemap.
4. Deploy; spot-check the live source.
5. For an important change, request reindexing for that URL in Search Console.
