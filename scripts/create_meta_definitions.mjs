import fetch from 'cross-fetch';

/*
 * Shopify Admin GraphQL metaobject and metafield setup.
 *
 * This script creates a handful of metaobject definitions and product metafield
 * definitions used by the QFlex theme. It is designed to be idempotent: if a
 * definition already exists the request will simply return a user error and
 * the script will move on without interrupting the remaining setup. At the
 * end of execution the process will exit with a non‑zero status if any
 * unrecoverable errors occurred.
 *
 * Required environment variables:
 *   SHOPIFY_STORE              – your *.myshopify.com subdomain (e.g. getqflex)
 *   SHOPIFY_ADMIN_ACCESS_TOKEN – an Admin API access token
 *   SHOPIFY_API_VERSION        – the API version to target (e.g. 2024-07)
 */

const {
  SHOPIFY_STORE,
  SHOPIFY_ADMIN_ACCESS_TOKEN,
  SHOPIFY_API_VERSION,
} = process.env;

function assertEnv() {
  const missing = [];
  if (!SHOPIFY_STORE) missing.push('SHOPIFY_STORE');
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) missing.push('SHOPIFY_ADMIN_ACCESS_TOKEN');
  if (!SHOPIFY_API_VERSION) missing.push('SHOPIFY_API_VERSION');
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(
    `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  return body;
}

async function createMetaobject(definition) {
  const mutation = `
    mutation MetaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const { data, errors } = await shopifyGraphQL(mutation, { definition });
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }
  const result = data.metaobjectDefinitionCreate;
  if (result.userErrors && result.userErrors.length) {
    // silently ignore already‑exists errors, otherwise log
    const nonDupeErrors = result.userErrors.filter(
      (err) => !/type.*already exists/i.test(err.message)
    );
    if (nonDupeErrors.length) {
      console.error(
        `Metaobject ${definition.type} creation errors:`,
        JSON.stringify(nonDupeErrors, null, 2)
      );
      throw new Error('Metaobject creation failed');
    }
  }
}

async function createMetafield(definition) {
  const mutation = `
    mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const { data, errors } = await shopifyGraphQL(mutation, { definition });
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }
  const result = data.metafieldDefinitionCreate;
  if (result.userErrors && result.userErrors.length) {
    const nonDupeErrors = result.userErrors.filter(
      (err) => !/definition.*already exists/i.test(err.message)
    );
    if (nonDupeErrors.length) {
      console.error(
        `Metafield ${definition.key} creation errors:`,
        JSON.stringify(nonDupeErrors, null, 2)
      );
      throw new Error('Metafield creation failed');
    }
  }
}

async function main() {
  assertEnv();
  // Define metaobjects
  const metaobjects = [
    {
      name: 'Badge',
      type: 'badge',
      fieldDefinitions: [
        {
          key: 'label',
          name: 'Label',
          description: 'Short text for the badge label',
          type: 'single_line_text_field',
          required: true,
        },
        {
          key: 'icon',
          name: 'Icon',
          description: 'Icon file for the badge',
          type: 'file_reference',
          required: true,
        },
        {
          key: 'color',
          name: 'Color',
          description: 'Optional color name for the badge',
          type: 'single_line_text_field',
          required: false,
        },
      ],
    },
    {
      name: 'Testimonial',
      type: 'testimonial',
      fieldDefinitions: [
        {
          key: 'name',
          name: 'Name',
          type: 'single_line_text_field',
          description: 'Name of the person giving the testimonial',
          required: true,
        },
        {
          key: 'quote',
          name: 'Quote',
          type: 'multi_line_text_field',
          description: 'The testimonial text',
          required: true,
        },
        {
          key: 'pain_area',
          name: 'Pain Area',
          type: 'single_line_text_field',
          description: 'The customer pain area addressed',
          required: true,
        },
      ],
    },
    {
      name: 'Press logo',
      type: 'press_logo',
      fieldDefinitions: [
        {
          key: 'image',
          name: 'Image',
          type: 'file_reference',
          description: 'Logo image',
          required: true,
        },
        {
          key: 'url',
          name: 'URL',
          type: 'url',
          description: 'Link to the press article',
          required: true,
        },
      ],
    },
  ];
  for (const def of metaobjects) {
    await createMetaobject(def);
  }
  // Define product metafields in namespace qf
  const metafields = [
    {
      name: 'Hero eyebrow',
      namespace: 'qf',
      key: 'hero_eyebrow',
      type: 'single_line_text_field',
      description: 'Eyebrow text displayed above product title',
      ownerType: 'PRODUCT',
    },
    {
      name: 'Review count',
      namespace: 'qf',
      key: 'review_count',
      type: 'number_integer',
      description: 'Total number of reviews',
      ownerType: 'PRODUCT',
    },
    {
      name: 'Average rating',
      namespace: 'qf',
      key: 'avg_rating',
      type: 'number_decimal',
      description: 'Average customer rating',
      ownerType: 'PRODUCT',
    },
    {
      name: 'USP pills',
      namespace: 'qf',
      key: 'usp_pills',
      type: 'list.single_line_text_field',
      description: 'Unique selling proposition pills',
      ownerType: 'PRODUCT',
    },
  ];
  for (const def of metafields) {
    await createMetafield(def);
  }
  console.log('Metaobject and metafield definitions ensured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});