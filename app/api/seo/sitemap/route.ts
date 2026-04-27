import { NextRequest, NextResponse } from 'next/server';

// ─── Page Classification ─────────────────────────────────────────────────────

function classifyPage(path: string, url: string): string {
  const p = path.toLowerCase();
  if (p === '/' || p === '') return 'homepage';
  if (/\/(products?|p)\//i.test(p)) return 'product';
  if (/\/(collections?|categories?|c)\//i.test(p)) return 'collection';
  if (/\/(blog|articles?|posts?|news)\b/i.test(p)) return 'blog';
  if (/\/(guide|how-to|learn|resources?)\b/i.test(p)) return 'guide';
  if (/\/(locations?|stores?|showrooms?|near-me|local)\b/i.test(p)) return 'local';
  if (/\/(brands?|manufacturers?)\//i.test(p)) return 'brand';
  if (/\/(privacy|terms|policy|legal|disclaimer|refund|shipping|return)\b/i.test(p)) return 'policy';
  if (/\/(contact|about|faq|support|help)\b/i.test(p)) return 'contact';
  return 'other';
}

function extractSlug(path: string): string {
  const parts = path.replace(/\/$/, '').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

// Known MCM brands for detection
const BRAND_PATTERNS = [
  { pattern: /ohco|m\.?8|neo/i, brand: 'OHCO' },
  { pattern: /panasonic|man1|maf1|mak1/i, brand: 'Panasonic' },
  { pattern: /positive.?posture|dualtech|brio\+?|solara/i, brand: 'Positive Posture' },
  { pattern: /d\.?core|cirrus|stratus/i, brand: 'D.Core' },
  { pattern: /koyo|303ts/i, brand: 'KOYO' },
  { pattern: /osaki/i, brand: 'Osaki' },
  { pattern: /titan/i, brand: 'Titan' },
  { pattern: /luraco/i, brand: 'Luraco' },
  { pattern: /infinity/i, brand: 'Infinity' },
  { pattern: /daiwa/i, brand: 'Daiwa' },
];

function detectBrand(path: string): string | null {
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(path)) return brand;
  }
  return null;
}

// ─── Sitemap XML Parser (simple, no external deps) ───────────────────────────

interface SitemapEntry {
  loc: string;
  lastmod: string | null;
  priority: number | null;
}

function parseSitemapXML(xml: string): { urls: SitemapEntry[]; sitemapIndexUrls: string[] } {
  const urls: SitemapEntry[] = [];
  const sitemapIndexUrls: string[] = [];

  // Check if this is a sitemap index
  const sitemapMatches = xml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/gi);
  for (const m of sitemapMatches) {
    const locMatch = m[0].match(/<loc>\s*([^<]+)\s*<\/loc>/i);
    if (locMatch) sitemapIndexUrls.push(locMatch[1].trim());
  }

  // Parse URL entries
  const urlMatches = xml.matchAll(/<url>[\s\S]*?<\/url>/gi);
  for (const m of urlMatches) {
    const locMatch = m[0].match(/<loc>\s*([^<]+)\s*<\/loc>/i);
    if (!locMatch) continue;
    const lastmodMatch = m[0].match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/i);
    const priorityMatch = m[0].match(/<priority>\s*([^<]+)\s*<\/priority>/i);
    urls.push({
      loc: locMatch[1].trim(),
      lastmod: lastmodMatch ? lastmodMatch[1].trim() : null,
      priority: priorityMatch ? parseFloat(priorityMatch[1].trim()) : null,
    });
  }

  return { urls, sitemapIndexUrls };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { sitemapUrl, workspaceId } = await req.json();

    if (!sitemapUrl || !workspaceId) {
      return NextResponse.json({ error: 'Missing sitemapUrl or workspaceId' }, { status: 400 });
    }

    // Fetch sitemap
    let allEntries: SitemapEntry[] = [];
    const fetchErrors: string[] = [];

    async function fetchSitemap(url: string) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NxFlow-SEO-Bot/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          fetchErrors.push(`HTTP ${res.status} for ${url}`);
          return;
        }
        const xml = await res.text();
        const { urls, sitemapIndexUrls } = parseSitemapXML(xml);
        allEntries.push(...urls);

        // If sitemap index, fetch child sitemaps (1 level deep)
        for (const childUrl of sitemapIndexUrls) {
          try {
            const childRes = await fetch(childUrl, {
              headers: { 'User-Agent': 'NxFlow-SEO-Bot/1.0' },
              signal: AbortSignal.timeout(15000),
            });
            if (childRes.ok) {
              const childXml = await childRes.text();
              const childResult = parseSitemapXML(childXml);
              allEntries.push(...childResult.urls);
            }
          } catch {
            fetchErrors.push(`Failed to fetch child sitemap: ${childUrl}`);
          }
        }
      } catch (err) {
        fetchErrors.push(`Failed to fetch ${url}: ${(err as Error).message}`);
      }
    }

    await fetchSitemap(sitemapUrl);

    // Deduplicate by normalized URL
    const seen = new Set<string>();
    const uniqueEntries = allEntries.filter((e) => {
      const norm = normalizeUrl(e.loc);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    // Convert to DiscoveredPage objects
    const pages = uniqueEntries.map((entry, idx) => {
      const path = extractPath(entry.loc);
      const slug = extractSlug(path);
      const pageType = classifyPage(path, entry.loc);
      const brand = detectBrand(path + '/' + slug);

      return {
        pageId: `sp-${workspaceId}-${idx}`,
        workspaceId,
        url: entry.loc,
        normalizedUrl: normalizeUrl(entry.loc),
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Home',
        slug,
        path,
        pageType,
        detectedBrand: brand,
        detectedProduct: pageType === 'product' ? slug.replace(/-/g, ' ') : null,
        detectedTopic: null,
        lastmod: entry.lastmod,
        priority: entry.priority,
        source: 'sitemap' as const,
        status: 'active' as const,
      };
    });

    return NextResponse.json({
      success: true,
      sitemapUrl,
      pageCount: pages.length,
      pages,
      errors: fetchErrors.length > 0 ? fetchErrors : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Sitemap Fetch Error]', err);
    return NextResponse.json({ error: 'Failed to fetch sitemap' }, { status: 500 });
  }
}
