# QFlex Theme

This repository hosts the QFlex Shopify theme. The project is wired for a
staging‑only workflow with automated preview environments and visual
regression testing. Pull requests target the `staging` branch and are
validated against an unpublished preview theme. Merging into `staging`
publishes the code to a designated staging theme; the live theme is never
modified from CI.

## Local development

Clone the repository, install dependencies and run a local Shopify theme
server as you normally would. The theme depends on Node.js (version 18 or
newer) and uses Playwright for visual tests.

```bash
npm ci
```

### Metaobject and metafield definitions

QFlex relies on a handful of custom metaobject definitions and product
metafields within the `qf` namespace. These definitions power dynamic
sources such as the hero eyebrow, ratings and unique selling proposition
pills. To provision them locally you can run:

```bash
SHOPIFY_STORE=<your-store>
SHOPIFY_ADMIN_ACCESS_TOKEN=<token>
SHOPIFY_API_VERSION=<e.g. 2024-07>
npm run shopify:defs
```

This executes [`scripts/create_meta_definitions.mjs`](scripts/create_meta_definitions.mjs). It
will create (or update) three metaobject definitions—`badge`, `testimonial`
and `press_logo`—plus the following product metafields:

| Namespace | Key           | Type                         | Purpose                                 |
|-----------|--------------|------------------------------|------------------------------------------|
| `qf`      | hero_eyebrow | single_line_text_field       | Eyebrow text above the product title     |
| `qf`      | review_count | number_integer               | Total number of reviews                  |
| `qf`      | avg_rating   | number_decimal               | Average customer rating                  |
| `qf`      | usp_pills    | list.single_line_text_field | Unique selling proposition pill strings  |

You can also trigger the **Setup Metaobjects** workflow manually from the
GitHub Actions tab. It runs the same script in CI with the appropriate
secrets.

### Pull request previews

When you open a pull request against `staging` the CI workflow defined in
`.github/workflows/ci-staging.yml` performs the following steps:

1. **Secret validation** – If any of the required Shopify secrets
   (`SHOPIFY_STORE`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`) are
   missing the workflow posts a comment to your pull request with a
   checklist and aborts.
2. **Theme creation** – The workflow creates an unpublished theme named
   `pr-<number>` via the Shopify Admin API.
3. **Asset upload** – All files in the repository are uploaded to the
   unpublished theme. The preview URL has the form
   `https://<store>.myshopify.com/?preview_theme_id=<theme-id>`.
4. **Visual tests** – Playwright runs visual regression tests against the
   preview URL. Failures will fail the build.
5. **Preview comment** – On success the workflow comments on the pull
   request with a link to the preview. You can iterate on your branch
   until the tests pass.

Closing a pull request (regardless of merge status) triggers
`pr-close.yml` which deletes the corresponding `pr-<number>` theme from
Shopify to avoid orphaned preview themes.

### Updating Playwright snapshots

If your changes intentionally modify the visual appearance of the site you
should update the Playwright baselines. Run the tests locally with
`npx playwright test --update-snapshots` and commit the updated snapshots.
Pull request previews will then use the new baselines when comparing
screenshots.

### Staging deployments

Pushing to the `staging` branch triggers the deployment workflow in
`deploy-staging.yml`. This workflow uploads the entire repository to the
staging theme ID supplied via `SHOPIFY_STAGING_THEME_ID`. No new theme is
created; the existing staging theme is updated in place. Live themes are
intentionally never modified from CI.

### Live deployments

There is no GitHub Actions workflow that deploys to the live theme. To
promote a staging theme to live you must use the Shopify Admin UI. This
design prevents accidental overwrites of the production storefront.