# Testing report

Tested on 22 Oct 2026 in a Linux sandbox with Node 22 and headless Chromium (Playwright). **Firefox, Safari, Windows and real mobile devices were not tested**, and **Lighthouse / PageSpeed Insights were not run**, so no performance or Core Web Vitals scores are claimed. Please run both after deployment.

## Automated build validation (`scripts/build.mjs`)

Passed in preview mode and in production mode with sample values (`https://xeryo-test.com`, sample app URL and email, `--strict`):

- Exactly one `<h1>` per page; unique titles and descriptions; no `<img>` without `alt`.
- Correct canonical on all five indexable pages; 404 page is `noindex` with no canonical.
- JSON-LD blocks parse as valid JSON; Organization and WebSite on Home, BreadcrumbList on Umunara Internship.
- Every root-relative link and asset exists in `dist/`; every `#anchor` has a target.
- Social preview image and logo exist at the referenced paths.
- Sitemap lists exactly the five indexable pages on the configured origin; `robots.txt` allows crawling and names the sitemap (preview builds disallow all).
- No unreplaced template tokens remain.
- Production build correctly **fails** when `siteUrl` is empty.

## Browser tests (headless Chromium, 23 of 23 passed)

- All six pages at 375, 768, 1280 and 1920 px: no console errors or warnings, no failed requests, no horizontal overflow. (The unknown-URL page returns a genuine HTTP 404 by design.)
- Mobile menu: opens by touch and by keyboard Enter; `aria-expanded` updates; focus moves to the first link; Tab stays inside the open menu; Escape closes it and returns focus to the button; link click navigates; current page marked with `aria-current`; resizing to desktop closes it.
- Desktop: no menu button, navigation visible.
- JavaScript disabled: navigation visible, no dead menu button, all content visible.
- Scroll reveal works with motion allowed (hidden below the fold, shown on scroll); disabled under reduced motion.
- FAQ `<details>` opens. Skip link is the first tab stop and becomes visible. Keyboard focus shows a 2 px outline.
- Screenshots reviewed visually for the homepage, product page and phone layout; two layout defects found and fixed (social image overlap, inner-page hero alignment).

## Not verified

- Contrast was designed to WCAG AA by choice of grays (muted text is 5:1 or better) but no automated audit was run.
- Behaviour with a screen reader.
- Real Netlify/Vercel deployment, custom domain, HTTPS, redirects and headers.
- Social previews on Facebook, LinkedIn or X.
- Search engine indexing (nothing has been submitted).
