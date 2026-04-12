import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NX CRM — Lead Management | NXFlow',
  description: 'Manage leads and track sales pipeline',
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
