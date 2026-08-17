import Head from 'expo-router/head';
import React from 'react';
import { Platform } from 'react-native';
import {
  DEFAULT_OG_IMAGE,
  ORGANIZATION_ID,
  SITE_LOCALE,
  SITE_NAME,
  WEBSITE_ID,
  absUrl,
  breadcrumbSchema,
} from '@/constants/seo';

type SeoProps = {
  /** Page title without the brand suffix — the suffix is added automatically. */
  title: string;
  description: string;
  /** Route path, e.g. "/service/2". Used for canonical + og:url. */
  path: string;
  /** Social share image (site-relative or absolute). */
  image?: string;
  /** Private/utility pages: keep them out of Google. */
  noindex?: boolean;
  /** Extra schema.org nodes merged into the page's @graph. */
  schema?: Record<string, any> | Record<string, any>[];
  /** Breadcrumb trail after "דף הבית". Omit on the home page. */
  breadcrumb?: { name: string; path: string }[];
  /** og:type — "website" for landing pages, "article" for content pages. */
  ogType?: 'website' | 'article';
};

/**
 * Emits the full head block for a page. Expo Router's static renderer inlines
 * these tags into the prerendered HTML, so crawlers and social scrapers (which
 * do not run JavaScript) see real markup rather than an empty shell.
 */
export function Seo({
  title,
  description,
  path,
  image,
  noindex = false,
  schema,
  breadcrumb,
  ogType = 'website',
}: SeoProps) {
  const url = absUrl(path);
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
  const ogImage = absUrl(image ?? DEFAULT_OG_IMAGE);

  const extra = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  // One @graph per page keeps the nodes cross-referenced by @id instead of
  // repeating the business details in every block.
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: fullTitle,
      description,
      inLanguage: 'he-IL',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': ORGANIZATION_ID },
      primaryImageOfPage: { '@type': 'ImageObject', url: ogImage },
    },
    ...(breadcrumb?.length ? [breadcrumbSchema(breadcrumb)] : []),
    ...extra,
  ];

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex, nofollow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />

      {/* Open Graph — WhatsApp, Facebook, LinkedIn */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={title} />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {Platform.OS === 'web' && (
        <script type="application/ld+json">{jsonLd}</script>
      )}
    </Head>
  );
}
