const SITE = 'https://citydenapartments.com';
const DEFAULT_DESC = 'Luxury serviced apartments in Abuja, Kaduna & Maiduguri. Premium accommodation with world-class amenities for business and leisure travelers across Nigeria.';
const DEFAULT_OG = 'https://pub-644677a999f742b39f8a60416322206c.r2.dev/abj/hero.jpeg';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
}

export const SEOHead = ({
  title: pageTitle,
  description = DEFAULT_DESC,
  ogImage = DEFAULT_OG,
  canonical,
}: SEOHeadProps) => {
  const title = pageTitle
    ? `${pageTitle} | City Den Apartments`
    : 'City Den Apartments | Luxury Apartments in Nigeria';

  const url = canonical ? `${SITE}${canonical}` : SITE;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="City Den Apartments" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {canonical && <link rel="canonical" href={url} />}
    </>
  );
};
