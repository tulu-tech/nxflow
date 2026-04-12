import type { Metadata } from 'next';
import './seo.css';
import { SEONavbar } from '@/components/seo/SEONavbar';

export const metadata: Metadata = {
  title: 'SEO Content Generator — NXFlow',
  description: 'AI-powered SEO content workflow platform for high-ranking, publish-ready content',
};

export default function SEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="seo-page">
      <SEONavbar />
      <main className="seo-main">{children}</main>
    </div>
  );
}
