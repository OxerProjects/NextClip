/**
 * Single source of truth for SEO across the site.
 *
 * ⚠️ SITE_URL must match the live domain exactly — a wrong canonical/og:url
 * tells Google the real page lives somewhere else and can drop it from results.
 */

export const SITE_URL = 'https://nextclipstudio.com';
export const SITE_NAME = 'NextClip';
export const SITE_LOCALE = 'he_IL';

/**
 * Fallback social-share image (keep under ~1MB so WhatsApp/Facebook fetch it fast).
 * 1200×630 landscape — Google and the social scrapers skip portrait images, and a
 * mislabelled file (JPEG bytes served as .png) gets dropped too.
 */
export const DEFAULT_OG_IMAGE = '/og-image.jpg';

export const BUSINESS = {
  name: 'NextClip',
  legalName: 'NextClip',
  phoneDisplay: '050-847-4111',
  phoneE164: '+972508474111',
  whatsapp: 'https://wa.me/972508474111',
  areaServed: 'IL',
  areaServedName: 'ישראל',
  logo: '/logo.png',
} as const;

/** Turns "/logo.png" into "https://domain.com/logo.png"; leaves absolute URLs alone. */
export function absUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

// ─── Site-wide structured data ────────────────────────────────────────────────

/** Referenced by @id from every page so Google merges them into one entity. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    '@type': 'LocalBusiness',
    '@id': ORGANIZATION_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    telephone: BUSINESS.phoneE164,
    image: absUrl(DEFAULT_OG_IMAGE),
    logo: {
      '@type': 'ImageObject',
      url: absUrl(BUSINESS.logo),
    },
    description:
      'NextClip מפעילה עמדות צילום AI, צילום מגנטים וצילום סטילס לחתונות, בר/בת מצווה ואירועי חברה בכל רחבי הארץ.',
    priceRange: '₪₪',
    address: {
      '@type': 'PostalAddress',
      addressCountry: BUSINESS.areaServed,
    },
    areaServed: {
      '@type': 'Country',
      name: BUSINESS.areaServedName,
    },
    sameAs: [BUSINESS.whatsapp],
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'he-IL',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

// ─── Service structured data ──────────────────────────────────────────────────

type ServiceSchemaInput = {
  name: string;
  description: string;
  path: string;
  image: string;
  lowPrice: number;
  highPrice?: number;
};

/**
 * Service + AggregateOffer. Prices are guest-count dependent, so we publish the
 * real low/high range rather than a single number Google could flag as wrong.
 */
export function serviceSchema({
  name,
  description,
  path,
  image,
  lowPrice,
  highPrice,
}: ServiceSchemaInput) {
  return {
    '@type': 'Service',
    '@id': `${absUrl(path)}#service`,
    name,
    description,
    serviceType: name,
    url: absUrl(path),
    image: absUrl(image),
    provider: { '@id': ORGANIZATION_ID },
    areaServed: {
      '@type': 'Country',
      name: BUSINESS.areaServedName,
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'ILS',
      lowPrice,
      ...(highPrice && highPrice !== lowPrice ? { highPrice } : {}),
      availability: 'https://schema.org/InStock',
      url: absUrl(path),
    },
  };
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'דף הבית', path: '/' }, ...trail].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}
