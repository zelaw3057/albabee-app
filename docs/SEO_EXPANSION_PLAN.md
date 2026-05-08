# SEO Expansion Plan

## Planned Pages

Use these slugs unless there is a strong SEO reason to change them:

| Page | Primary intent | Suggested title pattern |
| --- | --- | --- |
| `labor-contract.html` | part-time labor contract guide | 알바 근로계약서 작성 가이드 |
| `overtime-pay.html` | overtime allowance calculation | 연장수당 계산기 |
| `severance-pay.html` | severance pay calculation | 알바 퇴직금 계산 |
| `tax-3-3.html` | 3.3% tax and net pay | 알바 3.3% 세금 계산 |
| `holiday-pay.html` | holiday work allowance calculation | 휴일수당 계산기 |
| `probation-pay.html` | probation wage guide | 수습기간 최저시급 계산 |

## Page Template Requirements

Each page should include:

- optimized `title`;
- `meta name="description"`;
- canonical URL;
- Open Graph title/description/image;
- one `h1`;
- multiple scannable `h2` sections;
- lists and examples;
- internal links to related SEO pages;
- `관련 계산기 보기`;
- `함께 보면 좋은 알바 급여 정보`;
- bottom CTA: `실제 근무일 기준으로 정확하게 계산하려면 알바BEE 계산기를 사용하세요`;
- button text: `알바비 계산하러 가기`;
- visible FAQ section;
- `FAQPage` JSON-LD.

## Central Registry Proposal

Create one registry file and generate sitemap/build metadata from it:

```json
[
  {
    "slug": "minimum-wage.html",
    "title": "2026 최저시급 계산기",
    "description": "2026 최저시급 기준 최저임금 월급 계산...",
    "category": "wage",
    "priority": 0.9
  }
]
```

Then scripts can generate:

- `sitemap.xml`;
- `functions/sitemap.xml.js`;
- SEO page navigation;
- related-page sections;
- Vite static file copy list.

## SEO Safety Rules

- Only real public pages go in `sitemap.xml`.
- Never keep backup HTML inside the project root or `public/`.
- Do not create duplicate page copies such as `minimum-wage-old.html`.
- Use canonical URLs for every SEO page.
- Keep internal links between the wage, weekly pay, and night pay pages.

## Common Component Strategy

Because this is currently static HTML, use build-time generation instead of client-side includes. Search engines will see complete HTML and no JavaScript is needed for SEO content.

Recommended shared pieces:

- `SeoHead` metadata template;
- `SeoHeader` page nav;
- `RelatedCalculators`;
- `RelatedInfoHub`;
- `CalculatorCTA`;
- `FaqSection`;
- `SeoFooter`.

These can live in a small Node generator later. Until then, keep copy/paste sections consistent and validate with a script.

## Validation Rules

Add a script later at `scripts/validate-seo.mjs` to check:

- exactly one `h1`;
- at least three `h2`;
- canonical exists;
- description exists and is not duplicated;
- CTA exists;
- FAQPage JSON parses;
- page exists in sitemap;
- page exists in Vite static copy list;
- no backup or old HTML files are present in the deploy output.
