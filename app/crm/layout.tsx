import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GM CRM — Lead Management | NXFlow',
  description: 'Manage leads and track sales pipeline for GM Defensive',
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
