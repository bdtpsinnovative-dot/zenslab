import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.zen-slab.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/profile', '/my-orders', '/cart', '/favorites', '/login', '/register'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
