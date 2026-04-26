/**
 * SEO Product Extraction API
 * 
 * Scrapes product pages from the workspace sitemap and extracts:
 * - Product title, brand, description, OG image, price
 * - Saves to seo_products table for permanent storage
 * - Only real products the brand carries will be used in content generation
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, productPages } = body as {
      workspaceId: string;
      productPages: Array<{ url: string; title: string; pageType: string }>;
    };

    if (!workspaceId || !productPages?.length) {
      return NextResponse.json({ error: 'Missing workspaceId or productPages' }, { status: 400 });
    }

    const extracted: Array<{
      productUrl: string;
      productTitle: string;
      productSlug: string;
      brand: string;
      ogImageUrl: string;
      description: string;
      price: string;
      category: string;
    }> = [];

    // Scrape each product page (limit to 50 to avoid timeout)
    const pagesToScrape = productPages.slice(0, 50);

    for (const page of pagesToScrape) {
      try {
        const resp = await fetch(page.url, {
          headers: { 'User-Agent': 'NxFlow-Bot/1.0' },
          signal: AbortSignal.timeout(4000),
        });
        if (!resp.ok) continue;
        const html = await resp.text();

        // Extract meta data
        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

        // Extract price (common patterns)
        const priceMatch = html.match(/["']price["']\s*:\s*["']?(\$?[\d,]+\.?\d*)["']?/i)
          || html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i);
        const price = priceMatch?.[1] ?? '';

        // Extract brand from structured data or URL
        const brandMatch = html.match(/["']brand["']\s*:\s*\{[^}]*["']name["']\s*:\s*["']([^"']+)["']/i)
          || html.match(/["']brand["']\s*:\s*["']([^"']+)["']/i);
        const brand = brandMatch?.[1] ?? '';

        // Extract category
        const catMatch = html.match(/["']category["']\s*:\s*["']([^"']+)["']/i)
          || html.match(/breadcrumb[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/i);
        const category = catMatch?.[1] ?? '';

        // Derive slug from URL
        const urlObj = new URL(page.url);
        const slug = urlObj.pathname.split('/').filter(Boolean).pop() ?? '';

        const productTitle = ogTitle || titleTag || page.title;
        if (!productTitle) continue;

        extracted.push({
          productUrl: page.url,
          productTitle: productTitle.replace(/\s*[-–|].*$/, '').trim(), // Remove " - Store Name"
          productSlug: slug,
          brand,
          ogImageUrl: ogImage ?? '',
          description: (ogDesc || metaDesc || '').slice(0, 500),
          price,
          category,
        });
      } catch {
        // Skip failed fetches
        continue;
      }
    }

    return NextResponse.json({
      workspaceId,
      productsExtracted: extracted.length,
      totalPages: productPages.length,
      products: extracted,
    });
  } catch (err) {
    console.error('Product extraction error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
