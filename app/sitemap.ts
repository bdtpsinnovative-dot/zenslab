import { MetadataRoute } from 'next'
import { getCachedSitemapProducts } from '@/lib/zenslab-cache'

export const revalidate = 31536000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.zen-slab.com'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/woodslab`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/franchisee`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  try {
    const products = await getCachedSitemapProducts()

    const productRoutes: MetadataRoute.Sitemap = (products || []).map((p: any) => ({
      url: `${baseUrl}/woodslab/product?id=${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticRoutes, ...productRoutes]
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error)
    return staticRoutes
  }
}
